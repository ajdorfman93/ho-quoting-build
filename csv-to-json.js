#!/usr/bin/env node
/**
 * csv-to-json.js (dependency-free, file or directory)
 *
 * Features / Fixes:
 * - Works on a single CSV file OR recursively on a directory of CSVs.
 * - Robust CSV parsing (quotes/escaped quotes), no external deps.
 * - Strips BOM at file and header level.
 * - Auto-detects delimiter from header line (',', ';', '\t', '|') unless --delimiter is provided.
 * - ALWAYS includes all headers in every JSON object; missing/blank cells => "".
 * - Default pretty-print = 2 spaces (override with --pretty <n>; use 0 to minify).
 * - Treat all columns as plain text unless --infer-types is passed.
 *
 * Usage (file):
 *   node csv-to-json.js -i "input.csv"
 *   node csv-to-json.js -i input.csv -o output.json
 *   node csv-to-json.js -i input.csv --ndjson > output.ndjson
 *
 * Usage (directory, recursive):
 *   node csv-to-json.js path/to/csvs
 *   node csv-to-json.js path/to/csvs -o out-json
 *   node csv-to-json.js airtable/csv --ndjson
 *
 * Node 18+
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// ----------------------------- CLI parsing ----------------------------------

const argv = process.argv.slice(2);
function hasFlag(name, alias) {
  return argv.includes(`--${name}`) || (alias && argv.includes(`-${alias}`));
}
function getOpt(name, alias, def = undefined) {
  // support --name=value as well as --name value
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === `--${name}` || (alias && a === `-${alias}`)) {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) return next;
      return def;
    }
    if (a.startsWith(`--${name}=`)) {
      return a.slice(name.length + 3);
    }
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
      --array-sep <char>      Separator for array-fields (default ';')
      --limit <n>             Process at most n rows per file (testing)
  -h, --help                  Show help

Notes:
  • Every JSON row includes ALL headers from the CSV. Missing values become "".
  • By default, all columns are plain text (no inference) and empty strings are preserved.
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

// Keep plain text by default
const inferTypes = hasFlag('infer-types');
const limit = Number(getOpt('limit')) || undefined;

const arrayFieldsRaw = getOpt('array-fields', null, '');
const arrayFields = new Set(
  arrayFieldsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase())
);
const arraySep = getOpt('array-sep', null, ';');

let outputPath = getOpt('output','o', null);

// ------------------------- CSV helpers --------------------------------------

function stripBOM(s) {
  if (!s) return s;
  if (s.charCodeAt(0) === 0xFEFF) return s.slice(1);
  return s;
}

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

function coerceValue(key, value) {
  if (value == null) return '';
  const trimmed = String(value);
  if (trimmed === '') return '';
  if (arrayFields.size > 0 && arrayFields.has(key.toLowerCase())) {
    return trimmed.split(arraySep).map(s => s.trim());
  }
  if (!inferTypes) return trimmed;
  if (/^-?\d+$/.test(trimmed)) {
    const asInt = parseInt(trimmed, 10);
    if (Number.isSafeInteger(asInt)) return asInt;
  }
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    const asFloat = parseFloat(trimmed);
    if (!Number.isNaN(asFloat)) return asFloat;
  }
  if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
  if (/^null$/i.test(trimmed)) return null;
  return trimmed;
}

function convertCSVStringToJSON(str) {
  str = stripBOM(str);

  const lines = splitLines(str);
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      headerLineIdx = i;
      break;
    }
  }
  if (headerLineIdx === -1) return { headers: [], rows: [], delimiter: ',' };

  const delim = detectDelimiterFromLine(lines[headerLineIdx]);
  let headers = parseRow(lines[headerLineIdx], delim).map(h => stripBOM(h).trim());

  const seen = new Map();
  headers = headers.map((h, idx) => {
    const key = h || `Column ${idx + 1}`;
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key} (${count + 1})`;
  });

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') continue;
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
function isCSV(p) {
  const ext = path.extname(p).toLowerCase();
  return ext === '.csv';
}
async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

// ------------------------------- Runners ------------------------------------

async function handleFile(inputFilePath, outPath) {
  const buf = fs.readFileSync(inputFilePath);
  let content;
  try {
    content = buf.toString('utf8');
  } catch {
    content = buf.toString('latin1');
  }
  const { headers, rows, delimiter } = convertCSVStringToJSON(content);

  const toStdout = ndjson || !outPath;
  let outStream = toStdout ? process.stdout : fs.createWriteStream(outPath, { encoding: 'utf8' });

  if (ndjson) {
    for (const r of rows) {
      for (const h of headers) {
        if (!Object.prototype.hasOwnProperty.call(r, h) || r[h] == null) r[h] = '';
      }
    }
    for (const r of rows) {
      outStream.write(JSON.stringify(r));
      outStream.write(os.EOL);
    }
  } else {
    const result = rows.map(r => {
      const full = {};
      for (const h of headers) {
        let v = r[h];
        if (v === null || typeof v === 'undefined') v = '';
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
      await handleFile(f, ndjson ? outFile : outFile);
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
    // Directory mode
    const dirInputPath = path.resolve(inputPath);
    const dirOutputRoot = outputPath
      ? path.resolve(outputPath)
      : path.resolve(path.dirname(dirInputPath), path.basename(dirInputPath) + '-json');
    await ensureDir(dirOutputRoot);
    await handleDirectory(dirInputPath, dirOutputRoot);
  } else if (stat.isFile()) {
    // File mode
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
