#!/usr/bin/env node

import { argv, exit } from "node:process";
import { syncAirtableBase } from "../utils/airtableSync.ts";

async function main() {
  const baseIdArg =
    argv.find((value) => value.startsWith("--baseId="))?.split("=")[1] ?? null;
  const projectTagArg =
    argv
      .find((value) => value.startsWith("--projectTag="))
      ?.split("=")[1] ?? null;

  const result = await syncAirtableBase({
    baseId: baseIdArg ?? undefined,
    projectTag: projectTagArg ?? undefined,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  exit(1);
});
