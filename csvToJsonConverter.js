#!/usr/bin/env node
/**
 * csvToJsonConverter.js
 *
 * Recursively converts CSV files to JSON with custom cell rules:
 * - First row are headers.
 * - Empty cell => [].
 * - Cells formatted as a series of quoted items: `"A", "B", "C"` => ["A", "B", "C"].
 * - Some arrays may contain a single item but still arrive in the same quoted-list format => ["..."].
 * - Otherwise preserve as a string, including special characters (quotes, commas, parentheses, $).
 * - Output file keeps same relative path and name, extension changed to .json.
 *
 * Usage:
 *   node csvToJsonConverter.js <inputFolder> [outputFolder]
 *   node csvToJsonConverter.js airtable/csv airtable/json
 *   node csvToJsonConverter.js airtable/csv
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

// Dependency check
let parseCsv;
try {
  // csv-parse/sync provides a reliable RFC4180-compliant parser
  const csvParseSync = await import('csv-parse/sync');
  parseCsv = csvParseSync.parse;
} catch (e) {
  fatal(
    'Missing dependency "csv-parse". Install it first:\n  npm i csv-parse'
  );
}

// --- CLI args & paths --------------------------------------------------------
const inArg = process.argv[2];
let outArg = process.argv[3];

if (!inArg) {
  fatal(
    'Usage: node csvToJsonConverter.js <inputFolder> [outputFolder]\n' +
      'Example: node csvToJsonConverter.js airtable/csv airtable/json'
  );
}

const inputRoot = path.resolve(inArg);
if (!fs.existsSync(inputRoot) || !fs.statSync(inputRoot).isDirectory()) {
  fatal(`Input folder does not exist or is not a directory: ${inputRoot}`);
}

if (!outArg) {
  // Try to swap '/csv' -> '/json', otherwise append '_json'
  const baseName = path.basename(inputRoot);
  if (baseName.toLowerCase() === 'csv') {
    outArg = path.join(path.dirname(inputRoot), 'json');
  } else {
    outArg = inputRoot.replace(/(^|[/\\])csv([/\\]|$)/i, '$1json$2');
    if (outArg === inputRoot) {
      outArg = inputRoot + '_json';
    }
  }
}
const outputRoot = path.resolve(outArg);

// Ensure output root exists
fs.mkdirSync(outputRoot, { recursive: true });

// --- Helpers -----------------------------------------------------------------

/**
 * Strip a BOM from the start of a string.
 */
function stripBOM(s) {
  if (!s) return s;
  return s.replace(/^\uFEFF/, '');
}

/**
 * After the CSV parser unescapes quotes, a field that originally looked like:
 *   """A, a"",b"", c"", d""", ""B, b"""
 * will often appear as:
 *   "\"A, a\",b\", c\", d\"", "B, b\""
 *
 * We only want to treat a cell as an array if the entire content is a clean
 * sequence of quoted items separated by commas, like:
 *   "Item 1", "Item 2", "Item 3"
 *
 * This parser:
 * - Accepts zero or more spaces around commas.
 * - Accepts embedded quotes inside items (already unescaped by CSV parser).
 * - Returns null if the string does not match the strict list form.
 */
function tryParseQuotedList(cell) {
  if (typeof cell !== 'string') return null;

  let i = 0;
  const s = cell.trim();
  const items = [];

  function skipSpaces() {
    while (i < s.length && /\s/.test(s[i])) i++;
  }

  function nextIsComma() {
    return s[i] === ',';
  }

  function readQuoted() {
    if (s[i] !== '"') return null;
    i++; // skip opening quote
    let buf = '';
    while (i < s.length) {
      const ch = s[i];
      if (ch === '"') {
        // closing quote
        i++;
        return buf;
      }
      buf += ch;
      i++;
    }
    // No closing quote -> invalid list
    return null;
  }

  skipSpaces();
  if (i >= s.length) return null;
  if (s[i] !== '"') return null;

  // Parse first item
  const first = readQuoted();
  if (first == null) return null;
  items.push(first);

  // Parse zero or more: , "item"
  while (true) {
    skipSpaces();
    if (i >= s.length) break;
    if (!nextIsComma()) {
      // Any trailing non-separator means NOT a pure quoted-list
      return null;
    }
    i++; // skip comma
    skipSpaces();
    const nxt = readQuoted();
    if (nxt == null) return null;
    items.push(nxt);
  }

  return items;
}

/**
 * Transform a single CSV cell according to the spec.
 * - Empty -> []
 * - If it matches strict quoted-list format -> array of strings
 * - Else -> string as-is (preserving commas, quotes, parentheses, $)
 *
 * NOTE: Per the examples, numbers and prices remain strings (e.g., "2", "$0.00").
 */
function transformCell(raw) {
  // Normalize undefined/null to empty string
  const val = raw == null ? '' : String(raw);

  if (val.trim() === '') return [];

  // Try strict "list of quoted items"
  const asList = tryParseQuotedList(val);
  if (asList) {
    // Preserve inner content exactly as text
    return asList.map((x) => x);
  }

  // Otherwise, keep as a string (preserve any special characters)
  return val;
}

/**
 * Recursively gather all CSV files under a directory.
 */
async function listCsvFiles(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await listCsvFiles(full)));
    } else if (ent.isFile() && /\.csv$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Convert one CSV file to JSON array (of row objects) with the custom rules.
 */
async function convertCsvFile(inFile) {
  const buf = await fsp.readFile(inFile);
  const text = buf.toString('utf8');

  const records = parseCsv(text, {
    bom: true,
    columns: true, // use header row
    skip_empty_lines: false,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  });

  if (!Array.isArray(records)) {
    throw new Error(`Unexpected parse result for ${inFile}`);
  }

  // Normalize headers (strip BOM on the very first header if present)
  // csv-parse with columns:true already mapped keys; just ensure BOM is stripped.
  const normalized = records.map((row) => {
    const obj = {};
    for (const k of Object.keys(row)) {
      const key = stripBOM(k);
      obj[key] = transformCell(row[k]);
    }
    return obj;
  });

  return normalized;
}

/**
 * For a given input file path, compute the mirrored output .json path
 * beneath outputRoot, preserving subdirectory structure.
 */
function mirroredOutputPath(csvPath) {
  const rel = path.relative(inputRoot, csvPath);
  const base = rel.replace(/\.csv$/i, '.json');
  return path.join(outputRoot, base);
}

// --- Main --------------------------------------------------------------------
(async () => {
  try {
    const csvFiles = await listCsvFiles(inputRoot);
    if (csvFiles.length === 0) {
      console.warn(`No CSV files found under: ${inputRoot}`);
      return;
    }

    for (const csvPath of csvFiles) {
      const outPath = mirroredOutputPath(csvPath);
      const outDir = path.dirname(outPath);
      await fsp.mkdir(outDir, { recursive: true });

      const data = await convertCsvFile(csvPath);

      // Stringify with 2-space indent; ensure stable order of keys by default iteration
      const jsonText = JSON.stringify(data, null, 2) + '\n';
      await fsp.writeFile(outPath, jsonText, 'utf8');

      console.log(`Converted: ${path.relative(inputRoot, csvPath)} -> ${path.relative(outputRoot, outPath)}`);
    }

    console.log(`\nDone. Output at: ${outputRoot}`);
  } catch (err) {
    console.error('Error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
