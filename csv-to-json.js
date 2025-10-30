#!/usr/bin/env node
/**
 * csv-to-json.js (dependency-free, file or directory) — with smart array splitting.
 *
 * Key behavior:
 * - Detect & decode UTF-8 (BOM/none), UTF-16LE/BE; strip BOM.
 * - Proper CSV parsing (quotes/escaped quotes), no deps.
 * - Auto-detect delimiter from header line unless --delimiter is set.
 * - ALWAYS include all headers; missing/blank cells => "" (or [] if array field).
 * - Default pretty=2; use --pretty=0 to minify.
 * - Plain text columns unless --infer-types.
 * - File or recursive directory mode.
 * - Smart array splitting: commas are dividers EXCEPT the comma in the pattern "City, ST"
 *   where ST is exactly two uppercase letters. Examples:
 *     "Home 2 Suites - Springfield, OH, Home 2 Suites - ..." → splits only on comma after "OH"
 *     "_Montreal, QB, H3Z..." → first comma is not a divider (City, ST), next comma is divider.
 * - Default array fields: Quote Line Items, Openings, Hardware Set, Components, Openings 2, Openings 3, Items, Item Ids, Quote Line Item Ids
 *   (Override via --array-fields "col1,col2,...")
 */

//    node csv-to-json.js airtable/csv


import fs from 'fs';
import path from 'path';
import os from 'os';

// ----------------------------- CLI parsing ----------------------------------

const argv = process.argv.slice(2);
function hasFlag(name, alias) {
  return argv.includes(`--${name}`) || (alias && argv.includes(`-${alias}`));
}
function getOpt(name, alias, def = undefined) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === `--${name}` || (alias && a === `-${alias}`)) {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) return next;
      return def;
    }
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
  }
  return def;
}
function firstPositional() {
  const withValues = new Set([
    '--input','-i','--output','-o','--delimiter','--pretty','--array-fields','--array-sep','--limit'
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (withValues.has(a)) i++;
      continue;
    }
    return a;
  }
}

// ------------------------------ Help ----------------------------------------

function printHelp() {
  const help = `
CSV → JSON converter (dependency-free; file or directory)

File mode:
  -i, --input <path>          Input CSV file path

Directory mode (recursive):
  csv-to-json.js <dir>        Convert all *.csv under <dir>, preserving structure

Options:
  -o, --output <path>         File in file mode; output root dir in dir mode.
                              Dir mode default: "<inputDir>-json"
      --ndjson                Output newline-delimited JSON (one object per line)
      --delimiter <char>      CSV delimiter (default: auto detect ',', ';', '\\t', '|')
      --pretty [n]            Pretty-print JSON (default 2). Use 0 for minified.
      --infer-types           Optional: numbers/bools/null (default off → plain text)
      --array-fields <list>   Columns to split into arrays (comma-separated)
      --array-sep <char>      Ignored (we use smart comma rules); present for compatibility
      --limit <n>             Process at most n rows per file (testing)
  -h, --help                  Show help

Notes:
  • Every JSON row includes ALL headers from the CSV. Missing values become "" (or [] for array fields).
  • Default array fields: Quote Line Items, Openings, Hardware Set, Components, Openings 2, Openings 3, Items, Item Ids, Quote Line Item Ids.
`;
  console.log(help.trim() + '\\n');
}

if (hasFlag('help', 'h') || argv.length === 0) {
  printHelp();
  process.exit(0);
}

// Input can be provided via -i/--input OR as the first positional argument (convenient for dir mode)
let inputPath = getOpt('input','i') || firstPositional();
if (!inputPath) {
  console.error('Error: Provide an input CSV with --input <path> OR pass a directory as a positional argument.');
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error('Error: Input path not found:', inputPath);
  process.exit(1);
}

const explicitDelimiter = getOpt('delimiter', null, null);
const ndjson = hasFlag('ndjson');

let pretty = 2;
if (hasFlag('pretty')) {
  const p = getOpt('pretty');
  if (typeof p !== 'undefined') {
    const n = Number(p);
    if (!Number.isNaN(n)) pretty = n;
  }
}

const inferTypes = hasFlag('infer-types');
const limit = Number(getOpt('limit')) || undefined;

let arrayFieldsRaw = getOpt('array-fields', null, '');
if (!arrayFieldsRaw) {
  arrayFieldsRaw = 'Quote Line Items,Openings,Hardware Set,Components,Openings 2,Openings 3,Items,Item Ids,Quote Line Item Ids';
}
const arrayFields = new Set(
  arrayFieldsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase())
);

