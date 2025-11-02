/**
 * airtable-list-tables.js
 * Node.js (CommonJS) script to list all tables in an Airtable base via the Metadata API.
 *
 * Usage (PowerShell):
 *   # Option A: Use .env.local (or .env) in this folder
 *   node airtable-list-tables.js
 *
 *   # Option B: Set env vars inline then run
 *   $Env:BASE_ID="appIBydxpXuSdssZW"
 *   $Env:AIRTABLE_ACCESS_TOKEN="pat_...your token..."
 *   node airtable-list-tables.js
 *
 * Requires Node 18+ (global fetch). If you're on Node <18, install 'undici':
 *   npm i undici
 */

import fs from "node:fs";
import path from "node:path";

// --- Load env from .env.local or .env if present (optional) ---
(async () => {
  try {
    const dotenvLocal = path.resolve(process.cwd(), ".env.local");
    const dotenvFile = path.resolve(process.cwd(), ".env");
    const hasLocal = fs.existsSync(dotenvLocal);
    const hasEnv = fs.existsSync(dotenvFile);

    if (hasLocal || hasEnv) {
      // Dynamic import dotenv only if a file exists; keeps it optional
      const { default: dotenv } = await import("dotenv");
      const chosen = hasLocal ? dotenvLocal : dotenvFile;
      const result = dotenv.config({ path: chosen });
      if (result.error) {
        console.warn("Couldn't parse env file:", chosen, result.error.message);
      } else {
        console.log(`Loaded env from ${chosen}`);
      }
    }
  } catch (e) {
    console.warn("dotenv not installed; continuing without it. (npm i dotenv)");
  }
})();

// --- Ensure fetch is available (Node <18 fallback to undici) ---
(async () => {
  if (typeof fetch !== "function") {
    try {
      const { fetch: undiciFetch } = await import("undici");
      global.fetch = undiciFetch;
      console.log("Using undici fetch polyfill.");
    } catch (_e) {
      console.error(
        "This script needs global fetch. Install undici (npm i undici) or use Node 18+."
      );
      process.exit(1);
    }
  }
})().catch(() => {});

/** @typedef {{ id:string, name:string, type:string, options?:unknown }} AirtableTableField */
/** @typedef {{ id:string, name:string, description?:string|null, fields:AirtableTableField[], primaryFieldId:string }} AirtableTable */

const AIRTABLE_API = "https://api.airtable.com/v0";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function maskToken(token) {
  if (!token) return "********";
  if (token.length <= 10) return "********";
  return token.slice(0, 4) + "…" + token.slice(-4);
}

async function fetchJson(url, token) {
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
    return JSON.parse(text);
  } catch (_e) {
    throw new Error(`Failed to parse JSON from Airtable.\nBody: ${text}`);
  }
}

async function listTables(baseId, token) {
  const url = `${AIRTABLE_API}/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const json = await fetchJson(url, token);

  if (!json || typeof json !== "object" || !("tables" in json)) {
    throw new Error(
      `Unexpected response shape (no "tables" key). Full JSON:\n${JSON.stringify(json, null, 2)}`
    );
  }
  const { tables } = json;
  if (!Array.isArray(tables)) {
    throw new Error(
      `Unexpected "tables" type (expected array). Full JSON:\n${JSON.stringify(json, null, 2)}`
    );
  }
  return tables; // Array of tables
}

function printTables(tables) {
  if (!tables.length) {
    console.log("No tables found.");
    return;
  }

  console.log(`Found ${tables.length} table(s):`);
  for (const t of tables) {
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

(async function main() {
  try {
    const baseId = requireEnv("BASE_ID"); // e.g., appIBydxpXuSdssZW
    const token = requireEnv("AIRTABLE_ACCESS_TOKEN"); // PAT with schema.bases:read

    console.log("Diagnostics:");
    console.log("  BASE_ID:", baseId);
    console.log("  AIRTABLE_ACCESS_TOKEN:", maskToken(token), "\n");

    const tables = await listTables(baseId, token);
    printTables(tables);
  } catch (err) {
    console.error("\nFailed to list tables.");
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
