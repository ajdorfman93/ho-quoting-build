/**
 * Robust Airtable schema lister with dotenv + diagnostics.
 * Usage:
 *   # Option A: env vars in your shell
 *   BASE_ID=appIBydxpXuSdssZW AIRTABLE_ACCESS_TOKEN=pat_... ts-node airtable-list-tables.ts
 *
 *   # Option B: .env or .env.local file next to this script
 *   ts-node airtable-list-tables.ts
 */

import fs from "node:fs";
import path from "node:path";

// --- Load env from .env.local or .env if present ---
try {
  const dotenvPathLocal = path.resolve(process.cwd(), ".env.local");
  const dotenvPath = path.resolve(process.cwd(), ".env");
  // lazy-load dotenv only if a file exists (avoids dep if you don't use it)
  if (fs.existsSync(dotenvPathLocal) || fs.existsSync(dotenvPath)) {
    const { config } = await import("dotenv");
    const chosen = fs.existsSync(dotenvPathLocal) ? dotenvPathLocal : dotenvPath;
    const result = config({ path: chosen });
    if (result.error) {
      console.warn("Couldn't parse env file:", chosen, result.error.message);
    } else {
      console.log(`Loaded env from ${chosen}`);
    }
  }
} catch (e) {
  console.warn("dotenv not installed; continuing without it. (npm i -D dotenv)");
}

type AirtableTableField = {
  id: string;
  name: string;
  type: string;
  options?: unknown;
};

type AirtableTable = {
  id: string;
  name: string;
  description?: string | null;
  fields: AirtableTableField[];
  primaryFieldId: string;
};

type AirtableTablesResponse =
  | { tables: AirtableTable[] }
  | { error?: { type?: string; message?: string } }
  | Record<string, unknown>;

const AIRTABLE_API = "https://api.airtable.com/v0";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function maskToken(token: string) {
  if (token.length <= 10) return "********";
  return token.slice(0, 4) + "…" + token.slice(-4);
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText}\nURL: ${url}\nBody: ${text || "<empty>"}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Failed to parse JSON from Airtable.\nBody: ${text}`);
  }
}

async function listTables(baseId: string, token: string): Promise<AirtableTable[]> {
  const url = `${AIRTABLE_API}/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const json = await fetchJson<AirtableTablesResponse>(url, token);

  // Validate shape before using it
  if (!json || typeof json !== "object" || !("tables" in json)) {
    throw new Error(
      `Unexpected response shape (no "tables" key). Full JSON:\n${JSON.stringify(json, null, 2)}`
    );
  }

  const tables = (json as { tables: unknown }).tables;
  if (!Array.isArray(tables)) {
    throw new Error(
      `Unexpected "tables" type (expected array). Full JSON:\n${JSON.stringify(json, null, 2)}`
    );
  }

  return tables as AirtableTable[];
}

function printTables(tables: AirtableTable[]) {
  if (tables.length === 0) {
    console.log("No tables found.");
    return;
  }

  console.log(`Found ${tables.length} table(s):`);
  for (const t of tables) {
    // No array indexing without checks; just print safe props
    console.log(`- ${t.name} (${t.id})`);
  }

  console.log("\n--- JSON summary ---");
  console.log(
    JSON.stringify(
      tables.map(({ id, name, fields, primaryFieldId, description }) => ({
        id,
        name,
        description: description ?? null,
        primaryFieldId,
        fieldCount: Array.isArray(fields) ? fields.length : 0,
      })),
      null,
      2
    )
  );
}

async function main() {
  try {
    const baseId = requireEnv("BASE_ID"); // e.g., appIBydxpXuSdssZW
    const token = requireEnv("AIRTABLE_ACCESS_TOKEN"); // PAT with schema.bases:read

    // Quick diagnostics
    console.log("Diagnostics:");
    console.log("  BASE_ID:", baseId);
    console.log("  AIRTABLE_ACCESS_TOKEN:", maskToken(token), "\n");

    const tables = await listTables(baseId, token);
    printTables(tables);
  } catch (err) {
    console.error("\nFailed to list tables.");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
