import AirtableWorkspace from "./AirtableWorkspace";
import { loadAirtableProject } from "@/utils/airtableLoader";

export const dynamic = "force-dynamic";

export default async function AirtablePage() {
  const project = await loadAirtableProject();

  return <AirtableWorkspace project={project} />;
}
