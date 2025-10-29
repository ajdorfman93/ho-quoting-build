#!/usr/bin/env node
/**
 * csv-to-json.js
 *
 * Convert CSV to JSON (array or NDJSON) with a robust parser.
 * Also supports directory mode, mirroring folder structure to a separate output root.
 *
 * Usage (single file):
 *   node csv-to-json.js -i "Quote Line Items-Grid view.csv"
 *   node csv-to-json.js -i input.csv -o output.json --pretty 2
 *   node csv-to-json.js -i input.csv --ndjson > output.ndjson
 *
 * Usage (directory mode; recursively convert all *.csv):
 *   node csv-to-json.js airtable\csv --pretty
 *   node csv-to-json.js src -o out-json
 *   node csv-to-json.js ./my/csvs --ndjson --infer-types
 *
 * Requires Node 18+ and the csv-parser package:
 *   npm i csv-parser
 */

import fs from 'fs';
const fsp = fs.promises;
import path from 'path';
import os from 'os';
import csvParser from 'csv-parser';

// ----------------------------- CLI parsing ----------------------------------

const argv = process.argv.slice(2);
function hasFlag(name, alias) {
  return argv.includes(`--${name}`) || (alias && argv.includes(`-${alias}`));
}
function getOpt(name, alias, def = undefined) {
  const idxLong = argv.indexOf(`--${name}`);
  if (idxLong !== -1 && idxLong + 1 < argv.length && !argv[idxLong + 1].startsWith('-')) {
    return argv[idxLong + 1];
  }
  if (alias) {
    const idxShort = argv.indexOf(`-${alias}`);
    if (idxShort !== -1 && idxShort + 1 < argv.length && !argv[idxShort + 1].startsWith('-')) {
      return argv[idxShort + 1];
    }
  }
  return def;
}
function firstPositional() {
  // Return the first arg that doesn't look like a flag or a value tied to a flag
  const consumed = new Set();
  const flagNamesWithValues = new Set([
    '--input','-i','--output','-o','--delimiter','--pretty','--array-fields','--array-sep','--limit'
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (flagNamesWithValues.has(a) && i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        consumed.add(i + 1);
      }
      continue;
    }
    if (!consumed.has(i)) return a;
  }
  return undefined;
}

function printHelp() {
  const help = `
CSV → JSON converter (file or directory)

Required (file mode):
  -i, --input <path>          Input CSV file path
  OR pass a directory as a positional arg for directory mode:
      csv-to-json.js <dir>    Recursively convert all .csv files in <dir>

Optional (both modes):
  -o, --output <path>         File (file mode) or output root directory (dir mode).
                              In dir mode, defaults to "<inputDir>-json"
      --ndjson                Output newline-delimited JSON (one JSON object per line) instead of an array
      --delimiter <char>      Explicit CSV delimiter. If omitted, auto-detected per file (',' ';' '\\t' '|')
      --pretty [n]            Pretty-print JSON with indentation (default 2 if flag used without a number)
      --infer-types           Convert numbers/booleans/null automatically (default: off)
      --array-fields <list>   Comma-separated list of columns to split into arrays (e.g. "tags,colors")
      --array-sep <char>      Character used to split array-fields (e.g. ';' or '|'). Default: ';'
      --keep-empty            Keep empty string fields (default: drop them)
      --limit <n>             Process at most n rows (per-file; for testing)
  -h, --help                  Show help

Examples:
  node csv-to-json.js -i "Quote Line Items-Grid view.csv"
  node csv-to-json.js src
  node csv-to-json.js src -o out-json --ndjson --infer-types
`;
  console.log(help.trim() + '\n');
}

if (hasFlag('help', 'h') || argv.length === 0) {
  printHelp();
  process.exit(0);
}

