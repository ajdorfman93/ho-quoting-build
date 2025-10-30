import {
  Pool,
  PoolClient,
  QueryConfig,
  QueryResult,
  QueryResultRow,
  QueryConfigValues,
} from "pg";

type GlobalWithPool = typeof globalThis & {
  __neonPool?: Pool;
};

const globalWithPool = globalThis as GlobalWithPool;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL env var must be defined");
}

const pool =
  globalWithPool.__neonPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
  });

if (!globalWithPool.__neonPool) {
  globalWithPool.__neonPool = pool;
}

export async function query<
  R extends QueryResultRow = QueryResultRow,
  I extends any[] = any[]
>(
  text: string | QueryConfig<I>,
  params?: QueryConfigValues<I>
): Promise<QueryResult<R>> {
  if (typeof text === "string") {
    return pool.query<R, I>(text, params);
  }

  return pool.query<R, I>(text);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type DatabaseColumn = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  udt_name: string;
};

export async function getTableColumns(
  client: PoolClient,
  tableName: string
): Promise<DatabaseColumn[]> {
  const { rows } = await client.query<DatabaseColumn>(
    `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `,
    [tableName]
  );

  return rows;
}

export async function ensureExtensions(client: PoolClient) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
}
