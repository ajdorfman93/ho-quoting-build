"use server";

import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import projectTags from "../config/projectTags.json" assert { type: "json" };
import { ensureExtensions } from "./db";
import { withTransaction } from "./db";
import { emitTableChange } from "./realtime";
import { toColumnKey, toSlug } from "./schema";

type Logger = (message: string) => void;

type AirtableField = {
  id: string;
  name: string;
  type: string;
};

type AirtableTable = {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
};

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

export type AirtableSyncResult = {
  baseId: string;
  projectTag: string;
  tables: Array<{
    tableName: string;
    displayName: string;
    rowCount: number;
  }>;
};

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";
const DEFAULT_AIRTABLE_BASE_ID = "appIBydxpXuSdssZW";
const AIRTABLE_BASE_ID =
  process.env.AIRTABLE_BASE_ID ??
  process.env.BASE_ID ??
  DEFAULT_AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN =
  process.env.AIRTABLE_ACCESS_TOKEN ??
  process.env.AIRTABLE_PAT ??
  process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ??
  process.env.AIRTABLE_API_KEY ??
  "";

const COLUMN_WIDTH = 220;
const DEFAULT_TABLE_PROJECT_TAG = projectTags.airtable;

type UndiciModule = typeof import("undici");

let fetchReady: Promise<void> | null = null;

