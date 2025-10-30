import { loadAirtableProject } from "../utils/airtableLoader";

async function main() {
  const project = await loadAirtableProject();
  console.log('tables', project.tables.length);
  console.log(project.tables.map((t) => t.name));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
