# AI Agents

The HO Quoting rebuild uses a single AI surface today: the **Field agents** menu that is embedded in the interactive grid toolbar. It is designed to provide one-click entry points into common assistant workflows that accelerate the data plumbing documented in `.notes.txt` (attachment analysis, prototype generation, dataset exploration, etc.).

The menu is defined in `utils/tableUtils.ts` (`FIELD_AGENT_ACTIONS`) and rendered for every instance of the shared table component that both `app/page.tsx` and `app/airtable/page.tsx` consume. Each entry captures the intent, iconography, and copy that is shown to the user.

> 2025-10-30 — The `/airtable` route now renders the same Neon-backed `InteractiveGridDemo` that powers the home page. No local JSON is loaded; all reads and writes flow through the `/api/tables/*` endpoints and the Neon `column_metadata` / `column_type_settings` tables. Keep this in mind when wiring new agent behaviors—the two surfaces are functionally identical.

## Agent Catalog

| ID | Label | Purpose | Current behavior |
| --- | --- | --- | --- |
| `analyze-attachment` | Analyze attachment | Summarise uploaded files to speed up QA on drawings and specifications. | Logs a selection event (`console.info`) that can be replaced with a callout to a document-understanding endpoint. |
| `research-companies` | Research companies | Pull up-to-date intel and contacts for records that reference external organisations. | Selection logs only; intended to call a search/enrichment workflow. |
| `find-image-from-web` | Find image from web | Source reference imagery for design and hardware items linked to the current record. | Logs selection. |
| `generate-image` | Generate image | Produce on-brand visual studies or mockups for a record. | Logs selection. |
| `deep-match` | Deep match | Compare requirements in the active view against existing assets to surface best-fit matches. | Logs selection. |
| `build-prototype` | Build prototype | Draft interactive prototypes (e.g. form or interface shells) that align with the selected data slice. | Logs selection. |
| `build-field-agent` | Build a field agent | Scaffold a specialised agent that can automate recurring steps for the active workflow. | Logs selection. |
| `browse-catalog` | Browse catalog | Navigate reusable templates or component kits that relate to the selected rows. | Logs selection. |

## Implementation Notes

- **UI wiring** – Each action is rendered inside the shared table component. The toolbar owns the open/close state, search filtering, and dropdown placement logic (`fieldAgentsOpen`, `fieldAgentsMenuRef`, `useAutoDropdownPlacement`).
- **Selection handler** – `handleFieldAgentSelect` lives in `utils/tableUtils.ts`. It currently closes the menu, resets the search, records the last action label, and emits a `console.info` trace (`Field agent action selected: ${action.id}`).
- **State echo** – After an action fires, the toolbar displays a “Last action” pill so users—and telemetry—can see the most recent automation request.
- **Extensibility** – Extend `FIELD_AGENT_ACTIONS` or adjust the `FieldAgentAction` type to add/remove capabilities. Downstream integrations should replace the console log with real adapters (REST, GraphQL, queue dispatch, etc.) and handle optimistic UI state if the action performs long-running work.
- **Styling** – The button and dropdown inherit the shared table theming pipeline (dark mode, spacing, border radii), so the same component instance in `app/page.tsx` and `app/airtable/page.tsx` render identically.
- **Neon parity** – Any agent experiments can target either route. Column type updates, schema mutations, and row edits replicate instantly via server-sent events, so treat `/airtable` as a second entry point rather than a sandbox backed by JSON.

## Integration Checklist

To hook an action into a real agent backend:

1. Replace the `console.info` inside `handleFieldAgentSelect` with a call into your orchestration layer (REST request, message bus, or direct SDK).
2. Surface progress to the user (spinner, toast, etc.) by updating the local React state that powers the toolbar.
3. Capture the agent response in the table context—e.g. write back enriched fields, open a side panel with summaries, or push a modal for prototype previews.
4. Add server-side telemetry so selections can be audited alongside the automation rules described in `.notes.txt`.