async function ensureFetch(): Promise<void> {
  if (typeof fetch === "function") {
    return;
  }

  if (!fetchReady) {
    fetchReady = import("undici")
      .then((mod) => {
        const globalScope = globalThis as typeof globalThis & {
          fetch?: UndiciModule["fetch"];
        };

        if (typeof globalScope.fetch !== "function") {
          globalScope.fetch = mod.fetch;
        }
      })
      .catch((error) => {
        fetchReady = null;
        throw new Error(
          `Global fetch is not available and failed to load undici: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
  }

  await fetchReady;
}

async function fetchJson<T>(input: string | URL, token: string): Promise<T> {
  await ensureFetch();

  const response = await fetch(input, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = await response.text();
  const target = input instanceof URL ? input.toString() : String(input);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}\nURL: ${target}\nBody: ${
        body || "<empty>"
      }`
    );
  }

  if (!body) {
    return {} as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      `Failed to parse JSON from Airtable.\nURL: ${target}\nBody: ${body}`
    );
  }
}

function assertToken(): string {
  if (!AIRTABLE_TOKEN) {
    throw new Error(
      "Missing Airtable access token. Set AIRTABLE_ACCESS_TOKEN (or AIRTABLE_PAT / AIRTABLE_API_KEY) in the environment."
    );
  }
  return AIRTABLE_TOKEN;
}

async function ensureMetaTables(client: PoolClient) {
  await ensureExtensions(client);

  await client.query(`
    CREATE TABLE IF NOT EXISTS table_metadata (
      table_name TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      source_file TEXT,
      project_tag TEXT NOT NULL DEFAULT '${projectTags.defaultApp}',
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
    CREATE TABLE IF NOT EXISTS column_type_settings (
      table_name TEXT NOT NULL,
      column_name TEXT NOT NULL,
      column_type TEXT NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (table_name, column_name),
      CONSTRAINT column_type_settings_column_fk
        FOREIGN KEY (table_name, column_name)
        REFERENCES column_metadata(table_name, column_name)
        ON DELETE CASCADE
    );
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

  await client.query(`
    ALTER TABLE table_metadata
    ADD COLUMN IF NOT EXISTS project_tag TEXT NOT NULL DEFAULT '${projectTags.defaultApp}';
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_table_metadata_project_tag
      ON table_metadata (project_tag);
  `);
}

async function fetchAirtableTables(
  baseId: string,
  token: string
): Promise<AirtableTable[]> {
  const url = `${AIRTABLE_API_BASE}/meta/bases/${encodeURIComponent(
    baseId
  )}/tables`;
  const payload = await fetchJson<{ tables?: AirtableTable[] }>(url, token);

  const maybeTables = (payload as { tables?: unknown }).tables;

  if (!Array.isArray(maybeTables)) {
    throw new Error(
      `Unexpected response when loading Airtable metadata.\nURL: ${url}\nPayload: ${JSON.stringify(
        payload,
        null,
        2
      )}`
    );
  }

  return maybeTables as AirtableTable[];
}

async function fetchAirtableRecords(
  baseId: string,
  tableId: string,
  token: string,
  logger?: Logger
): Promise<AirtableRecord[]> {
  let offset: string | undefined;
  const records: AirtableRecord[] = [];

  do {
    const url = new URL(
      `${AIRTABLE_API_BASE}/${encodeURIComponent(
        baseId
      )}/${encodeURIComponent(tableId)}`
    );
    url.searchParams.set("pageSize", "100");
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const payload = await fetchJson<{
      records?: AirtableRecord[];
      offset?: string;
    }>(url, token);

    if (
      payload &&
      Object.prototype.hasOwnProperty.call(payload, "records") &&
      !Array.isArray(payload.records)
    ) {
      throw new Error(
        `Unexpected records payload for table ${tableId}.\nURL: ${url.toString()}\nPayload: ${JSON.stringify(
          payload,
          null,
          2
        )}`
      );
    }

    if (payload.records?.length) {
      records.push(...payload.records);
    }

    offset = payload.offset;
    if (logger) {
      logger(
        `Fetched ${records.length} records for table ${tableId}${
          offset ? "..." : ""
        }`
      );
    }
  } while (offset);

  return records;
}
function sanitizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return String(value);
}

async function upsertTableMetadata(
  client: PoolClient,
  params: {
    tableName: string;
    displayName: string;
    projectTag: string;
    source: string;
  }
) {
  await client.query(
    `
      INSERT INTO table_metadata (table_name, display_name, source_file, project_tag, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (table_name)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        source_file = EXCLUDED.source_file,
        project_tag = EXCLUDED.project_tag,
        updated_at = NOW();
    `,
    [params.tableName, params.displayName, params.source, params.projectTag]
  );
}

async function ensureTableColumns(
  client: PoolClient,
  tableName: string,
  projectTag: string,
  fieldOrder: string[],
  columnMap: Map<
    string,
    {
      key: string;
      fieldId: string;
      type: string;
      displayName: string;
      position: number;
    }
  >
) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS "${tableName}" (id UUID PRIMARY KEY);`
  );

  const { rows: existingColumnRows } = await client.query<{
    column_name: string;
  }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1;
    `,
    [tableName]
  );

  const existingColumns = new Set(existingColumnRows.map((row) => row.column_name));

  for (const fieldName of fieldOrder) {
    const column = columnMap.get(fieldName);
    if (!column) continue;

    if (!existingColumns.has(column.key)) {
      await client.query(
        `ALTER TABLE "${tableName}" ADD COLUMN "${column.key}" TEXT;`
      );
    }

    await client.query(
      `
        INSERT INTO column_metadata (
          table_name,
          column_name,
          display_name,
          data_type,
          position,
          width,
          is_nullable,
          updated_at
        )
        VALUES ($1, $2, $3, 'singleLineText', $4, $5, TRUE, NOW())
        ON CONFLICT (table_name, column_name)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          position = EXCLUDED.position,
          width = EXCLUDED.width,
          updated_at = NOW();
      `,
      [tableName, column.key, column.displayName, column.position, COLUMN_WIDTH]
    );

    await client.query(
      `
        INSERT INTO column_type_settings (table_name, column_name, column_type, settings, updated_at)
        VALUES ($1, $2, $3, '{}'::jsonb, NOW())
        ON CONFLICT (table_name, column_name)
        DO UPDATE SET
          column_type = EXCLUDED.column_type,
          settings = EXCLUDED.settings,
          updated_at = NOW();
      `,
      [tableName, column.key, column.type]
    );
  }

  // Ensure table metadata keeps the same project tag even if the table existed before.
  await client.query(
    `
      UPDATE table_metadata
      SET project_tag = $2
      WHERE table_name = $1;
    `,
    [tableName, projectTag]
  );
}

async function replaceTableRows(
  client: PoolClient,
  tableName: string,
  columnOrder: string[],
  columnMap: Map<
    string,
    { key: string; fieldId: string; type: string; displayName: string }
  >,
  records: AirtableRecord[]
) {
  await client.query(`DELETE FROM "${tableName}";`);
  if (!records.length) return;

  const columnList = columnOrder
    .map((fieldName) => columnMap.get(fieldName)?.key)
    .filter((key): key is string => Boolean(key));

  const columnsSql = ["id", ...columnList.map((column) => `"${column}"`)].join(
    ", "
  );
  const chunkSize = 200;

  for (let start = 0; start < records.length; start += chunkSize) {
    const slice = records.slice(start, start + chunkSize);
    const values: Array<string | null> = [];
    const placeholders: string[] = [];

    slice.forEach((record, sliceIndex) => {
      const rowValues: Array<string | null> = [randomUUID()];
      for (const fieldName of columnOrder) {
        const column = columnMap.get(fieldName);
        if (!column) {
          rowValues.push(null);
          continue;
        }
        const raw = record.fields?.[column.displayName];
        rowValues.push(sanitizeValue(raw));
      }

      const offset = sliceIndex * (columnList.length + 1);
      const placeholderRow = rowValues
        .map((_, idx) => `$${offset + idx + 1}`)
        .join(", ");
      placeholders.push(`(${placeholderRow})`);
      values.push(...rowValues);
    });

    await client.query(
      `INSERT INTO "${tableName}" (${columnsSql}) VALUES ${placeholders.join(
        ", "
      )};`,
      values
    );
  }
}

async function pruneMissingTables(
  client: PoolClient,
  projectTag: string,
  existingTables: Set<string>,
  logger?: Logger
) {
  const { rows } = await client.query<{ table_name: string }>(
    `
      SELECT table_name
      FROM table_metadata
      WHERE project_tag = $1;
    `,
    [projectTag]
  );

  for (const row of rows) {
    if (existingTables.has(row.table_name)) continue;
    await client.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE;`);
    await client.query(
      `DELETE FROM table_metadata WHERE table_name = $1;`,
      [row.table_name]
    );
    if (logger) {
      logger(`Removed table ${row.table_name} (no longer present in Airtable)`);
    }
  }
}

