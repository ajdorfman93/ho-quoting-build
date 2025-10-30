/* eslint-disable @typescript-eslint/no-require-imports */

#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const dotenv = require("dotenv");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "airtable", "csv-json");

dotenv.config({ path: path.join(ROOT_DIR, ".env.local") });

function toSlug(name, prefix = "tbl") {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return `${prefix}_${randomUUID().replace(/-/g, "")}`;
  }

  return /^[a-z_]/.test(normalized) ? normalized : `${prefix}_${normalized}`;
}

function toColumnKey(name, existing) {
  const slug = toSlug(name, "col").replace(/^col_/, "");
  const base = slug ? `col_${slug}` : `col_${randomUUID().slice(0, 8)}`;
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }

  let index = 2;
  let candidate = `${base}_${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }

  existing.add(candidate);
  return candidate;
}

async function ensureMetaTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS table_metadata (
      table_name TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      source_file TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS column_metadata (
      table_name TEXT NOT NULL,
      column_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      data_type TEXT NOT NULL DEFAULT 'singleLineText',
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      position INTEGER NOT NULL,
      is_nullable BOOLEAN NOT NULL DEFAULT TRUE,
      width INTEGER NOT NULL DEFAULT 160,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (table_name, column_name),
      CONSTRAINT column_metadata_table_fk
        FOREIGN KEY (table_name) REFERENCES table_metadata(table_name) ON DELETE CASCADE
    );
  `);

  await client.query(`
    ALTER TABLE column_metadata
      ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 160;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS table_change_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name TEXT NOT NULL,
      change_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function migrateSingleTable(client, filePath) {
  const displayName = path.basename(filePath, ".json");
  const tableName = toSlug(displayName);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(raw)) {
    throw new Error(`Expected array of records in ${filePath}`);
  }

  const seenRawColumns = new Set();
  const rawColumnOrder = [];

  for (const record of raw) {
    if (record && typeof record === "object") {
      for (const key of Object.keys(record)) {
        if (!seenRawColumns.has(key)) {
          seenRawColumns.add(key);
          rawColumnOrder.push(key);
        }
      }
    }
  }

  const columnKeys = new Map();
  const usedColumnKeys = new Set();
  rawColumnOrder.forEach((columnName, index) => {
    const key = toColumnKey(columnName, usedColumnKeys);
    columnKeys.set(columnName, { key, position: index + 1 });
  });

  if (!columnKeys.size) {
    console.warn(`No columns detected for ${displayName}, skipping.`);
    return;
  }

  const columnDefinitions = Array.from(columnKeys.values())
    .map(({ key }) => `"${key}" TEXT`)
    .join(",\n      ");

  // Ensure metadata entries
  await client.query(
    `
      INSERT INTO table_metadata (table_name, display_name, source_file, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (table_name)
      DO UPDATE SET display_name = EXCLUDED.display_name,
                    source_file = EXCLUDED.source_file,
                    updated_at = NOW();
    `,
    [tableName, displayName, path.relative(ROOT_DIR, filePath)]
  );

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id UUID PRIMARY KEY,
      ${columnDefinitions}
    );
  `);

  const { rows: existingColumnRows } = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1;
    `,
    [tableName]
  );

  const existingColumns = new Set(existingColumnRows.map((row) => row.column_name));

  // Ensure columns exist (in case new columns were added later)
  for (const [rawName, { key }] of columnKeys.entries()) {
    if (!existingColumns.has(key)) {
      await client.query(
        `ALTER TABLE "${tableName}" ADD COLUMN "${key}" TEXT;`
      );
    }

    await client.query(
      `
        INSERT INTO column_metadata (table_name, column_name, display_name, data_type, position, width)
        VALUES ($1, $2, $3, 'singleLineText', $4, 220)
        ON CONFLICT (table_name, column_name)
        DO UPDATE SET display_name = EXCLUDED.display_name,
                      position = EXCLUDED.position,
                      width = EXCLUDED.width,
                      updated_at = NOW();
      `,
      [tableName, key, rawName, columnKeys.get(rawName).position]
    );
  }

  await client.query(`DELETE FROM "${tableName}";`);

  if (!raw.length) {
    return;
  }

  const columnList = ["id"].concat(
    rawColumnOrder.map((rawColumn) => columnKeys.get(rawColumn).key)
  );
  const columnSql = columnList.map((col) => `"${col}"`).join(", ");

  const chunkSize = 500;
  for (let idx = 0; idx < raw.length; idx += chunkSize) {
    const slice = raw.slice(idx, idx + chunkSize);
    const values = [];
    const valuePlaceholders = [];

    slice.forEach((record, rowIndex) => {
      const rowValues = [randomUUID()];
      rawColumnOrder.forEach((rawColumn) => {
        const value = record?.[rawColumn];
        if (
          value === "" ||
          value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim() === "")
        ) {
          rowValues.push(null);
        } else if (typeof value === "object") {
          rowValues.push(JSON.stringify(value));
        } else {
          rowValues.push(String(value));
        }
      });
      values.push(...rowValues);
      const placeholders = rowValues.map((_, colIndex) => `$${rowIndex * columnList.length + colIndex + 1}`);
      valuePlaceholders.push(`(${placeholders.join(", ")})`);
    });

    await client.query(
      `INSERT INTO "${tableName}" (${columnSql}) VALUES ${valuePlaceholders.join(", ")};`,
      values
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await ensureMetaTables(client);

    const files = fs
      .readdirSync(DATA_DIR)
      .filter((file) => file.endsWith(".json"))
      .sort();

    for (const file of files) {
      console.log(`Migrating ${file}...`);
      await migrateSingleTable(client, path.join(DATA_DIR, file));
    }

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
