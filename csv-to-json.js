#!/usr/bin/env node
/**
 * csv-to-json.js — CSV → JSON (files or directories)
 *
 * Updates in this build:
 * - **Empty cells ALWAYS emit []** (no empty strings), for every header.
 * - All headers included for every row.
 * - Encoding: UTF-8 (BOM/none), UTF-16 LE/BE; strips BOM
 * - CSV parsing with quotes/escaped quotes
 * - Default pretty=2; use --pretty=0 to minify
 * - Arrays: CSV-aware splitting + City/State comma rule (', ' + two uppercase letters)
 * - Plain text unless --infer-types
 * - Directory mode (recursive) supported
 */

//                  node csv-to-json.js airtable/csv

import fs from 'fs';
import path from 'path';
import os from 'os';

/* ------------------------- CLI ------------------------- */
const argv = process.argv.slice(2);
const hasFlag = (name, alias) => argv.includes(`--${name}`) || (alias && argv.includes(`-${alias}`));
const getOpt = (name, alias, def = undefined) => {
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
};
const firstPositional = () => {
  const withValues = new Set(['--input','-i','--output','-o','--delimiter','--pretty','--array-fields','--limit']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) { if (withValues.has(a)) i++; continue; }
    return a;
  }
};

if (hasFlag('help','h') || argv.length === 0) {
  console.log(`
CSV → JSON (file or directory)
* Empty cells emit [] (never "").

File:
  node csv-to-json.js -i input.csv

Directory (recursive):
  node csv-to-json.js path/to/csvs
  node csv-to-json.js path/to/csvs -o out-json

Options:
  -i, --input <path>      CSV file
  -o, --output <path>     Output (file in file mode, or root dir in dir mode)
      --ndjson            Emit newline-delimited JSON
      --delimiter <c>     Override delimiter (auto otherwise)
      --pretty [n]        Pretty JSON (default 2). Use 0 to minify
      --infer-types       Numbers/bools/null (default off → plain text)
      --array-fields <list>  Comma list of array columns (case-insensitive)
      --limit <n>         Process at most n rows (debug)
`.trim());
  process.exit(0);
}

/* -------------------- Options -------------------------- */
let inputPath = getOpt('input','i') || firstPositional();
if (!inputPath) { console.error('Error: provide --input <file> or a directory.'); process.exit(1); }
if (!fs.existsSync(inputPath)) { console.error('Error: path not found:', inputPath); process.exit(1); }

const explicitDelimiter = getOpt('delimiter', null, null);
const ndjson = hasFlag('ndjson');
let pretty = 2;
if (hasFlag('pretty')) {
  const p = getOpt('pretty');
  if (typeof p !== 'undefined') { const n = Number(p); if (!Number.isNaN(n)) pretty = n; }
}
const inferTypes = hasFlag('infer-types');
const limit = Number(getOpt('limit')) || undefined;

let arrayFieldsRaw = getOpt('array-fields', null, '');
if (!arrayFieldsRaw) {
  arrayFieldsRaw = [
    'Quote Line Items','Quote Line Items 2',
    'Openings','Openings 2','Openings 3','Openings 4',
    'Hardware','Hardware 2',
    'Hardware Set','Hardware Sets',
    'Hardware Set Items','Hardware Set Item',
    'Components','Items','Item Ids','Quote Line Item Ids',
    'Projects'
  ].join(',');
}
const arrayFields = new Set(arrayFieldsRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

/* ------------------ Encoding helpers ------------------- */
const stripBOMChar = s => (s && s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s);
const decodeBufferSmart = buf => {
  if (buf.length >= 3 && buf[0]===0xEF && buf[1]===0xBB && buf[2]===0xBF) return buf.toString('utf8').slice(1);
  if (buf.length >= 2 && buf[0]===0xFF && buf[1]===0xFE) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 2 && buf[0]===0xFE && buf[1]===0xFF) {
    const le = Buffer.alloc(buf.length - 2);
    for (let i=2,j=0; i+1<buf.length; i+=2,j+=2) { le[j] = buf[i+1]; le[j+1] = buf[i]; }
    return le.toString('utf16le');
  }
  return buf.toString('utf8');
};

/* -------------------- CSV helpers ---------------------- */
const detectDelimiterFromLine = line => {
  if (explicitDelimiter) return explicitDelimiter;
  const cand = [',',';','\t','|'];
  let best = ',', score = -1;
  for (const c of cand) {
    const n = [...line].reduce((acc,ch)=>acc+(ch===c?1:0),0);
    if (n > score) { score = n; best = c; }
  }
  return score > 0 ? best : ',';
};
const splitLines = s => s.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');

function parseRow(line, delimiter) {
  const out = [];
  let field = '';
  let i = 0, inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i+1 < line.length && line[i+1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === delimiter) { out.push(field); field = ''; i++; continue; }
      field += ch; i++;
    }
  }
  out.push(field);
  return out;
}

/* ---------- Array tokenization helpers (smart) --------- */
function isCityStateComma(s, pos) {
  if (pos < 0 || pos >= s.length || s[pos] !== ',') return false;
  const after = s.slice(pos + 1);
  if (after.length < 3 || after[0] !== ' ') return false;
  const a = after.charCodeAt(1), b = after.charCodeAt(2);
  const isUpper = c => c >= 65 && c <= 90;
  if (!isUpper(a) || !isUpper(b)) return false;
  return true;
}

