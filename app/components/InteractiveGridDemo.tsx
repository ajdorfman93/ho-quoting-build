"use client";

import * as React from "react";
import Sortable from "sortablejs/modular/sortable.esm.js";
import {
  renderInteractiveTable,
  type ColumnSpec,
  type InteractiveTableProps,
  type LinkedTableOption,
  formatCountValue,
} from "@/utils/tableUtils";
import type { TableMetadata } from "@/utils/schema";

export interface InteractiveGridState<T extends Record<string, unknown>> {
  rows: T[];
  columns: ColumnSpec<T>[];
}

export interface InteractiveGridProps<T extends Record<string, unknown>> {
  initialRows: T[];
  initialColumns: ColumnSpec<T>[];
  users?: Array<{ id: string; name: string; email?: string; avatarUrl?: string }>;
  renderDetails?: (row: T, rowIndex: number) => React.ReactNode;
  linkedTableOptions?: LinkedTableOption[];
  classNames?: InteractiveTableProps<T>["classNames"];
  onStateChange?: (next: InteractiveGridState<T>) => void;
  hasMoreRows?: boolean;
  loadingMoreRows?: boolean;
  onLoadMoreRows?: () => void | Promise<void>;
  virtualizationOverscan?: number;
}

type TableRow = Record<string, unknown> & { id: string };

type GridState = {
  rows: TableRow[];
  columns: ColumnSpec<TableRow>[];
};

type GridDiff = {
  addedColumns: ColumnSpec<TableRow>[];
  removedColumnKeys: string[];
  updatedColumns: ColumnSpec<TableRow>[];
  columnOrder: string[];
  columnOrderChanged: boolean;
  addedRows: TableRow[];
  removedRowIds: string[];
  updatedRows: Array<{ id: string; values: Record<string, unknown> }>;
};

interface InteractiveGridDemoProps {
  tableSelectorVariant?: "dropdown" | "tabs";
}

const PAGE_SIZE = 100;