function mapFieldTypeToColumnType(fieldType: string): string {
  switch (fieldType) {
    case "singleLineText":
    case "multilineText":
    case "text":
      return "singleLineText";
    case "richText":
      return "longText";
    case "checkbox":
      return "checkbox";
    case "multipleSelects":
      return "multipleSelect";
    case "singleSelect":
      return "singleSelect";
    case "email":
      return "email";
    case "phoneNumber":
      return "phone";
    case "url":
      return "url";
    case "date":
    case "dateTime":
      return "date";
    case "currency":
      return "currency";
    case "percent":
      return "percent";
    case "duration":
      return "duration";
    case "rating":
      return "rating";
    case "formula":
      return "formula";
    case "rollup":
      return "rollup";
    case "count":
      return "count";
    case "lookup":
      return "lookup";
    case "createdTime":
      return "createdTime";
    case "lastModifiedTime":
      return "lastModifiedTime";
    case "createdBy":
      return "createdBy";
    case "lastModifiedBy":
      return "lastModifiedBy";
    case "multipleRecordLinks":
      return "linkToRecord";
    case "number":
    case "autoNumber":
      return "number";
    default:
      return "singleLineText";
  }
}

export async function syncAirtableBase(options?: {
  baseId?: string;
  projectTag?: string;
  logger?: Logger;
}): Promise<AirtableSyncResult> {
  const baseId = options?.baseId ?? AIRTABLE_BASE_ID;
  const projectTag = options?.projectTag ?? DEFAULT_TABLE_PROJECT_TAG;
  const logger = options?.logger;
  const token = assertToken();

  if (logger) {
    logger(`Starting Airtable sync for base ${baseId}`);
  }

  const tables = await fetchAirtableTables(baseId, token);
  if (!tables.length) {
    return { baseId, projectTag, tables: [] };
  }

  const tableRecords = await Promise.all(
    tables.map(async (table) => {
      const records = await fetchAirtableRecords(baseId, table.id, token, logger);
      return { table, records };
    })
  );

  const summary: AirtableSyncResult["tables"] = [];

  await withTransaction(async (client) => {
    await ensureMetaTables(client);

    const syncedTables = new Set<string>();

    for (const entry of tableRecords) {
      const { table, records } = entry;
      const slug = toSlug(table.name);
      const columnMap = new Map<
        string,
        {
          key: string;
          fieldId: string;
          type: string;
          displayName: string;
          position: number;
        }
      >();

      const usedColumnKeys = new Set<string>();
      table.fields.forEach((field, index) => {
        const key = toColumnKey(field.name, usedColumnKeys);
        columnMap.set(field.name, {
          key,
          fieldId: field.id,
          type: mapFieldTypeToColumnType(field.type),
          displayName: field.name,
          position: index + 1,
        });
      });

      const columnOrder = table.fields.map((field) => field.name);

      await upsertTableMetadata(client, {
        tableName: slug,
        displayName: table.name,
        projectTag,
        source: `airtable://${baseId}/${table.id}`,
      });

      await ensureTableColumns(
        client,
        slug,
        projectTag,
        columnOrder,
        columnMap
      );

      await replaceTableRows(client, slug, columnOrder, columnMap, records);

      syncedTables.add(slug);
      summary.push({
        tableName: slug,
        displayName: table.name,
        rowCount: records.length,
      });

      emitTableChange({
        table: slug,
        type: "rowUpdated",
        payload: { rowId: "*", values: {} },
        timestamp: new Date().toISOString(),
      });
    }

    await pruneMissingTables(client, projectTag, syncedTables, logger);
  });

  if (logger) {
    logger(
      `Completed Airtable sync for base ${baseId} (${summary.length} tables)`
    );
  }

  return { baseId, projectTag, tables: summary };
}

