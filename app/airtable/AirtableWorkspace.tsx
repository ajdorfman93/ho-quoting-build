"use client";

import * as React from "react";
import {
  InteractiveGrid,
  type InteractiveGridState,
} from "@/app/components/InteractiveGridDemo";
import type {
  AirtableAutomation,
  AirtableProject,
  AirtableTableDefinition,
} from "@/utils/airtableLoader";
import {
  FaBars,
  FaCheckSquare,
  FaChevronDown,
  FaChevronUp,
  FaCircle,
  FaEyeSlash,
  FaFilter,
  FaFolderPlus,
  FaLayerGroup,
  FaLink,
  FaListUl,
  FaPalette,
  FaHistory,
  FaPlus,
  FaSearch,
  FaShareAlt,
  FaSortAmountDown,
  FaThLarge,
  FaUndoAlt,
  FaRocket,
} from "react-icons/fa";

type TableRow = AirtableTableDefinition["rows"][number];
type TableState = InteractiveGridState<TableRow>;

const NAV_ITEMS = [
  { id: "data", label: "Data" },
  { id: "automations", label: "Automations" },
  { id: "interfaces", label: "Interfaces" },
  { id: "forms", label: "Forms" },
] as const;

const WORKSPACE_NAME = "HO Quoting Portal";
const WORKSPACE_BADGE = "TEST";

const INITIAL_ROW_BATCH_SIZE = 200;
const ROW_BATCH_SIZE = 200;

type NavKey = (typeof NAV_ITEMS)[number]["id"];

type ViewItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AirtableWorkspace({ project }: { project: AirtableProject }) {
  const [activeNav, setActiveNav] = React.useState<NavKey>("data");
  const [activeTableSlug, setActiveTableSlug] = React.useState<string | null>(
    project.tables[0]?.slug ?? null,
  );

  const initialState = React.useMemo<Record<string, TableState>>(() => {
    const entries = project.tables.map((table) => [
      table.slug,
      {
        rows: table.rows.slice(0, Math.min(INITIAL_ROW_BATCH_SIZE, table.rows.length)),
        columns: table.columns,
      },
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
      columns: activeTable.columns,
    };
    return {
      state,
      onChange(next: TableState) {
        setTableStates((prev) => ({ ...prev, [activeTable.slug]: next }));
      },
    };
  }, [activeTable, tableStates]);

  return (
    <div className="flex min-h-screen flex-col bg-[#050b15] text-slate-100">
      <WorkspaceHeader
        activeNav={activeNav}
        onNavChange={setActiveNav}
        lastGenerated={project.lastGenerated}
      />

      <main className="flex flex-1 flex-col gap-5 overflow-hidden px-4 py-6 md:px-8 lg:px-12">
        {activeNav === "data" && activeTable && tableView ? (
          <DataPanel
            tables={project.tables}
            table={activeTable}
            state={tableView.state}
            setState={tableView.onChange}
            activeTableSlug={activeTable.slug}
            onSelectTable={(slug) => setActiveTableSlug(slug)}
          />
        ) : null}

        {activeNav === "automations" ? (
          <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-900 bg-[#0b1324]/90 p-6 shadow-[0_24px_48px_rgba(2,8,20,0.45)]">
            <AutomationsPanel automations={project.automations} />
          </section>
        ) : null}

        {activeNav === "interfaces" ? (
          <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-900 bg-[#0b1324]/90 p-6 shadow-[0_24px_48px_rgba(2,8,20,0.45)]">
            <InterfacesPanel tables={project.tables} />
          </section>
        ) : null}

        {activeNav === "forms" ? (
          <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-900 bg-[#0b1324]/90 p-6 shadow-[0_24px_48px_rgba(2,8,20,0.45)]">
            <FormsPanel tables={project.tables} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function WorkspaceHeader({
  activeNav,
  onNavChange,
  lastGenerated,
}: {
  activeNav: NavKey;
  onNavChange: (next: NavKey) => void;
  lastGenerated: string;
}) {
  const formattedTimestamp = React.useMemo(() => {
    const parsed = new Date(lastGenerated);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString();
  }, [lastGenerated]);

  return (
    <header className="border-b border-slate-900 bg-[#0f172a] shadow-[0_18px_36px_rgba(4,16,36,0.65)]">
      <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600 text-sm font-semibold text-white shadow-lg">
            AT
          </div>
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-100">
              {WORKSPACE_NAME}
              <span className="rounded-md bg-[#12203b] px-2 py-0.5 text-xs font-medium text-slate-300">
                {WORKSPACE_BADGE}
              </span>
              <FaChevronDown className="h-3 w-3 text-slate-500" aria-hidden />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Reconstructed base{formattedTimestamp ? ` \u2022 ${formattedTimestamp}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <FaShareAlt className="h-3.5 w-3.5" aria-hidden />
            Share
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <FaRocket className="h-3.5 w-3.5" aria-hidden />
            Launch
          </button>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:px-8 lg:px-12">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeNav;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange(item.id)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                isActive
                  ? "bg-slate-200 text-slate-900 shadow"
                  : "bg-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
              )}
              aria-pressed={isActive}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function DataPanel({
  tables,
  table,
  state,
  setState,
  activeTableSlug,
  onSelectTable,
}: {
  tables: AirtableTableDefinition[];
  table: AirtableTableDefinition;
  state: TableState;
  setState: (next: TableState) => void;
  activeTableSlug: string;
  onSelectTable: (slug: string) => void;
}) {
  const [viewQuery, setViewQuery] = React.useState("");
  const [collapsedSidebar, setCollapsedSidebar] = React.useState(false);
  const [loadingRows, setLoadingRows] = React.useState(false);
  const gridClassNames = React.useMemo(
    () => ({
      container:
        "flex flex-1 flex-col overflow-hidden rounded-xl border border-[#121c34] bg-[#0c152a]/90 shadow-[0_30px_60px_rgba(2,8,20,0.55)]",
      headerRow:
        "flex relative bg-[#101c38] border-b border-[#16254a] text-xs font-semibold uppercase tracking-wide text-slate-300",
      headerCell:
        "relative border border-[#16254a] bg-[#101c38] text-xs font-semibold uppercase tracking-wide text-slate-200",
      cell:
        "relative border border-[#121b32] bg-[#0b1327] text-sm text-slate-100 transition-colors hover:bg-[#101c38]",
      row: "flex relative",
      plusButton:
        "rounded-full border border-slate-800 bg-[#0f1a32] px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/70",
      toolbar: "hidden",
      search: "hidden",
      selection: "border-2 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.35)]",
      contextMenu:
        "rounded-lg border border-slate-700 bg-[#0f192f] text-slate-200 shadow-[0_16px_32px_rgba(4,16,36,0.6)]",
    }),
    [],
  );

  const hasMoreRows = state.rows.length < table.rows.length;

  const handleLoadMoreRows = React.useCallback(async () => {
    if (loadingRows || !hasMoreRows) return;
    setLoadingRows(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const currentCount = state.rows.length;
      const nextCount = Math.min(currentCount + ROW_BATCH_SIZE, table.rows.length);
      if (nextCount <= currentCount) return;
      const appended = table.rows.slice(currentCount, nextCount);
      if (!appended.length) return;
      setState({
        rows: state.rows.concat(appended),
        columns: state.columns,
      });
    } finally {
      setLoadingRows(false);
    }
  }, [hasMoreRows, loadingRows, setState, state.columns, state.rows, table.rows]);

  React.useEffect(() => {
    setLoadingRows(false);
  }, [table.slug]);

  const tableShortcuts = React.useMemo(() => {
    const names = tables.slice(0, 6).map((item) => ({
      slug: item.slug,
      label: item.name,
    }));
    return names;
  }, [tables]);

  const viewItems = React.useMemo<ViewItem[]>(() => {
    const primaryView = table.viewName ?? "Grid view";
    const items: ViewItem[] = [
      {
        id: `${table.slug}-grid`,
        label: primaryView,
        icon: <FaThLarge className="h-3.5 w-3.5 text-slate-300" aria-hidden />,
        description: `${table.summary.rowCount.toLocaleString()} records`,
        badge: "Selected",
      },
    ];

    const relationships = table.relationships
      .filter((rel) => rel.targetTable)
      .slice(0, 3)
      .map((rel, index) => ({
        id: `${table.slug}-rel-${index}`,
        label: rel.targetTable as string,
        icon: <FaLink className="h-3.5 w-3.5 text-cyan-300" aria-hidden />,
        description: `Linked via ${rel.fieldName}`,
      }));
    items.push(...relationships);

    const metaHighlights = table.fieldMeta
      .filter((meta) => meta.notes.length || meta.isPrimaryId)
      .slice(0, 3)
      .map((meta, index) => ({
        id: `${table.slug}-meta-${index}`,
        label: meta.originalName,
        icon: <FaListUl className="h-3.5 w-3.5 text-slate-400" aria-hidden />,
        description: meta.notes[0] ?? meta.relationship?.description,
      }));
    items.push(...metaHighlights);

    if (!items.some((item) => item.label === "Review")) {
      items.push({
        id: `${table.slug}-review`,
        label: "Review",
        icon: <FaCheckSquare className="h-3.5 w-3.5 text-emerald-400" aria-hidden />,
        description: "QA checklist for key fields",
      });
    }

    return items;
  }, [table]);

  const filteredViewItems = React.useMemo(() => {
    const query = viewQuery.trim().toLowerCase();
    if (!query) return viewItems;
    return viewItems.filter((view) => view.label.toLowerCase().includes(query));
  }, [viewItems, viewQuery]);

  return (
    <section className="flex min-h-0 flex-1 gap-5 overflow-hidden">
      <aside
        className={cn(
          "flex w-64 min-w-[240px] flex-col overflow-hidden rounded-xl border border-slate-900 bg-[#101c38] transition-all",
          collapsedSidebar && "w-14 min-w-[56px]",
        )}
      >
        <header className="flex items-center justify-between border-b border-[#16254a] px-4 py-3 text-sm font-semibold text-slate-200">
          <span className={cn("flex items-center gap-2", collapsedSidebar && "sr-only")}>
            <FaBars className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            Views
          </span>
          <button
            type="button"
            onClick={() => setCollapsedSidebar((prev) => !prev)}
            className="inline-flex items-center rounded-md border border-transparent px-2 py-1 text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
          >
            {collapsedSidebar ? (
              <FaChevronDown className="h-3 w-3" aria-hidden />
            ) : (
              <FaChevronUp className="h-3 w-3" aria-hidden />
            )}
          </button>
        </header>
        {!collapsedSidebar ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-200"
            >
              <FaPlus className="h-3.5 w-3.5" aria-hidden />
              Create new...
            </button>
            <label className="relative block">
              <FaSearch
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                value={viewQuery}
                onChange={(event) => setViewQuery(event.target.value)}
                className="w-full rounded-lg border border-[#16254a] bg-[#0b152b] py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Find a view"
                type="search"
              />
            </label>
            <nav className="flex flex-col gap-1">
              {filteredViewItems.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition",
                    view.badge
                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100"
                      : "text-slate-300 hover:bg-slate-900/60",
                  )}
                  aria-pressed={Boolean(view.badge)}
                >
                  <span className="mt-0.5">{view.icon}</span>
                  <span className="flex-1">
                    <span className="text-sm font-medium">{view.label}</span>
                    {view.description ? (
                      <span className="mt-0.5 block text-xs text-slate-400">{view.description}</span>
                    ) : null}
                  </span>
                  {view.badge ? (
                    <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      {view.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Other views</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                <FaFolderPlus className="h-3 w-3" aria-hidden />
                Add Openings
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                <FaCircle className="h-2.5 w-2.5 text-violet-400" aria-hidden />
                Door Size, Throat, F_Rating
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                <FaCircle className="h-2.5 w-2.5 text-amber-400" aria-hidden />
                Components
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-cyan-500/50 hover:text-cyan-200"
              >
                <FaCircle className="h-2.5 w-2.5 text-emerald-400" aria-hidden />
                Review
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-900 bg-[#0c172f]/90 p-3 text-sm">
          {tableShortcuts.map((entry) => {
            const isActive = entry.slug === activeTableSlug;
            return (
              <button
                key={entry.slug}
                type="button"
                onClick={() => onSelectTable(entry.slug)}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition",
                  isActive
                    ? "bg-slate-200 text-slate-900 shadow"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/60",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </nav>

        <RecordToolbar table={table} />

        <div className="flex min-h-0 flex-1">
          <InteractiveGrid
            key={table.slug}
            initialRows={state.rows}
            initialColumns={state.columns}
            classNames={gridClassNames}
            onStateChange={setState}
            hasMoreRows={hasMoreRows}
            loadingMoreRows={loadingRows}
            onLoadMoreRows={handleLoadMoreRows}
            virtualizationOverscan={320}
          />
        </div>
      </div>
    </section>
  );
}

function RecordToolbar({ table }: { table: AirtableTableDefinition }) {
  const summary = table.summary;
  const [snapshotsOpen, setSnapshotsOpen] = React.useState(false);
  const snapshotsRef = React.useRef<HTMLDivElement | null>(null);

  const formattedLastAnalyzed = React.useMemo(() => {
    const raw = summary.lastAnalyzed;
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }, [summary.lastAnalyzed]);

  const snapshotItems = React.useMemo(
    () => {
      const items = [
        {
          id: "current",
          label: "Current rebuild",
          detail: formattedLastAnalyzed
            ? `Generated ${formattedLastAnalyzed}`
            : "Generated from latest CSV ingest",
          badge: `${summary.rowCount.toLocaleString()} records`,
        },
        {
          id: "source",
          label: "Original CSV export",
          detail: table.fileName,
          badge: `${summary.fieldCount} fields`,
        },
      ];
      if (summary.primaryIdField) {
        items.push({
          id: "primary",
          label: "Primary identifier",
          detail: `Primary field: ${summary.primaryIdField}`,
          badge: "Schema",
        });
      }
      return items;
    },
    [formattedLastAnalyzed, summary.fieldCount, summary.primaryIdField, summary.rowCount, table.fileName],
  );

  React.useEffect(() => {
    if (!snapshotsOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!snapshotsRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!snapshotsRef.current.contains(event.target)) {
        setSnapshotsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSnapshotsOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [snapshotsOpen]);

  React.useEffect(() => {
    setSnapshotsOpen(false);
  }, [table.slug]);

  return (
    <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#121f3c] bg-[#101c38]/90 px-4 py-3 text-xs font-medium text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#141f3b] px-3 py-1.5 text-sm text-slate-200">
          <FaThLarge className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          Grid view
          <FaChevronDown className="h-3 w-3 text-slate-500" aria-hidden />
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
        >
          <FaEyeSlash className="h-3.5 w-3.5" aria-hidden />
          Hide fields
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
        >
          <FaFilter className="h-3.5 w-3.5" aria-hidden />
          Filter
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
        >
          <FaLayerGroup className="h-3.5 w-3.5" aria-hidden />
          Group
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
        >
          <FaSortAmountDown className="h-3.5 w-3.5" aria-hidden />
          Sort
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
        >
          <FaPalette className="h-3.5 w-3.5" aria-hidden />
          Color
        </button>
        <div className="relative" ref={snapshotsRef}>
          <button
            type="button"
            onClick={() => setSnapshotsOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 transition hover:bg-[#121f3c]"
            aria-haspopup="true"
            aria-expanded={snapshotsOpen}
          >
            <FaHistory className="h-3.5 w-3.5" aria-hidden />
            Snapshots
            <FaChevronDown
              className={cn(
                "h-3 w-3 text-slate-500 transition-transform",
                snapshotsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {snapshotsOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#16254a] bg-[#0f1d38] p-3 text-left shadow-[0_24px_48px_rgba(4,16,36,0.55)]">
              <div className="space-y-2">
                {snapshotItems.map((snapshot) => (
                  <button
                    key={snapshot.id}
                    type="button"
                    className="w-full rounded-lg border border-transparent bg-[#111f3b] px-3 py-2 text-left text-sm text-slate-100 transition hover:border-cyan-500/40 hover:bg-[#132649]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{snapshot.label}</span>
                      <span className="text-xs text-slate-400">{snapshot.badge}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{snapshot.detail}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
                <span>Compare schema between snapshots.</span>
                <button
                  type="button"
                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
                >
                  Manage
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#121f3c] px-2 py-1">
          <FaShareAlt className="h-3 w-3" aria-hidden />
          Share and sync
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#121f3c] px-2 py-1">
          <FaUndoAlt className="h-3 w-3" aria-hidden />
          Undo
        </span>
        <span className="text-slate-500">{summary.rowCount.toLocaleString()} records</span>
      </div>
    </div>
  );
}

function AutomationsPanel({ automations }: { automations: AirtableAutomation[] }) {
  if (!automations.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0b162e]/90 p-8 text-sm text-slate-300">
        No automation scripts were found in <code className="text-xs text-slate-400">airtable/js</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {automations.map((automation) => (
        <article
          key={automation.fileName}
          className="rounded-2xl border border-slate-800 bg-[#0d1931]/90 p-6 shadow-[0_18px_32px_rgba(3,12,29,0.5)]"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{automation.name}</h2>
              <p className="text-xs text-slate-500">{automation.fileName}</p>
            </div>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              {automation.tablesInvolved.length} table
              {automation.tablesInvolved.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {automation.trigger ? (
              <p>
                <strong className="text-slate-100">Trigger:</strong> {automation.trigger}
              </p>
            ) : null}
            {automation.actions.length ? (
              <div>
                <strong className="text-slate-100">Actions:</strong>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {automation.actions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {automation.tablesInvolved.length ? (
              <p>
                <strong className="text-slate-100">Tables touched:</strong>{" "}
                {automation.tablesInvolved.join(", ")}
              </p>
            ) : null}
            <p className="rounded-xl border border-slate-700 bg-[#111f3b] px-3 py-2 text-xs text-slate-400">
              {automation.scriptSummary}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function InterfacesPanel({ tables }: { tables: AirtableTableDefinition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tables.map((table) => (
        <article
          key={table.slug}
          className="rounded-2xl border border-slate-800 bg-[#0d1931]/80 p-5 shadow-[0_16px_28px_rgba(3,12,29,0.45)]"
        >
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-100">{table.name}</h3>
            <span className="rounded-md bg-slate-800/70 px-2 py-0.5 text-xs text-slate-400">
              {table.summary.linkedFieldCount} linked fields
            </span>
          </header>
          <p className="mt-3 text-sm text-slate-300">
            Build a record review interface focusing on{" "}
            {table.fieldMeta
              .slice(0, 4)
              .map((meta) => meta.originalName)
              .join(", ")}
            . Include quick glance stats and connected records for account managers.
          </p>
        </article>
      ))}
    </div>
  );
}

function FormsPanel({ tables }: { tables: AirtableTableDefinition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tables.map((table) => {
        const required = table.fieldMeta
          .filter(
            (meta) =>
              meta.type !== "formula" &&
              meta.type !== "rollup" &&
              meta.type !== "lookup" &&
              meta.type !== "createdTime" &&
              meta.type !== "lastModifiedTime",
          )
          .slice(0, 5)
          .map((meta) => meta.originalName);
        return (
          <article
            key={table.slug}
            className="rounded-2xl border border-slate-800 bg-[#0d1931]/80 p-5 shadow-[0_16px_28px_rgba(3,12,29,0.45)]"
          >
            <header className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-100">{table.name}</h3>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                Required fields
              </span>
            </header>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {required.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Encourage inline validation, add context for each linked record selector, and surface pricing hints before submission.
            </p>
          </article>
        );
      })}
    </div>
  );
}
