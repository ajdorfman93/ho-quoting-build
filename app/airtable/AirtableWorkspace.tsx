"use client";

import * as React from "react";
import {
  InteractiveGrid,
  type InteractiveGridState,
} from "@/app/components/InteractiveGridDemo";
import type {
  AirtableProject,
  AirtableTableDefinition,
  AirtableAutomation,
  FieldRelationship,
} from "@/utils/airtableLoader";

type TableRow = AirtableTableDefinition["rows"][number];
type TableState = InteractiveGridState<TableRow>;

const NAV_ITEMS = [
  { id: "data", label: "Data" },
  { id: "automations", label: "Automations" },
  { id: "interfaces", label: "Interfaces" },
  { id: "forms", label: "Forms" }
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["id"];

export default function AirtableWorkspace({ project }: { project: AirtableProject }) {
  const [activeNav, setActiveNav] = React.useState<NavKey>("data");
  const [activeTableSlug, setActiveTableSlug] = React.useState<string | null>(
    project.tables[0]?.slug ?? null
  );

  const initialState = React.useMemo<Record<string, TableState>>(() => {
    const entries = project.tables.map((table) => [
      table.slug,
      { rows: table.rows, columns: table.columns }
    ]);
    return Object.fromEntries(entries);
  }, [project.tables]);

  const [tableStates, setTableStates] = React.useState<Record<string, TableState>>(initialState);

  React.useEffect(() => {
    setTableStates(initialState);
    if (project.tables.length && !project.tables.some((table) => table.slug === activeTableSlug)) {
      setActiveTableSlug(project.tables[0]?.slug ?? null);
    }
  }, [project.tables, initialState, activeTableSlug]);

  const activeTable = React.useMemo<AirtableTableDefinition | null>(() => {
    if (!activeTableSlug) return null;
    return project.tables.find((table) => table.slug === activeTableSlug) ?? null;
  }, [project.tables, activeTableSlug]);

  const tableView = React.useMemo(() => {
    if (!activeTable) return null;
    const state = tableStates[activeTable.slug] ?? {
      rows: activeTable.rows,
      columns: activeTable.columns
    };
    return {
      state,
      onChange(next: TableState) {
        setTableStates((prev) => ({ ...prev, [activeTable.slug]: next }));
      }
    };
  }, [activeTable, tableStates]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200/70 bg-white/80 dark:border-neutral-800 dark:bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 md:px-10 lg:px-16">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 dark:text-neutral-400">
                Airtable workspace rebuild
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {project.tables.length ? project.tables[0].name : "Reconstructed Base"}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-neutral-300">
                Using exported JSON & automation scripts ({new Date(project.lastGenerated).toLocaleString()}).
              </p>
            </div>
            <nav className="flex gap-2 rounded-full border border-zinc-200 bg-white/70 p-1 text-sm font-medium text-zinc-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300" aria-label="Workspace navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id)}
                    className={`rounded-full px-4 py-1.5 transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow"
                        : "hover:bg-zinc-100 dark:hover:bg-neutral-800"
                    }`}
                    aria-pressed={isActive}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          {activeNav === "data" ? (
            <div
              className="appControlsContainer flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white/80 p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80"
              aria-label="Tables within this Airtable base"
            >
              {project.tables.map((table) => {
                const isActive = table.slug === activeTableSlug;
                return (
                  <button
                    key={table.slug}
                    type="button"
                    onClick={() => setActiveTableSlug(table.slug)}
                    className={`rounded-xl px-3 py-1.5 transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    }`}
                    aria-pressed={isActive}
                  >
                    {table.name}
                    {table.viewName ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        {table.viewName}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-16">
        {activeNav === "data" && activeTable && tableView ? (
          <DataPanel
            table={activeTable}
            state={tableView.state}
            setState={tableView.onChange}
          />
        ) : null}

        {activeNav === "automations" ? (
          <AutomationsPanel automations={project.automations} />
        ) : null}

        {activeNav === "interfaces" ? (
          <InterfacesPanel tables={project.tables} />
        ) : null}

        {activeNav === "forms" ? (
          <FormsPanel tables={project.tables} />
        ) : null}
      </main>
    </div>
  );
}

function DataPanel({
  table,
  state,
  setState
}: {
  table: AirtableTableDefinition;
  state: TableState;
  setState: (next: TableState) => void;
}) {
  const aggregatedFormatting = React.useMemo(() => {
    return Array.from(
      new Set(table.fieldMeta.flatMap((meta) => meta.formattingRules.filter(Boolean)))
    );
  }, [table.fieldMeta]);

  const relationshipGroups = React.useMemo(() => {
    const req: Record<string, FieldRelationship[]> = {};
    table.relationships.forEach((rel) => {
      const key = rel.targetTable ?? "Unknown target";
      if (!req[key]) req[key] = [];
      req[key].push(rel);
    });
    return Object.entries(req).map(([target, rels]) => ({ target, rels }));
  }, [table.relationships]);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
      <div className="rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-950/70">
        <InteractiveGrid
          key={table.slug}
          initialRows={state.rows}
          initialColumns={state.columns}
          classNames={{ container: "flex flex-col gap-4" }}
          onStateChange={setState}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300">
            Table snapshot
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-neutral-300">
            <li>
              <strong className="text-zinc-900 dark:text-neutral-100">Rows:</strong>{" "}
              {table.summary.rowCount.toLocaleString()}
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-neutral-100">Fields:</strong>{" "}
              {table.summary.fieldCount}
            </li>
            {table.summary.primaryIdField ? (
              <li>
                <strong className="text-zinc-900 dark:text-neutral-100">Primary ID:</strong>{" "}
                {table.summary.primaryIdField}
              </li>
            ) : null}
            <li>
              <strong className="text-zinc-900 dark:text-neutral-100">Linked fields:</strong>{" "}
              {table.summary.linkedFieldCount}
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-neutral-100">Select fields:</strong>{" "}
              {table.summary.selectFieldCount}
            </li>
          </ul>
        </div>

        {relationshipGroups.length ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 shadow-sm dark:border-blue-900/70 dark:bg-blue-900/30">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Linked record relationships
            </h2>
            <div className="mt-3 space-y-3 text-sm text-blue-900 dark:text-blue-100">
              {relationshipGroups.map((group) => (
                <div key={group.target}>
                  <p className="font-semibold">{group.target}</p>
                  <ul className="mt-1 space-y-1 pl-4">
                    {group.rels.map((rel) => (
                      <li key={rel.fieldName}>
                        <span className="font-medium">{rel.fieldName}</span>
                        <span className="ml-1 text-xs uppercase tracking-wide text-blue-600/70 dark:text-blue-200/80">
                          ({(rel.confidence * 100).toFixed(0)}% confidence)
                        </span>
                        <div className="text-xs leading-5">{rel.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {aggregatedFormatting.length ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-900/30">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Data formatting rules
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
              {aggregatedFormatting.map((rule) => (
                <li key={rule}>• {rule}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <FieldInsights fieldMeta={table.fieldMeta} />
      </aside>
    </section>
  );
}

function FieldInsights({ fieldMeta }: { fieldMeta: AirtableTableDefinition["fieldMeta"] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300">
        Field insights
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-neutral-400">
        Inferred field types, usage hints, and computed/linked relationships.
      </p>
      <div className="mt-3 flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {fieldMeta.map((meta) => (
          <details
            key={meta.key}
            className="rounded-xl border border-zinc-200 bg-white/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/70"
          >
            <summary className="cursor-pointer select-none">
              <span className="font-medium text-zinc-900 dark:text-neutral-100">{meta.originalName}</span>
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-600 dark:bg-neutral-800 dark:text-neutral-300">
                {meta.type}
              </span>
              {meta.isPrimaryId ? (
                <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                  Primary ID
                </span>
              ) : null}
            </summary>
            <dl className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-neutral-300">
              <div className="flex justify-between">
                <dt>Samples</dt>
                <dd className="text-right">
                  {meta.sampleValues.length
                    ? meta.sampleValues.map((value) => `"${truncate(value, 32)}"`).join(", ")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Unique values</dt>
                <dd>{meta.uniqueValueCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Empty rows</dt>
                <dd>{meta.emptyCount}</dd>
              </div>
              {meta.notes.length ? (
                <div>
                  <dt>Notes</dt>
                  <dd className="mt-1 space-y-1">
                    {meta.notes.map((note, idx) => (
                      <p key={idx}>• {note}</p>
                    ))}
                  </dd>
                </div>
              ) : null}
              {meta.relationship ? (
                <div className="rounded-lg bg-blue-50 px-2 py-1 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                  {meta.relationship.description}
                </div>
              ) : null}
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}

function AutomationsPanel({ automations }: { automations: AirtableAutomation[] }) {
  if (!automations.length) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white/80 p-8 text-sm text-zinc-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-300">
        No automation scripts were found under <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-neutral-800">airtable/js</code>.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {automations.map((automation) => (
        <article
          key={automation.fileName}
          className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950/80"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-neutral-50">{automation.name}</h2>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-neutral-400">
                {automation.fileName}
              </p>
            </div>
            <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {automation.tablesInvolved.length} table{automation.tablesInvolved.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-neutral-300">
            {automation.trigger ? (
              <p>
                <strong className="text-zinc-900 dark:text-neutral-100">Trigger:</strong>{" "}
                {automation.trigger}
              </p>
            ) : null}
            {automation.actions.length ? (
              <div>
                <strong className="text-zinc-900 dark:text-neutral-100">Actions:</strong>
                <ul className="mt-1 space-y-1 pl-4">
                  {automation.actions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {automation.tablesInvolved.length ? (
              <p>
                <strong className="text-zinc-900 dark:text-neutral-100">Tables touched:</strong>{" "}
                {automation.tablesInvolved.join(", ")}
              </p>
            ) : null}
            <p className="rounded-xl bg-zinc-100/80 px-3 py-2 text-xs text-zinc-500 dark:bg-neutral-800/80 dark:text-neutral-300">
              {automation.scriptSummary}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

function InterfacesPanel({ tables }: { tables: AirtableTableDefinition[] }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-neutral-50">Suggested interfaces</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-neutral-300">
        The Airtable export does not include Interface Designer layouts. Based on field composition and linked record density,
        here are suggested interface canvases to recreate manually.
      </p>
      <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-neutral-300">
        {tables.map((table) => (
          <li
            key={table.slug}
            className="rounded-2xl border border-zinc-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/70"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-zinc-900 dark:text-neutral-100">{table.name}</span>
              <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-neutral-400">
                {table.summary.linkedFieldCount} linked field{table.summary.linkedFieldCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5">
              Build a record review interface that highlights key fields ({table.fieldMeta
                .slice(0, 4)
                .map((meta) => meta.originalName)
                .join(", ")}
              ) and includes quick access to linked records and any percent/currency metrics.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormsPanel({ tables }: { tables: AirtableTableDefinition[] }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-neutral-50">Forms</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-neutral-300">
        No direct form definitions were exported. Use the suggestions below to recreate submission forms using required fields
        and helpful defaults.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {tables.map((table) => {
          const requiredCandidates = table.fieldMeta
            .filter((meta) => meta.type !== "formula" && meta.type !== "rollup" && meta.type !== "lookup")
            .slice(0, 5)
            .map((meta) => meta.originalName);
          return (
            <article
              key={table.slug}
              className="rounded-2xl border border-zinc-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/70"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-neutral-100">{table.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-neutral-400">
                Recommended required fields
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs leading-5">
                {requiredCandidates.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-500 dark:text-neutral-400">
                Add helper text describing formatting rules and enforce linked record lookups before submission.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  const trimmedLength = Math.max(0, length - 3);
  return `${value.slice(0, trimmedLength)}...`;
}
