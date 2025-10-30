import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import type { ColumnSpec } from "./tableUtils";
import { query, withTransaction } from "./db";
import { emitTableChange } from "./realtime";
import { ColumnMetadata, TableMetadata, toColumnKey } from "./schema";
import { findAirtableTableBySource } from "./airtableLoader";

export type TableRow = Record<string, unknown> & { id: string };

const SAFE_IDENTIFIER = /^[a-zA-Z_][0-9a-zA-Z_]*$/;

function assertSafeIdentifier(identifier: string): string {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return identifier;
}

function normalizeColumnLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function cloneConfig<T>(value: T | undefined | null): T | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function toColumnSpec(meta: ColumnMetadata): ColumnSpec<TableRow> {
  const rawConfig = (meta.config ?? {}) as ColumnSpec<TableRow>["config"];
  const config = rawConfig && Object.keys(rawConfig).length ? cloneConfig(rawConfig) : undefined;

  return {
    key: meta.column_name,
    name: meta.display_name,
    type: (meta.data_type as ColumnSpec<TableRow>["type"]) ?? "singleLineText",
    width: meta.width ?? 220,
    config
  };
}

function normalizeValue(input: unknown): string | null {
  if (
    input === null ||
    input === undefined ||
    (typeof input === "string" && input.trim() === "")
  ) {
    return null;
  }
  if (typeof input === "object") {
    return JSON.stringify(input);
  }
  return String(input);
}

async function fetchColumnMetadata(
  client: PoolClient,
  tableName: string
): Promise<ColumnMetadata[]> {
  const { rows } = await client.query<ColumnMetadata>(
    `
      SELECT table_name, column_name, display_name, data_type, config, position, is_nullable, width, created_at, updated_at
      FROM column_metadata
      WHERE table_name = $1
      ORDER BY position ASC;
    `,
    [tableName]
  );

  return rows.map((row) => ({
    ...row,
    config: row.config ?? {},
  }));
}

export async function listTables(): Promise<TableMetadata[]> {
  const { rows } = await query<TableMetadata>(
    `SELECT table_name, display_name, source_file, created_at, updated_at FROM table_metadata ORDER BY display_name ASC;`
  );
  return rows;
}

export async function getTableData(
  tableName: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  table: TableMetadata;
  columns: ColumnSpec<TableRow>[];
  rows: TableRow[];
  totalRows: number;
}> {
  const safeTable = assertSafeIdentifier(tableName);
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
  const offset = Math.max(0, options?.offset ?? 0);

  const [tableResult, columns, rowsResult, countResult] = await Promise.all([
    query<TableMetadata>(
      `
        SELECT table_name, display_name, source_file, created_at, updated_at
        FROM table_metadata
        WHERE table_name = $1;
      `,
      [safeTable]
    ),
    query<ColumnMetadata>(
      `
        SELECT table_name, column_name, display_name, data_type, config, position, is_nullable, width, created_at, updated_at
        FROM column_metadata
        WHERE table_name = $1
        ORDER BY position ASC;
      `,
      [safeTable]
    ),
    query<TableRow>(
      `SELECT * FROM "${safeTable}" ORDER BY id LIMIT $1 OFFSET $2;`,
      [limit, offset]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${safeTable}";`
    ),
  ]);

  if (tableResult.rowCount === 0) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  const metadata = tableResult.rows[0];
  let airtableColumnLookup: Map<string, ColumnSpec<any>> | null = null;

  if (metadata.source_file) {
    try {
      const definition = await findAirtableTableBySource(metadata.source_file);
      if (definition) {
        airtableColumnLookup = new Map();
        for (const column of definition.columns) {
          const displayKey = normalizeColumnLabel(String(column.name ?? ""));
          if (displayKey) airtableColumnLookup.set(displayKey, column);

          const keyKey = normalizeColumnLabel(String(column.key ?? ""));
          if (keyKey && !airtableColumnLookup.has(keyKey)) {
            airtableColumnLookup.set(keyKey, column);
          }

          const prefixedKey = normalizeColumnLabel(`col_${String(column.key ?? "")}`);
          if (prefixedKey && !airtableColumnLookup.has(prefixedKey)) {
            airtableColumnLookup.set(prefixedKey, column);
          }
        }
      }
    } catch (error) {
      console.error("Failed to enrich column metadata from Airtable definition", error);
    }
  }

  const columnSpecs = columns.rows.map((meta) => {
    const spec = toColumnSpec(meta);
    if (airtableColumnLookup) {
      const candidates = [
        normalizeColumnLabel(String(meta.display_name ?? "")),
        normalizeColumnLabel(String(meta.column_name ?? "")),
        normalizeColumnLabel(String(spec.key ?? "")),
      ].filter(Boolean);

      let match: ColumnSpec<any> | undefined;
      for (const key of candidates) {
        const found = airtableColumnLookup.get(key);
        if (found) {
          match = found;
          break;
        }
      }

      if (match) {
        spec.type = match.type;
        spec.config = match.config ? cloneConfig(match.config) : undefined;
        spec.width = match.width ?? spec.width;
        if (match.description !== undefined) spec.description = match.description;
        if (match.permissions !== undefined) spec.permissions = match.permissions;
        if (match.hidden !== undefined) spec.hidden = match.hidden;
        if (match.readOnly !== undefined) spec.readOnly = match.readOnly;
      }
    }
    return spec;
  });

  const tableRows = rowsResult.rows.map((row) => {
    const normalized: TableRow = { id: String((row as TableRow).id) };
    for (const [key, value] of Object.entries(row)) {
      if (key === "id") continue;
      normalized[key] = value;
    }
    return normalized;
  });

  return {
    table: metadata,
    columns: columnSpecs,
    rows: tableRows,
    totalRows: Number(countResult.rows[0]?.count ?? "0"),
  };
}