// ------------------------- Encoding helpers ---------------------------------

function stripBOMChar(s) {
  if (!s) return s;
  if (s.charCodeAt(0) === 0xFEFF) return s.slice(1);
  return s;
}
function decodeBufferSmart(buf) {
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.toString('utf8').slice(1);
  }
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.subarray(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const le = Buffer.alloc(buf.length - 2);
    for (let i = 2, j = 0; i + 1 < buf.length; i += 2, j += 2) {
      le[j] = buf[i + 1];
      le[j + 1] = buf[i];
    }
    return le.toString('utf16le');
  }
  return buf.toString('utf8');
}

// ------------------------- CSV helpers --------------------------------------

function detectDelimiterFromLine(line) {
  if (explicitDelimiter) return explicitDelimiter;
  const candidates = [',',';','\t','|'];
  let best = candidates[0], bestCount = -1;
  for (const c of candidates) {
    const n = [...line].reduce((acc, ch) => acc + (ch === c ? 1 : 0), 0);
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return bestCount > 0 ? best : ',';
}

function splitLines(str) {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

// Robust CSV row parser (handles quotes and escaped quotes)
function parseRow(line, delimiter) {
  const out = [];
  let field = '';
  let i = 0;
  const len = line.length;
  let inQuotes = false;

  while (i < len) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && line[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === delimiter) {
        out.push(field);
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }
  }
  out.push(field);
  return out;
}

// Smart array splitting: commas are dividers unless the comma is part of "City, ST" where ST is exactly two uppercase letters.
function isTwoLetterStateLikeSegment(s, pos) {
  const i = pos;
  if (i < 0 || i >= s.length || s[i] !== ',') return false;
  const after = s.slice(i + 1);
  if (after.length < 3) return false;
  if (after[0] !== ' ') return false;
  const a = after.charCodeAt(1), b = after.charCodeAt(2);
  const isUpper = (c) => c >= 65 && c <= 90;
  if (!isUpper(a) || !isUpper(b)) return false;
  if (after.length >= 4) {
    const c = after.charCodeAt(3);
    const isAlphaNum = (ch) => (ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122);
    if (isAlphaNum(c)) return false;
  }
  return true;
}

function unwrapQuotes(s) {
  if (s == null) return '';
  let v = String(s).trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') v = v.slice(1, -1);
  if (v.length >= 2 && v[0] === '“' && v[v.length - 1] === '”') v = v.slice(1, -1);
  while (v.startsWith('""')) v = v.slice(1);
  while (v.endsWith('""')) v = v.slice(0, -1);
  return v.trim();
}

function splitArraySmart(val) {
  const s = String(val);
  if (s.trim() === '') return [];
  const out = [];
  let buf = '';
  let i = 0;
  const len = s.length;
  let inQuotes = false;

  while (i < len) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && s[i + 1] === '"') {
          buf += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        buf += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        if (!isTwoLetterStateLikeSegment(s, i)) {
          out.push(buf.trim());
          buf = '';
          i++;
          if (i < len && s[i] === ' ') i++;
          continue;
        } else {
          buf += ch;
          i++;
          continue;
        }
      }
      buf += ch;
      i++;
    }
  }
  out.push(buf.trim());
  const cleaned = out.map(t => unwrapQuotes(t)).filter(v => v !== '');
  return cleaned;
}

function coerceValue(key, value) {
  if (value == null) return '';
  const base = unwrapQuotes(value);
  if (base === '') return arrayFields.has(key.toLowerCase()) ? [] : '';
  if (arrayFields.has(key.toLowerCase())) {
    const arr = splitArraySmart(base);
    return arr;
  }
  if (!inferTypes) return base;
  if (/^-?\d+$/.test(base)) {
    const asInt = parseInt(base, 10);
    if (Number.isSafeInteger(asInt)) return asInt;
  }
  if (/^-?\d*\.\d+$/.test(base)) {
    const asFloat = parseFloat(base);
    if (!Number.isNaN(asFloat)) return asFloat;
  }
  if (/^(true|false)$/i.test(base)) return /^true$/i.test(base);
  if (/^null$/i.test(base)) return null;
  return base;
}

