#!/usr/bin/env node
/**
 * csvToJsonConverter.js
 *
 * - Recursively converts every .csv file under an input directory into .json files
 * - Preserves folder structure in the output directory
 * - Filename stays the same except extension changes .csv -> .json
 * - CSV rules supported:
 *    • RFC4180-style parsing: quoted fields, commas inside quotes, escaped quotes ("")
 *    • Empty cell -> []
 *    • Cell that looks like multiple quoted items:  "A", "B" -> ["A","B"]
 *    • Otherwise keep the cell as a string (including numbers and prices like $0.00)
 *    • Special characters are preserved; JSON escaping is handled by JSON.stringify
 *
 * Usage:
 *   node csvToJsonConverter.js airtable\csv
 *   If outputDir is omitted and inputDir ends with '/csv', it's replaced with '/json';
 *   otherwise '-json' is appended (e.g., 'data' -> 'data-json').
 */

const fs = require('fs/promises');
const path = require('path');

async function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg) {
    console.error('Usage: node csvToJsonConverter.js <inputDir> [outputDir]');
    process.exit(1);
  }

  const inputDir = path.resolve(process.cwd(), inputArg);
  const outputDir = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : defaultOutputDir(inputDir);

  await ensureDir(outputDir);
  await processDirectory(inputDir, outputDir);
  console.log(`✅ Done. JSON files written under: ${outputDir}`);
}

function defaultOutputDir(inputDir) {
  const parts = inputDir.split(path.sep);
  if (parts[parts.length - 1].toLowerCase() === 'csv') {
    parts[parts.length - 1] = 'json';
    return parts.join(path.sep);
  }
  return inputDir + '-json';
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function processDirectory(inDir, outDir) {
  const entries = await fs.readdir(inDir, { withFileTypes: true });
  for (const ent of entries) {
    const inPath = path.join(inDir, ent.name);
    const outPath = path.join(outDir, ent.name);
    if (ent.isDirectory()) {
      await ensureDir(outPath);
      await processDirectory(inPath, outPath);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.csv')) {
      const outFile = outPath.slice(0, -4) + '.json';
      await convertCsvFile(inPath, outFile);
      console.log(`→ ${path.relative(process.cwd(), outFile)}`);
    }
  }
}

async function convertCsvFile(inFile, outFile) {
  let content = await fs.readFile(inFile, 'utf8');
  // Strip Byte Order Mark if present
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const rows = parseCSV(content);
  if (rows.length === 0) {
    await ensureDir(path.dirname(outFile));
    await fs.writeFile(outFile, '[]\n');
    return;
  }

  const headers = rows[0];
  const records = rows.slice(1).filter(r => r.some(c => c !== '')); // drop fully empty lines

  const json = records.map(row => rowToObject(headers, row));
  await ensureDir(path.dirname(outFile));
  await fs.writeFile(outFile, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

/**
 * Convert a parsed CSV row into the desired JSON object.
 */
function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i] ?? `Column ${i + 1}`;
    const raw = row[i] ?? '';

    // Empty cell -> empty array
    if (raw === '') {
      obj[key] = [];
      continue;
    }

    // Check if the cell is a list of quoted items like: "Item A", "Item B", "Item C"
    // After CSV unescaping, such a cell will literally contain quotes around each item.
    // Example pattern:  "Hardware: A, X", "Hardware: B, Y"
    if (looksLikeQuotedList(raw)) {
      obj[key] = splitQuotedList(raw);
    } else {
      // Keep as plain string (numbers/prices remain strings per requirement)
      obj[key] = raw;
    }
  }
  return obj;
}

/**
 * Returns true if the string looks like:  "something"(, "something")+
 * (allowing arbitrary internal commas/quotes escaped by CSV rules already handled)
 */
function looksLikeQuotedList(str) {
  // Trim surrounding whitespace
  const s = str.trim();
  // Quick pre-check to avoid heavy regex if no quotes exist
  if (!s.includes('"')) return false;

  // Match one or more quoted segments separated by commas (with optional spaces)
  // A quoted segment here is " ... " where inside we allow anything except unescaped "
  // Since CSV unescaping already turned "" -> " inside, we can safely capture till next ".
  const re = /^"[^"]*"(?:\s*,\s*"[^"]*")+$/;
  return re.test(s);
}

/**
 * Splits a list like: "A", "B, C", "D"
 * and returns ["A", "B, C", "D"]
 */
function splitQuotedList(str) {
  const items = [];
  let i = 0;
  const s = str.trim();
  while (i < s.length) {
    // Expect starting quote
    if (s[i] !== '"') break;
    i++; // skip opening "
    let buf = '';
    for (; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') {
        i++; // consume closing "
        break;
      } else {
        buf += ch;
      }
    }
    items.push(buf);
    // Skip optional spaces
    while (i < s.length && /\s/.test(s[i])) i++;
    // If next is comma, skip it and trailing spaces and continue
    if (s[i] === ',') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      continue;
    } else {
      break;
    }
  }
  return items;
}

/**
 * RFC4180-ish CSV parser:
 * - Handles quoted fields
 * - Handles commas/newlines within quotes
 * - Unescapes double-double-quotes inside quoted fields
 * Returns array of rows, each row is array of cell strings (already unescaped).
 */
function parseCSV(text) {
  // Normalize line endings to \n (but we cannot simply split on \n; we must respect quotes)
  const rows = [];
  let row = [];
  let field = '';

  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
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
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        // skip CR; handle CRLF or lone CR
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }
  }
  // push last field/row if any data
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Normalize row lengths to header length if possible
  if (rows.length > 0) {
    const headerLen = rows[0].length;
    for (let r = 1; r < rows.length; r++) {
      if (rows[r].length < headerLen) {
        // pad missing cells as empty
        rows[r] = rows[r].concat(Array(headerLen - rows[r].length).fill(''));
      } else if (rows[r].length > headerLen) {
        // merge extras into last cell to avoid losing data
        const keep = rows[r].slice(0, headerLen - 1);
        const tail = rows[r].slice(headerLen - 1).join(',');
        rows[r] = keep.concat(tail);
      }
    }
  }

  return rows;
}

main().catch(err => {
  console.error('❌ Error:', err?.stack || err);
  process.exit(1);
});