function cloneState(state: GridState): GridState {
  return {
    rows: state.rows.map((row) => ({ ...row })),
    columns: state.columns.map((column) => ({
      ...column,
      config: column.config ? JSON.parse(JSON.stringify(column.config)) : undefined,
    })),
  };
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function valuesAreDifferent(a: unknown, b: unknown): boolean {
  return normalizeCellValue(a) !== normalizeCellValue(b);
}

function diffGridState(prev: GridState, next: GridState): GridDiff {
  const prevColumnsMap = new Map(prev.columns.map((column) => [column.key, column]));
  const nextColumnsMap = new Map(next.columns.map((column) => [column.key, column]));

  const removedColumnKeys = prev.columns
    .filter((column) => !nextColumnsMap.has(column.key))
    .map((column) => column.key);

  const addedColumns = next.columns.filter((column) => !prevColumnsMap.has(column.key));

  const updatedColumns = next.columns.filter((column) => {
    const previous = prevColumnsMap.get(column.key);
    if (!previous) return false;
    const previousConfig = previous.config ?? {};
    const nextConfig = column.config ?? {};
    return (
      previous.name !== column.name ||
      previous.type !== column.type ||
      (previous.width ?? 0) !== (column.width ?? 0) ||
      JSON.stringify(previousConfig) !== JSON.stringify(nextConfig)
    );
  });

  const columnOrder = next.columns.map((column) => column.key);
  const previousOrder = prev.columns.map((column) => column.key);
  const columnOrderChanged =
    columnOrder.length !== previousOrder.length ||
    previousOrder.some((key, index) => key !== columnOrder[index]);

  const ignoredForRows = new Set<string>([
    ...addedColumns.map((column) => column.key),
    ...removedColumnKeys,
  ]);
  ignoredForRows.add("id");

  const prevRowMap = new Map(prev.rows.map((row) => [String(row.id ?? ""), row]));
  const nextRowMap = new Map(next.rows.map((row) => [String(row.id ?? ""), row]));

  const addedRows = next.rows.filter((row) => {
    const id = String(row.id ?? "");
    return !id || !prevRowMap.has(id);
  });

  const removedRowIds = prev.rows
    .map((row) => String(row.id ?? ""))
    .filter((id) => id && !nextRowMap.has(id));

  const updatedRows: Array<{ id: string; values: Record<string, unknown> }> = [];

  for (const row of next.rows) {
    const id = String(row.id ?? "");
    if (!id || !prevRowMap.has(id)) continue;
    const previous = prevRowMap.get(id)!;
    const keys = new Set<string>([
      ...Object.keys(previous),
      ...Object.keys(row),
    ]);
    keys.delete("id");
    const changes: Record<string, unknown> = {};
    for (const key of keys) {
      if (ignoredForRows.has(key)) continue;
      if (valuesAreDifferent(previous[key], row[key])) {
        changes[key] = row[key];
      }
    }
    if (Object.keys(changes).length > 0) {
      updatedRows.push({ id, values: changes });
    }
  }

  return {
    addedColumns,
    removedColumnKeys,
    updatedColumns,
    columnOrder,
    columnOrderChanged,
    addedRows,
    removedRowIds,
    updatedRows,
  };
}

function hasColumnChanges(diff: GridDiff) {
  return (
    diff.addedColumns.length > 0 ||
    diff.removedColumnKeys.length > 0 ||
    diff.updatedColumns.length > 0 ||
    diff.columnOrderChanged
  );
}

function hasRowChanges(diff: GridDiff) {
  return (
    diff.addedRows.length > 0 ||
    diff.removedRowIds.length > 0 ||
    diff.updatedRows.length > 0
  );
}

function formatValuesForServer(
  source: Record<string, unknown>,
  allowedColumns: Set<string>
) {
  const payload: Record<string, unknown> = {};
  for (const key of allowedColumns) {
    if (key === "id") continue;
    if (!(key in source)) continue;
    const value = source[key];
    if (value === undefined) continue;
    if (value === "") {
      payload[key] = null;
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

async function sendJSON(
  url: string,
  init: RequestInit = {},
  expectJson = true
) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message || "Request failed");
  }

  if (!expectJson) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function InteractiveGrid<T extends Record<string, unknown>>({
  initialRows,
  initialColumns,
  users,
  renderDetails,
  linkedTableOptions,
  classNames,
  onStateChange,
  hasMoreRows,
  loadingMoreRows,
  onLoadMoreRows,
  virtualizationOverscan,
}: InteractiveGridProps<T>) {
  const [state, setState] = React.useState<InteractiveGridState<T>>(() => ({
    rows: initialRows,
    columns: initialColumns,
  }));

  React.useEffect(() => {
    setState({ rows: initialRows, columns: initialColumns });
  }, [initialRows, initialColumns]);

  const handleChange = React.useCallback(
    (next: InteractiveGridState<T>) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  return renderInteractiveTable<T>({
    rows: state.rows,
    columns: state.columns,
    linkedTableOptions,
    onChange: handleChange,
    users,
    renderDetails,
    classNames,
    hasMoreRows,
    loadingMoreRows,
    onLoadMoreRows,
    virtualizationOverscan,
  });
}

export default function InteractiveGridDemo({
  tableSelectorVariant = "dropdown",
}: InteractiveGridDemoProps = {}) {
  const tableLabelId = React.useId();
  const [tables, setTables] = React.useState<TableMetadata[]>([]);
  const [activeTable, setActiveTable] = React.useState<string | null>(null);
  const [gridState, setGridState] = React.useState<GridState | null>(null);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const previousStateRef = React.useRef<GridState | null>(null);
  const suppressChangesRef = React.useRef(false);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const syncingRef = React.useRef(syncing);
  const ignoreEventsRef = React.useRef(false);
  const tableTabsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tableTabsSortableRef = React.useRef<ReturnType<typeof Sortable.create> | null>(null);
  const latestTablesRef = React.useRef<TableMetadata[]>(tables);
  const linkedTableOptions = React.useMemo(
    () =>
      tables.map((table) => ({
        tableName: table.table_name,
        displayName: table.display_name,
      })),
    [tables]
  );

  const replaceState = React.useCallback((next: GridState) => {
    const snapshot = cloneState(next);
    suppressChangesRef.current = true;
    setGridState(snapshot);
    previousStateRef.current = cloneState(snapshot);
    setTimeout(() => {
      suppressChangesRef.current = false;
    }, 0);
  }, []);

  const loadTable = React.useCallback(
    async (tableName: string, options?: { showSpinner?: boolean }) => {
      const showSpinner = options?.showSpinner ?? true;
      if (showSpinner) setLoading(true);
      try {
        const response = await fetch(
          `/api/tables/${tableName}?limit=${PAGE_SIZE}&offset=0`
        );
        if (!response.ok) {
          const message = await response
            .json()
            .catch(() => ({ error: "Failed to load table" }));
          throw new Error(message?.error ?? response.statusText);
        }
        const data = await response.json();
        const nextState: GridState = {
          rows: (data.rows ?? []).map((row: TableRow) => ({ ...row })),
          columns: (data.columns ?? []).map(
            (column: ColumnSpec<TableRow>) => ({
              ...column,
              config: column.config ? JSON.parse(JSON.stringify(column.config)) : undefined,
            })
          ),
        };
        replaceState(nextState);
        setTotalRows(Number(data.totalRows ?? nextState.rows.length));
        setActiveTable(tableName);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load table");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [replaceState]
  );

  const selectTable = React.useCallback(
    async (tableName: string) => {
      if (!tableName) return;
      await loadTable(tableName);
    },
    [loadTable]
  );

  const refreshTable = React.useCallback(async () => {
    if (!activeTable) return;
    await loadTable(activeTable, { showSpinner: false });
  }, [activeTable, loadTable]);

  const handleDropdownChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextTable = event.target.value;
      await selectTable(nextTable);
    },
    [selectTable]
  );

  const applyColumnChanges = React.useCallback(
    async (tableName: string, diff: GridDiff) => {
      const serializeConfig = (
        config: ColumnSpec<TableRow>["config"] | undefined
      ) => (config ? JSON.parse(JSON.stringify(config)) : {});

      for (const key of diff.removedColumnKeys) {
        await sendJSON(
          `/api/tables/${tableName}/columns/${encodeURIComponent(key)}`,
          { method: "DELETE" },
          false
        );
      }

      for (const column of diff.addedColumns) {
        await sendJSON(`/api/tables/${tableName}/columns`, {
          method: "POST",
          body: JSON.stringify({
            name: column.name ?? "New column",
            type: column.type,
            config: serializeConfig(column.config),
            width: column.width ?? 220,
            position: Math.max(1, diff.columnOrder.indexOf(column.key) + 1),
            clientKey: column.key,
          }),
        });
      }

      for (const column of diff.updatedColumns) {
        await sendJSON(
          `/api/tables/${tableName}/columns/${encodeURIComponent(column.key)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name: column.name,
              type: column.type,
              config: serializeConfig(column.config),
              width: column.width ?? 220,
            }),
          }
        );
      }

      if (
        diff.columnOrderChanged &&
        diff.addedColumns.length === 0 &&
        diff.removedColumnKeys.length === 0
      ) {
        await sendJSON(`/api/tables/${tableName}/columns/order`, {
          method: "PATCH",
          body: JSON.stringify({ order: diff.columnOrder }),
        });
      }
    },
    []
  );

  const applyRowChanges = React.useCallback(
    async (
      tableName: string,
      diff: GridDiff,
      allowedColumns: Set<string>
    ) => {
      for (const id of diff.removedRowIds) {
        await sendJSON(
          `/api/tables/${tableName}/rows/${encodeURIComponent(id)}`,
          { method: "DELETE" },
          false
        );
      }

      for (const row of diff.addedRows) {
        const values = formatValuesForServer(row, allowedColumns);
        await sendJSON(`/api/tables/${tableName}/rows`, {
          method: "POST",
          body: JSON.stringify({ values }),
        });
      }

      for (const update of diff.updatedRows) {
        const values = formatValuesForServer(update.values, allowedColumns);
        if (Object.keys(values).length === 0) continue;
        await sendJSON(
          `/api/tables/${tableName}/rows/${encodeURIComponent(update.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ values }),
          }
        );
      }
    },
    []
  );

  const handleStateChange = React.useCallback(
    async (next: InteractiveGridState<TableRow>) => {
      if (!activeTable) return;
      if (suppressChangesRef.current) {
        previousStateRef.current = cloneState({
          rows: next.rows,
          columns: next.columns,
        });
        return;
      }

      const previous =
        previousStateRef.current ??
        (gridState ? cloneState(gridState) : null);

      if (!previous) {
        previousStateRef.current = cloneState({
          rows: next.rows,
          columns: next.columns,
        });
        return;
      }

      const nextState: GridState = {
        rows: next.rows,
        columns: next.columns,
      };

      const diff = diffGridState(previous, nextState);
      const columnsChanged = hasColumnChanges(diff);
      const rowsChanged = hasRowChanges(diff);

      if (!columnsChanged && !rowsChanged) {
        previousStateRef.current = cloneState(nextState);
        return;
      }

      ignoreEventsRef.current = true;
      setSyncing(true);

      try {
        if (columnsChanged) {
          await applyColumnChanges(activeTable, diff);
          await refreshTable();
        } else if (rowsChanged) {
          const allowedColumns = new Set(
            nextState.columns.map((column) => column.key)
          );
          await applyRowChanges(activeTable, diff, allowedColumns);
          await refreshTable();
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to save changes"
        );
        await refreshTable();
      } finally {
        setSyncing(false);
        setTimeout(() => {
          ignoreEventsRef.current = false;
        }, 300);
      }
    },
    [
      activeTable,
      applyColumnChanges,
      applyRowChanges,
      gridState,
      refreshTable,
    ]
  );

  const handleLoadMoreRows = React.useCallback(async () => {
    if (!activeTable || loadingMore || !gridState) return;
    if (gridState.rows.length >= totalRows) return;

    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/tables/${activeTable}?limit=${PAGE_SIZE}&offset=${gridState.rows.length}`
      );
      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ error: "Failed to load more rows" }));
        throw new Error(message?.error ?? response.statusText);
      }
      const data = await response.json();
      const mergedState: GridState = {
        rows: [
          ...gridState.rows,
          ...(data.rows ?? []).map((row: TableRow) => ({ ...row })),
        ],
        columns: (data.columns ?? gridState.columns).map(
          (column: ColumnSpec<TableRow>) => ({
            ...column,
            config: column.config ? JSON.parse(JSON.stringify(column.config)) : undefined,
          })
        ),
      };
      replaceState(mergedState);
      setTotalRows(Number(data.totalRows ?? mergedState.rows.length));
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load more rows"
      );
    } finally {
      setLoadingMore(false);
    }
  }, [activeTable, gridState, loadingMore, replaceState, totalRows]);

  const scheduleRefresh = React.useCallback(() => {
    if (!activeTable || loading || ignoreEventsRef.current) return;
    if (syncingRef.current) return;
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = setTimeout(async () => {
      refreshTimeoutRef.current = null;
      await refreshTable();
    }, 500);
  }, [activeTable, loading, refreshTable]);

  React.useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const response = await fetch("/api/tables");
        if (!response.ok) {
          const message = await response
            .json()
            .catch(() => ({ error: "Failed to load tables" }));
          throw new Error(message?.error ?? response.statusText);
        }
        const data = await response.json();
        if (cancelled) return;
        const list: TableMetadata[] = data.tables ?? [];
        setTables(list);
        if (list.length > 0) {
          await loadTable(list[0].table_name, { showSpinner: false });
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load tables"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadTable]);

  React.useEffect(() => {
    if (!activeTable) return;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;

    const connect = () => {
      if (closed) return;
      source = new EventSource(`/api/tables/${activeTable}/events`);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (!payload || payload.type === "connected") return;
          if (ignoreEventsRef.current) return;
          scheduleRefresh();
        } catch {
          /* ignore malformed payload */
        }
      };

      source.onerror = () => {
        if (source) {
          source.close();
          if (eventSourceRef.current === source) {
            eventSourceRef.current = null;
          }
        }
        if (!closed && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (source) {
        source.close();
        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [activeTable, scheduleRefresh]);

  React.useEffect(() => {
    syncingRef.current = syncing;
  }, [syncing]);

  React.useEffect(() => {
    latestTablesRef.current = tables;
  }, [tables]);

  React.useEffect(() => {
    if (tableSelectorVariant !== "tabs") {
      if (tableTabsSortableRef.current) {
        tableTabsSortableRef.current.destroy();
        tableTabsSortableRef.current = null;
      }
      return;
    }
    const container = tableTabsContainerRef.current;
    if (!container) return;
    tableTabsSortableRef.current?.destroy();
    const sortable = Sortable.create(container, {
      animation: 150,
      draggable: "[data-table-tab='true']",
      handle: "[data-table-tab='true']",
      disabled: tables.length < 2,
      onEnd: () => {
        const nodes = Array.from(
          container.querySelectorAll<HTMLElement>("[data-table-tab='true']")
        );
        const orderedNames = nodes
          .map((node) => node.dataset.tableName)
          .filter((name): name is string => Boolean(name && name.length));
        if (!orderedNames.length) return;
        const currentTables = latestTablesRef.current;
        if (orderedNames.length !== currentTables.length) return;
        const lookup = new Map(
          currentTables.map((table) => [table.table_name, table] as const)
        );
        const nextTables: TableMetadata[] = [];
        for (const name of orderedNames) {
          const table = lookup.get(name);
          if (!table) {
            return;
          }
          nextTables.push(table);
        }
        if (nextTables.length !== currentTables.length) return;
        const changed = nextTables.some(
          (table, index) =>
            table.table_name !== currentTables[index].table_name
        );
        if (!changed) return;
        setTables(nextTables);
      },
    });
    tableTabsSortableRef.current = sortable;
    return () => {
      sortable.destroy();
      if (tableTabsSortableRef.current === sortable) {
        tableTabsSortableRef.current = null;
      }
    };
  }, [tableSelectorVariant, tables.length]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {tableSelectorVariant === "tabs" ? (
          <div className="flex flex-col gap-2">
            <span
              id={tableLabelId}
              className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Table
            </span>
            <div
              id="table-select"
              role="tablist"
              aria-labelledby={tableLabelId}
              className="flex overflow-x-auto flex-wrap gap-2"
              ref={tableTabsContainerRef}
            >
              {tables.length > 0 ? (
                tables.map((table) => {
                  const isActive = table.table_name === activeTable;
                  return (
                    <button
                      key={table.table_name}
                      type="button"
                      role="tab"
                      data-table-tab="true"
                      data-table-name={table.table_name}
                      aria-selected={isActive}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isActive
                          ? "border-blue-500 bg-blue-600 text-white shadow-sm dark:border-blue-400 dark:bg-blue-500"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/60"
                      }`}
                      onClick={() => {
                        void selectTable(table.table_name);
                      }}
                    >
                      {table.display_name}
                    </button>
                  );
                })
              ) : (
                <span className="rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 dark:border-slate-700/60 dark:text-slate-400">
                  No tables available
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label
              htmlFor="table-select"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Table
            </label>
            <select
              id="table-select"
              value={activeTable ?? ""}
              onChange={handleDropdownChange}
              className="min-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-200"
            >
              <option value="" disabled>
                Select a table
              </option>
              {tables.map((table) => (
                <option key={table.table_name} value={table.table_name}>
                  {table.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          {loading && <span>Loading…</span>}
          {syncing && !loading && <span>Syncing changes…</span>}
          {!loading && !syncing && gridState && (
            <span>
              Showing {formatCountValue(gridState.rows.length)} of{" "}
              {formatCountValue(totalRows)} rows
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {gridState ? (
        <InteractiveGrid<TableRow>
          key={activeTable ?? "grid"}
          initialRows={gridState.rows}
          initialColumns={gridState.columns}
          linkedTableOptions={linkedTableOptions}
          onStateChange={handleStateChange}
          hasMoreRows={gridState.rows.length < totalRows}
          loadingMoreRows={loadingMore}
          onLoadMoreRows={handleLoadMoreRows}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-300">
          {loading ? "Loading tables…" : "Choose a table to get started."}
        </div>
      )}
    </div>
  );
}