// Input can be provided by -i/--input or as first positional argument (dir mode convenience)
let inputPath = getOpt('input', 'i');
if (!inputPath) {
  const pos = firstPositional();
  if (pos) inputPath = pos;
}
if (!inputPath) {
  console.error('Error: Provide an input CSV with --input <path> OR pass a directory as a positional argument.\n');
  printHelp();
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input path not found: ${inputPath}`);
  process.exit(1);
}

const explicitDelimiter = getOpt('delimiter', null, null);
const ndjson = hasFlag('ndjson');
const prettyFlag = hasFlag('pretty');
let pretty = 0;
if (prettyFlag) {
  const p = getOpt('pretty');
  pretty = p && !p.startsWith('-') ? Number(p) || 2 : 2;
}
const inferTypes = hasFlag('infer-types');
const keepEmpty = hasFlag('keep-empty');
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

// Determine output
let outputPath = getOpt('output', 'o', null); // file in file-mode; root dir in dir-mode

// ------------------------- Delimiter detection -------------------------------

function detectDelimiterSync(filePath) {
  if (explicitDelimiter) return explicitDelimiter;

  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(1024 * 64);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    const sample = buf.toString('utf8', 0, bytes);

    // Use the first non-empty line for detection
    const line = sample.split(/\r?\n/).find(l => l.trim().length > 0) || '';
    const candidates = [',', ';', '\t', '|'];
    const counts = candidates.map(c => ({ c, n: (line.match(new RegExp(`\\${c}`, 'g')) || []).length }));
    counts.sort((a, b) => b.n - a.n);
    const best = counts[0];
    return best && best.n > 0 ? best.c : ',';
  } finally {
    fs.closeSync(fd);
  }
}

// --------------------------- Value transforms --------------------------------

function coerceValue(key, value) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;

  // Strip BOM from the very first value if present
  if (value.charCodeAt(0) === 0xFEFF) value = value.slice(1);

  const trimmed = value.trim();

  if (!keepEmpty && trimmed === '') return undefined;

  // Array splitting for selected fields
  if (arrayFields.size > 0 && arrayFields.has(key.toLowerCase())) {
    const parts = trimmed.split(arraySep).map(s => s.trim()).filter(s => (keepEmpty ? true : s !== ''));
    return parts;
  }

  if (!inferTypes) return trimmed;

  // Type inference (conservative)
  if (/^-?\d+$/.test(trimmed)) {
    const asInt = parseInt(trimmed, 10);
    if (Number.isSafeInteger(asInt)) return asInt;
  }
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    const asFloat = parseFloat(trimmed);
    if (!Number.isNaN(asFloat)) return asFloat;
  }
  if (/^(true|false)$/i.test(trimmed)) {
    return /^true$/i.test(trimmed);
  }
  if (/^null$/i.test(trimmed)) return null;
  if (/^undefined$/i.test(trimmed)) return undefined;

  return trimmed;
}

// ------------------------------- Conversion ----------------------------------

async function convertFile(fileInputPath, fileOutputPath) {
  let rowCount = 0;
  const inStream = fs.createReadStream(fileInputPath);

  const delimiter = detectDelimiterSync(fileInputPath);

  const parser = csvParser({
    separator: delimiter,
    skipLines: 0,
    mapValues: ({ header, value }) => coerceValue(header, value)
  });

  const toStdout = !fileOutputPath;
  const outStream = toStdout ? process.stdout : fs.createWriteStream(fileOutputPath, { encoding: 'utf8' });

  let first = true;
  let ended = false;

  if (!ndjson) {
    outStream.write('[\n');
  }

  function writeRow(obj) {
    if (limit && rowCount >= limit) return;
    rowCount++;

    for (const k of Object.keys(obj)) {
      if (obj[k] === undefined) delete obj[k];
    }

    if (ndjson) {
      outStream.write(JSON.stringify(obj));
      outStream.write(os.EOL);
      return;
    }

    const prefix = first ? '' : ',\n';
    first = false;
    const space = pretty > 0 ? ' '.repeat(pretty) : '';
    const json = JSON.stringify(obj, null, pretty || 0);
    if (pretty > 0) {
      const indented = json.split('\n').map(line => space + line).join('\n');
      outStream.write(prefix + indented);
    } else {
      outStream.write(prefix + json);
    }
  }

  return new Promise((resolve, reject) => {
    inStream
      .on('error', reject)
      .pipe(parser)
      .on('data', (row) => {
        if (!ended) writeRow(row);
        if (limit && rowCount >= limit) {
          ended = true;
          inStream.destroy(); // stop reading more
        }
      })
      .on('end', () => {
        if (!ndjson) {
          outStream.write('\n]\n');
        }
        if (!toStdout) outStream.end();
        resolve({ rows: rowCount, output: fileOutputPath || '(stdout)', delimiter });
      })
      .on('error', reject);
  });
}

// ------------------------------ Directory Mode -------------------------------

async function* walkDir(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
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
  await fsp.mkdir(p, { recursive: true });
}

async function convertDirectory(dirInputPath, dirOutputRoot) {
  const files = [];
  for await (const f of walkDir(dirInputPath)) {
    if (isCSV(f)) files.push(f);
  }

  if (files.length === 0) {
    console.error(`No CSV files found under: ${dirInputPath}`);
    return { converted: 0, total: 0 };
  }

  console.error(`Found ${files.length} CSV file(s). Output root: ${dirOutputRoot}`);
  let converted = 0;

  for (const csvPath of files) {
    const rel = path.relative(dirInputPath, csvPath);
    const outDir = path.join(dirOutputRoot, path.dirname(rel));
    await ensureDir(outDir);

    const base = path.basename(rel, path.extname(rel));
    const outFile = path.join(outDir, base + (ndjson ? '.ndjson' : '.json'));

    try {
      const { rows, delimiter } = await convertFile(csvPath, outFile);
      converted++;
      console.error(`✔ ${rel} → ${path.relative(process.cwd(), outFile)}  (${rows} row(s), delimiter="${delimiter}")`);
    } catch (err) {
      console.error(`✖ Failed to convert ${rel}: ${err && err.message ? err.message : err}`);
    }
  }

  return { converted, total: files.length };
}

// --------------------------------- Run ---------------------------------------

(async () => {
  try {
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
      // Directory mode
      const outRoot = outputPath
        ? outputPath
        : path.resolve(path.dirname(inputPath), path.basename(inputPath) + '-json');
      await ensureDir(outRoot);
      const { converted, total } = await convertDirectory(path.resolve(inputPath), outRoot);
      console.error(`Done. Converted ${converted}/${total} file(s).${ndjson ? ' (ndjson)' : ''}${inferTypes ? ' (infer-types)' : ''}`);
    } else if (stat.isFile()) {
      // File mode
      if (!outputPath && !ndjson) {
        const ext = path.extname(inputPath);
        outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, ext) + '.json');
      }
      const { rows, output, delimiter } = await convertFile(inputPath, ndjson ? null : outputPath);
      console.error(`Done. Wrote ${rows} row(s) to ${output}. Delimiter="${delimiter}"${inferTypes ? ' (infer-types)' : ''}${ndjson ? ' (ndjson)' : ''}`);
    } else {
      throw new Error('Input path must be a file or directory.');
    }
  } catch (err) {
    console.error('Conversion failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