function convertCSVStringToJSON(str) {
  const decoded = decodeBufferSmart(Buffer.from(str, 'utf8'));
  const norm = stripBOMChar(decoded);
  const lines = splitLines(norm);
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') { headerLineIdx = i; break; }
  }
  if (headerLineIdx === -1) return { headers: [], rows: [], delimiter: ',' };

  const headerLine = stripBOMChar(lines[headerLineIdx]);
  const delim = detectDelimiterFromLine(headerLine);
  let headers = parseRow(headerLine, delim).map(h => stripBOMChar(h).trim());

  const seen = new Map();
  headers = headers.map((h, idx) => {
    const key = h || `Column ${idx + 1}`;
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key} (${count + 1})`;
  });

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === '') continue;
    const line = stripBOMChar(raw);
    const cols = parseRow(line, delim);
    const allBlank = cols.every(c => c === '');
    if (allBlank) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const val = c < cols.length ? cols[c] : '';
      obj[key] = coerceValue(key, val);
    }
    rows.push(obj);
    if (limit && rows.length >= limit) break;
  }
  return { headers, rows, delimiter: delim };
}

// ------------------------------ Directory utils -----------------------------

async function* walkDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkDir(full);
    } else {
      yield full;
    }
  }
}
function isCSV(p) { return path.extname(p).toLowerCase() === '.csv'; }
async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

// ------------------------------- Runners ------------------------------------

function readTextSmart(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.toString('utf8').slice(1);
  }
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.subarray(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const le = Buffer.alloc(buf.length - 2);
    for (let i = 2, j = 0; i + 1 < buf.length; i += 2, j += 2) {
      le[j] = buf[i + 1];
      le[j + 1] = buf[i];
    }
    return le.toString('utf16le');
  }
  return buf.toString('utf8');
}

async function handleFile(inputFilePath, outPath) {
  const content = readTextSmart(inputFilePath);
  const { headers, rows, delimiter } = convertCSVStringToJSON(content);

  const toStdout = ndjson || !outPath;
  let outStream = toStdout ? process.stdout : fs.createWriteStream(outPath, { encoding: 'utf8' });

  if (ndjson) {
    for (const r of rows) {
      for (const h of headers) {
        if (!Object.prototype.hasOwnProperty.call(r, h) || r[h] == null || r[h] === '') {
          r[h] = arrayFields.has(h.toLowerCase()) ? [] : '';
        }
      }
      outStream.write(JSON.stringify(r));
      outStream.write(os.EOL);
    }
  } else {
    const result = rows.map(r => {
      const full = {};
      for (const h of headers) {
        let v = r[h];
        if (arrayFields.has(h.toLowerCase())) {
          if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) v = [];
        } else {
          if (v === null || typeof v === 'undefined') v = '';
        }
        full[h] = v;
      }
      return full;
    });
    const json = JSON.stringify(result, null, pretty);
    outStream.write(json + (pretty > 0 ? os.EOL : ''));
  }

  if (!toStdout) outStream.end();
  console.error(`✔ ${path.basename(inputFilePath)} → ${outPath || '(stdout)'}  (${rows.length} row(s), ${headers.length} col(s), delim="${delimiter}")`);
}

async function handleDirectory(dirInputPath, dirOutputRoot) {
  let count = 0;
  for await (const f of walkDir(dirInputPath)) {
    if (!isCSV(f)) continue;
    const rel = path.relative(dirInputPath, f);
    const outDir = path.join(dirOutputRoot, path.dirname(rel));
    await ensureDir(outDir);
    const base = path.basename(rel, path.extname(rel));
    const outFile = path.join(outDir, base + (ndjson ? '.ndjson' : '.json'));
    try {
      await handleFile(f, outFile);
      count++;
    } catch (err) {
      console.error(`✖ Failed to convert ${rel}: ${err && err.message ? err.message : err}`);
    }
  }
  console.error(`Done. Converted ${count} file(s). Output root: ${dirOutputRoot}`);
}

// --------------------------------- Main -------------------------------------

(async () => {
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    const dirInputPath = path.resolve(inputPath);
    const dirOutputRoot = getOpt('output','o', null)
      ? path.resolve(getOpt('output','o', null))
      : path.resolve(path.dirname(dirInputPath), path.basename(dirInputPath) + '-json');
    await ensureDir(dirOutputRoot);
    await handleDirectory(dirInputPath, dirOutputRoot);
  } else if (stat.isFile()) {
    let outputPath = getOpt('output','o', null);
    if (!outputPath && !ndjson) {
      const ext = path.extname(inputPath);
      outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, ext) + '.json');
    }
    await handleFile(path.resolve(inputPath), ndjson ? null : path.resolve(outputPath));
  } else {
    throw new Error('Input path must be a file or directory.');
  }
})().catch(err => {
  console.error('Conversion failed:', err && err.message ? err.message : err);
  process.exit(1);
});