export async function createColumn(
  tableName: string,
  input: {
    name: string;
    type?: ColumnSpec<TableRow>["type"];
    config?: Record<string, unknown>;
    width?: number;
    position?: number;
    clientKey?: string;
  }
): Promise<ColumnSpec<TableRow>> {
  return withTransaction(async (client) => {
    const safeTable = assertSafeIdentifier(tableName);
    const currentMeta = await fetchColumnMetadata(client, safeTable);
    const existingKeys = new Set(currentMeta.map((meta) => meta.column_name));
    const columnKey = toColumnKey(input.name, existingKeys);
    const width = input.width ?? 220;
  const position =
      input.position ??
      (currentMeta.length > 0 ? currentMeta.length + 1 : 1);

    await client.query(
      `ALTER TABLE "${safeTable}" ADD COLUMN "${columnKey}" TEXT;`
    );

    await client.query(
      `
        INSERT INTO column_metadata (table_name, column_name, display_name, data_type, config, position, width)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        ON CONFLICT (table_name, column_name)
        DO UPDATE SET display_name = EXCLUDED.display_name,
                      data_type = EXCLUDED.data_type,
                      config = EXCLUDED.config,
                      position = EXCLUDED.position,
                      width = EXCLUDED.width,
                      updated_at = NOW();
      `,
      [
        safeTable,
        columnKey,
        input.name,
        input.type ?? "singleLineText",
        JSON.stringify(input.config ?? {}),
        position,
        width,
      ]
    );

    const [meta] = await fetchColumnMetadata(client, safeTable).then((rows) =>
      rows.filter((row) => row.column_name === columnKey)
    );

    emitTableChange({
      table: safeTable,
      type: "columnCreated",
      payload: { columnKey },
      timestamp: new Date().toISOString(),
    });

    return toColumnSpec(meta);
  });
}

export async function updateColumn(
  tableName: string,
  columnKey: string,
  input: {
    name?: string;
    type?: ColumnSpec<TableRow>["type"];
    config?: Record<string, unknown>;
    width?: number;
  }
): Promise<ColumnSpec<TableRow>> {
  return withTransaction(async (client) => {
    const safeTable = assertSafeIdentifier(tableName);
    const safeColumn = assertSafeIdentifier(columnKey);

    const { rowCount } = await client.query(
      `
        UPDATE column_metadata
        SET
          display_name = COALESCE($3, display_name),
          data_type = COALESCE($4, data_type),
          config = COALESCE($5::jsonb, config),
          width = COALESCE($6, width),
          updated_at = NOW()
        WHERE table_name = $1 AND column_name = $2;
      `,
      [
        safeTable,
        safeColumn,
        input.name ?? null,
        input.type ?? null,
        input.config ? JSON.stringify(input.config) : null,
        input.width ?? null,
      ]
    );

    if (rowCount === 0) {
      throw new Error(`Column ${columnKey} not found on ${tableName}`);
    }

    const [meta] = await fetchColumnMetadata(client, safeTable).then((rows) =>
      rows.filter((row) => row.column_name === columnKey)
    );

    emitTableChange({
      table: safeTable,
      type: "columnUpdated",
      payload: { columnKey },
      timestamp: new Date().toISOString(),
    });

    return toColumnSpec(meta);
  });
}

