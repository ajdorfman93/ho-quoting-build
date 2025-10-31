#!/usr/bin/env node
const path = require("node:path");
const { argv, exit } = require("node:process");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "../");
const envLocal = path.join(root, ".env.local");
const env = path.join(root, ".env");

if (!dotenv.config({ path: envLocal }).parsed) {
  dotenv.config({ path: env });
}

require("ts-node").register({
  compilerOptions: {
    module: "Node16",
    moduleResolution: "node16",
  },
  transpileOnly: true,
});

const { syncAirtableBase } = require("../utils/airtableSync.ts");

function readFlag(name) {
  const prefix = `--${name}=`;
  const match = argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function main() {
  const result = await syncAirtableBase({
    baseId: readFlag("baseId"),
    projectTag: readFlag("projectTag"),
  });

  console.log(JSON.stringify(result, null, 2));
  exit(0);
}

main().catch((error) => {
  console.error(error);
  exit(1);
});