function unwrapQuotesOnce(s) {
  if (s == null) return '';
  let v = String(s).trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') v = v.slice(1, -1);
  else if (v.length >= 2 && v[0] === '“' && v[v.length - 1] === '”') v = v.slice(1, -1);
  v = v.replace(/\\"/g, '"').replace(/""/g, '"');
  v = v.replace(/_$/, '');
  return v.trim();
}

function splitArraySmart(val) {
  const s = String(val).trim();
  if (s === '') return [];
  const looksQuotedList = /(^"|, ")/.test(s) && s.includes('"');
  if (looksQuotedList) {
    return parseRow(s, ',').map(t => unwrapQuotesOnce(t)).filter(t => t !== '');
  }
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ',') {
      if (isCityStateComma(s, i)) { buf += ch; }
      else {
        out.push(buf.trim());
        buf = '';
        if (i + 1 < s.length && s[i + 1] === ' ') i++;
      }
    } else {
      buf += ch;
    }
  }
  out.push(buf.trim());
  return out.map(unwrapQuotesOnce).filter(t => t !== '');
}

/* -------------------- Value coercion ------------------- */
function coerceValue(key, raw) {
  const k = key.toLowerCase();
  if (raw == null) return [];                           // EMPTY → []
  const base = unwrapQuotesOnce(raw);
  if (base === '') return [];                           // EMPTY → []
  if (arrayFields.has(k)) return splitArraySmart(base); // arrays
  if (!inferTypes) return base;                         // scalars: plain text
  if (/^-?\d+$/.test(base)) { const n = parseInt(base, 10); if (Number.isSafeInteger(n)) return n; }
  if (/^-?\d*\.\d+$/.test(base)) { const f = parseFloat(base); if (!Number.isNaN(f)) return f; }
  if (/^(true|false)$/i.test(base)) return /^true$/i.test(base);
  if (/^null$/i.test(base)) return null;
  return base;
}

/* -------------------- Conversion ----------------------- */
function convertCSVStringToJSON(str) {
  const norm = stripBOMChar(str);
  const lines = splitLines(norm);
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) { if (lines[i].trim() !== '') { headerLineIdx = i; break; } }
  if (headerLineIdx === -1) return { headers: [], rows: [], delimiter: ',' };

  const headerLine = stripBOMChar(lines[headerLineIdx]);
  const delim = detectDelimiterFromLine(headerLine);
  let headers = parseRow(headerLine, delim).map(h => stripBOMChar(h).trim());

  const seen = new Map();
  headers = headers.map((h, idx) => {
    const key = h || `Column ${idx + 1}`;
    const count = seen.get(key) || 0; seen.set(key, count + 1);
    return count === 0 ? key : `${key} (${count + 1})`;
  });

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === '') continue;
    const cols = parseRow(stripBOMChar(raw), delim);
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

/* ---------------- Directory utils & IO ----------------- */
async function* walkDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkDir(full);
    else yield full;
  }
}
const isCSV = p => path.extname(p).toLowerCase() === '.csv';
const ensureDir = p => fs.promises.mkdir(p, { recursive: true });

async function handleFile(inputFilePath, outPath, ndjson) {
  const content = decodeBufferSmart(fs.readFileSync(inputFilePath));
  const { headers, rows, delimiter } = convertCSVStringToJSON(content);

  const toStdout = ndjson || !outPath;
  const outStream = toStdout ? process.stdout : fs.createWriteStream(outPath, { encoding: 'utf8' });

  if (ndjson) {
    for (const r of rows) {
      for (const h of headers) {
        if (!Object.prototype.hasOwnProperty.call(r, h) || r[h] == null) r[h] = [];
        if (r[h] === '') r[h] = []; // force [] for empties
      }
      outStream.write(JSON.stringify(r));
      outStream.write(os.EOL);
    }
  } else {
    const result = rows.map(r => {
      const full = {};
      for (const h of headers) {
        let v = r[h];
        if (v == null || v === '') v = [];   // ALWAYS [] for empties
        full[h] = v;
      }
      return full;
    });
    outStream.write(JSON.stringify(result, null, pretty) + (pretty > 0 ? os.EOL : ''));
  }

  if (!toStdout) outStream.end();
  console.error(`✔ ${path.basename(inputFilePath)} → ${outPath || '(stdout)'}  (${rows.length} rows, ${headers.length} cols, delim="${delimiter}")`);
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
    await handleFile(f, outFile, ndjson).catch(err => {
      console.error(`✖ Failed ${rel}: ${err?.message || err}`);
    });
    count++;
  }
  console.error(`Done. Converted ${count} file(s). Output root: ${dirOutputRoot}`);
}

/* ------------------------- Main ------------------------ */
(async () => {
  const stat = fs.statSync(inputPath);
  const nd = ndjson;
  if (stat.isDirectory()) {
    const dirInputPath = path.resolve(inputPath);
    const outRoot = getOpt('output','o', null)
      ? path.resolve(getOpt('output','o', null))
      : path.resolve(path.dirname(dirInputPath), path.basename(dirInputPath) + '-json');
    await ensureDir(outRoot);
    await handleDirectory(dirInputPath, outRoot);
  } else if (stat.isFile()) {
    let outPath = getOpt('output','o', null);
    if (!outPath && !nd) {
      const ext = path.extname(inputPath);
      outPath = path.join(path.dirname(inputPath), path.basename(inputPath, ext) + '.json');
    }
    await handleFile(path.resolve(inputPath), nd ? null : path.resolve(outPath), nd);
  } else {
    throw new Error('Input path must be a file or directory.');
  }
})().catch(err => {
  console.error('Conversion failed:', err?.message || err);
  process.exit(1);
});