export async function reorderColumns(
  tableName: string,
  order: string[]
) {
  return withTransaction(async (client) => {
    const safeTable = assertSafeIdentifier(tableName);
    const safeOrder = order.map(assertSafeIdentifier);

    for (let index = 0; index < safeOrder.length; index += 1) {
      await client.query(
        `
          UPDATE column_metadata
          SET position = $3, updated_at = NOW()
          WHERE table_name = $1 AND column_name = $2;
        `,
        [safeTable, safeOrder[index], index + 1]
      );
    }

    emitTableChange({
      table: safeTable,
      type: "columnReordered",
      payload: { columnKeys: safeOrder },
      timestamp: new Date().toISOString(),
    });
  });
}

export async function deleteColumn(tableName: string, columnKey: string) {
  return withTransaction(async (client) => {
    const safeTable = assertSafeIdentifier(tableName);
    const safeColumn = assertSafeIdentifier(columnKey);

    await client.query(
      `ALTER TABLE "${safeTable}" DROP COLUMN IF EXISTS "${safeColumn}";`
    );

    await client.query(
      `DELETE FROM column_metadata WHERE table_name = $1 AND column_name = $2;`,
      [safeTable, safeColumn]
    );

    emitTableChange({
      table: safeTable,
      type: "columnDeleted",
      payload: { columnKey: safeColumn },
      timestamp: new Date().toISOString(),
    });
  });
}

export async function createRow(
  tableName: string,
  values: Record<string, unknown>
): Promise<TableRow> {
  const safeTable = assertSafeIdentifier(tableName);
  const columns = Object.keys(values)
    .filter((key) => key !== "id")
    .map(assertSafeIdentifier);

  const dataValues = columns.map((key) => normalizeValue(values[key]));
  const id = randomUUID();

  const columnSql =
    columns.length > 0 ? `, ${columns.map((c) => `"${c}"`).join(", ")}` : "";
  const valuePlaceholders = columns
    .map((_, index) => `$${index + 2}`)
    .join(", ");
  const valuesSql = columns.length > 0 ? `, ${valuePlaceholders}` : "";

  const result = await query<TableRow>(
    `
      INSERT INTO "${safeTable}" (id${columnSql})
      VALUES ($1${valuesSql})
      RETURNING *;
    `,
    [id, ...dataValues]
  );

  const row = result.rows[0];
  const normalized: TableRow = { id: String(row.id) };
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") continue;
    normalized[key] = value;
  }

  emitTableChange({
    table: safeTable,
    type: "rowCreated",
    payload: { rowId: normalized.id, values },
    timestamp: new Date().toISOString(),
  });

  return normalized;
}

export async function updateRow(
  tableName: string,
  rowId: string,
  values: Record<string, unknown>
): Promise<TableRow> {
  const safeTable = assertSafeIdentifier(tableName);
  const id = rowId;
  const entries = Object.entries(values).filter(
    ([key]) => key !== "id" && SAFE_IDENTIFIER.test(key)
  );

  if (!entries.length) {
    const existing = await query<TableRow>(
      `SELECT * FROM "${safeTable}" WHERE id = $1;`,
      [id]
    );
    if (existing.rowCount === 0) {
      throw new Error(`Row ${rowId} not found`);
    }
    return existing.rows[0];
  }

  const sets = entries.map(
    ([key], index) => `"${assertSafeIdentifier(key)}" = $${index + 2}`
  );
  const params = [id, ...entries.map(([, value]) => normalizeValue(value))];

  const result = await query<TableRow>(
    `
      UPDATE "${safeTable}"
      SET ${sets.join(", ")}
      WHERE id = $1
      RETURNING *;
    `,
    params
  );

  if (result.rowCount === 0) {
    throw new Error(`Row ${rowId} not found`);
  }

  const row = result.rows[0];
  const normalized: TableRow = { id: String(row.id) };
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") continue;
    normalized[key] = value;
  }

  emitTableChange({
    table: safeTable,
    type: "rowUpdated",
    payload: { rowId: normalized.id, values },
    timestamp: new Date().toISOString(),
  });

  return normalized;
}

export async function deleteRow(tableName: string, rowId: string) {
  const safeTable = assertSafeIdentifier(tableName);
  await query(`DELETE FROM "${safeTable}" WHERE id = $1;`, [rowId]);
  emitTableChange({
    table: safeTable,
    type: "rowDeleted",
    payload: { rowId },
    timestamp: new Date().toISOString(),
  });
}
