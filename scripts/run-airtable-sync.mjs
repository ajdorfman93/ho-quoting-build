#!/usr/bin/env node
import { register } from "node:module";
import { argv, exit } from "node:process";

register("ts-node/esm", import.meta.url);

const { syncAirtableBase } = await import("../utils/airtableSync.ts");

function readFlag(name) {
  const prefix = `--${name}=`;
  const match = argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

try {
  const result = await syncAirtableBase({
    baseId: readFlag("baseId"),
    projectTag: readFlag("projectTag"),
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  exit(1);
}
