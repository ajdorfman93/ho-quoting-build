"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { syncAirtableBase } = require("../utils/airtableSync");

async function main() {
  const result = await syncAirtableBase({
    baseId: "appIBydxpXuSdssZW",
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
