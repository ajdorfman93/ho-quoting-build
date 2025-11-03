"use client";

import * as React from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import type { ColumnSpec } from "./tableUtils";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const WidthAwareGridLayout = WidthProvider(GridLayout);

type Primitive = string | number | boolean | null | undefined | Date;

export interface BasicGridTableProps<T extends Record<string, unknown>> {
  rows: T[];
  columns: ColumnSpec<T>[];
  className?: string;
  rowNumberWidth?: number;
  headerHeight?: number;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  onLayoutChange?: (payload: {
    columnOrder: string[];
    columnWidths: Record<string, number>;
    rowOrder: string[];
    rowHeights: Record<string, number>;
  }) => void;
}

const DEFAULT_ROW_NUMBER_WIDTH = 64;
const DEFAULT_HEADER_HEIGHT = 56;
const COLUMN_UNIT_RESOLUTION = 10;
const DEFAULT_COLUMN_WIDTH_UNITS = 20 * COLUMN_UNIT_RESOLUTION;
const MIN_COLUMN_WIDTH_UNITS = 12 * COLUMN_UNIT_RESOLUTION;
const MAX_COLUMN_WIDTH_UNITS = 40 * COLUMN_UNIT_RESOLUTION;
const ROW_UNIT_HEIGHT = 10; // px per row layout unit
const DEFAULT_ROW_HEIGHT_UNITS = 5;
const MIN_ROW_HEIGHT_UNITS = 3;
const MAX_ROW_HEIGHT_UNITS = 12;

interface ColumnSizingState {
  order: string[];
  widths: Record<string, number>;
}

interface RowSizingState {
  order: string[];
  heights: Record<string, number>;
}

interface CellRenderItem {
  id: string;
  layout: Layout;
  value: unknown;
  isLastColumn: boolean;
}

function ensureOrder(baseOrder: string[], incomingIds: string[]): string[] {
  const known = new Set(incomingIds);
  const preserved = baseOrder.filter((id) => known.has(id));
  const additions = incomingIds.filter((id) => !preserved.includes(id));
  return [...preserved, ...additions];
}

function formatPrimitive(value: Primitive): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

function normalizeCellValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(normalizeCellValue).join(", ");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return formatPrimitive(value as Primitive);
}

function computeColumnLayouts(state: ColumnSizingState, minW: number, maxW: number) {
  let cursor = 0;
  return state.order.map((columnId) => {
    const width = Math.max(minW, Math.min(maxW, state.widths[columnId] ?? DEFAULT_COLUMN_WIDTH_UNITS));
    const layout: Layout = {
      i: columnId,
      x: cursor,
      y: 0,
      w: width,
      h: 1,
      minW,
      maxW,
      minH: 1,
      maxH: 1,
      static: false
    };
    cursor += width;
    return layout;
  });
}

function computeRowLayouts(state: RowSizingState, minH: number, maxH: number) {
  let cursor = 0;
  return state.order.map((rowId) => {
    const height = Math.max(minH, Math.min(maxH, state.heights[rowId] ?? DEFAULT_ROW_HEIGHT_UNITS));
    const layout: Layout = {
      i: rowId,
      x: 0,
      y: cursor,
      w: 1,
      h: height,
      minW: 1,
      maxW: 1,
      minH,
      maxH,
      static: false
    };
    cursor += height;
    return layout;
  });
}

export function BasicReactGridTable<T extends Record<string, unknown>>({
  rows,
  columns,
  className,
  rowNumberWidth = DEFAULT_ROW_NUMBER_WIDTH,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  minColumnWidth = MIN_COLUMN_WIDTH_UNITS,
  maxColumnWidth = MAX_COLUMN_WIDTH_UNITS,
  minRowHeight = MIN_ROW_HEIGHT_UNITS * ROW_UNIT_HEIGHT,
  maxRowHeight = MAX_ROW_HEIGHT_UNITS * ROW_UNIT_HEIGHT,
  onLayoutChange
}: BasicGridTableProps<T>) {
  const columnIdFor = React.useCallback(
    (col: ColumnSpec<T>, index: number) => String(col.key ?? col.name ?? `column-${index}`),
    []
  );
  const rowIdFor = React.useCallback(
    (row: T, index: number) => String((row as Record<string, unknown>).id ?? `row-${index}`),
    []
  );

  const initialColumnState = React.useMemo<ColumnSizingState>(() => {
    const order = columns.map(columnIdFor);
    const widths = order.reduce<Record<string, number>>((acc, id) => {
      acc[id] = DEFAULT_COLUMN_WIDTH_UNITS;
      return acc;
    }, {});
    return { order, widths };
  }, [columns, columnIdFor]);

  const initialRowState = React.useMemo<RowSizingState>(() => {
    const order = rows.map(rowIdFor);
    const heights = order.reduce<Record<string, number>>((acc, id) => {
      acc[id] = DEFAULT_ROW_HEIGHT_UNITS;
      return acc;
    }, {});
    return { order, heights };
  }, [rows, rowIdFor]);

  const [columnState, setColumnState] = React.useState<ColumnSizingState>(initialColumnState);
  const [rowState, setRowState] = React.useState<RowSizingState>(initialRowState);

  React.useEffect(() => {
    setColumnState((previous) => {
      const nextOrder = ensureOrder(previous.order, columns.map(columnIdFor));
      const nextWidths = { ...previous.widths };
      for (const id of nextOrder) {
        if (!(id in nextWidths)) nextWidths[id] = DEFAULT_COLUMN_WIDTH_UNITS;
      }
      return { order: nextOrder, widths: nextWidths };
    });
  }, [columns, columnIdFor]);

  React.useEffect(() => {
    setRowState((previous) => {
      const nextOrder = ensureOrder(previous.order, rows.map(rowIdFor));
      const nextHeights = { ...previous.heights };
      for (const id of nextOrder) {
        if (!(id in nextHeights)) nextHeights[id] = DEFAULT_ROW_HEIGHT_UNITS;
      }
      return { order: nextOrder, heights: nextHeights };
    });
  }, [rows, rowIdFor]);

  const minColumnUnits = Math.max(MIN_COLUMN_WIDTH_UNITS, Math.floor(minColumnWidth));
  const maxColumnUnits = Math.max(minColumnUnits + COLUMN_UNIT_RESOLUTION, Math.floor(maxColumnWidth));
  const minRowUnits = Math.max(MIN_ROW_HEIGHT_UNITS, Math.floor(minRowHeight / ROW_UNIT_HEIGHT));
  const maxRowUnits = Math.max(minRowUnits + 1, Math.floor(maxRowHeight / ROW_UNIT_HEIGHT));

  const columnLayouts = React.useMemo(
    () => computeColumnLayouts(columnState, minColumnUnits, maxColumnUnits),
    [columnState, minColumnUnits, maxColumnUnits]
  );
  const rowLayouts = React.useMemo(
    () => computeRowLayouts(rowState, minRowUnits, maxRowUnits),
    [rowState, minRowUnits, maxRowUnits]
  );

  const totalColumnUnits = columnLayouts.reduce((sum, item) => sum + item.w, 0) || 1;
  const layoutColumnSpan = Math.max(totalColumnUnits, columnLayouts.length || 1);

  const totalRowHeightPx = rowLayouts.reduce((sum, item) => sum + item.h * ROW_UNIT_HEIGHT, 0);
  const orderedColumns = columnState.order
    .map((id) => {
      const index = columns.findIndex((col, idx) => columnIdFor(col, idx) === id);
      if (index === -1) return null;
      return { id, column: columns[index] };
    })
    .filter((entry): entry is { id: string; column: ColumnSpec<T> } => Boolean(entry));

  const orderedRows = rowState.order
      .map((id) => {
        const index = rows.findIndex((row, idx) => rowIdFor(row, idx) === id);
        if (index === -1) return null;
        return { id, row: rows[index] };
      })
      .filter((entry): entry is { id: string; row: T } => Boolean(entry));

  const columnLayoutLookup = React.useMemo(() => {
    const map = new Map<string, Layout>();
    for (const layout of columnLayouts) {
      map.set(layout.i, layout);
    }
    return map;
  }, [columnLayouts]);

  const rowLayoutLookup = React.useMemo(() => {
    const map = new Map<string, Layout>();
    for (const layout of rowLayouts) {
      map.set(layout.i, layout);
    }
    return map;
  }, [rowLayouts]);

  const cellItems = React.useMemo<CellRenderItem[]>(() => {
    const items: CellRenderItem[] = [];
    const columnCount = orderedColumns.length;

    for (const { id: rowId, row } of orderedRows) {
      const rowLayout = rowLayoutLookup.get(rowId);
      if (!rowLayout) continue;

      orderedColumns.forEach(({ id: columnId, column }, columnIndex) => {
        const columnLayout = columnLayoutLookup.get(columnId);
        if (!columnLayout) return;

        const cellId = `${rowId}::${columnId}`;
        const rowRecord = row as Record<string, unknown>;
        const cellLayout: Layout = {
          i: cellId,
          x: columnLayout.x,
          y: rowLayout.y,
          w: columnLayout.w,
          h: rowLayout.h,
          minW: columnLayout.minW,
          maxW: columnLayout.maxW,
          minH: rowLayout.minH,
          maxH: rowLayout.maxH,
          static: true
        };

        items.push({
          id: cellId,
          layout: cellLayout,
          value: rowRecord[String(column.key)] ?? null,
          isLastColumn: columnIndex === columnCount - 1
        });
      });
    }

    return items;
  }, [orderedColumns, orderedRows, columnLayoutLookup, rowLayoutLookup]);

  const cellLayouts = React.useMemo<Layout[]>(() => cellItems.map((item) => item.layout), [cellItems]);

  const handleColumnDragStop = React.useCallback(
    (nextLayout: Layout[]) => {
      const sorted = [...nextLayout].sort((a, b) => a.x - b.x);
      setColumnState((previous) => ({
        order: sorted.map((item) => item.i),
        widths: { ...previous.widths }
      }));
    },
    []
  );

  const handleColumnResizeStop = React.useCallback(
    (_layout: Layout[], oldItem: Layout, newItem: Layout) => {
      const nextWidth = Math.max(minColumnUnits, Math.min(maxColumnUnits, newItem.w));
      if (nextWidth === oldItem.w) return;
      setColumnState((previous) => ({
        order: previous.order,
        widths: { ...previous.widths, [newItem.i]: nextWidth }
      }));
    },
    [maxColumnUnits, minColumnUnits]
  );

  const handleRowDragStop = React.useCallback((nextLayout: Layout[]) => {
    const sorted = [...nextLayout].sort((a, b) => a.y - b.y);
    setRowState((previous) => ({
      order: sorted.map((item) => item.i),
      heights: { ...previous.heights }
    }));
  }, []);

  const handleRowResizeStop = React.useCallback(
    (_layout: Layout[], oldItem: Layout, newItem: Layout) => {
      const nextHeight = Math.max(minRowUnits, Math.min(maxRowUnits, newItem.h));
      if (nextHeight === oldItem.h) return;
      setRowState((previous) => ({
        order: previous.order,
        heights: { ...previous.heights, [newItem.i]: nextHeight }
      }));
    },
    [maxRowUnits, minRowUnits]
  );

  React.useEffect(() => {
    if (!onLayoutChange) return;
    onLayoutChange({
      columnOrder: columnState.order,
      columnWidths: { ...columnState.widths },
      rowOrder: rowState.order,
      rowHeights: { ...rowState.heights }
    });
  }, [columnState, rowState, onLayoutChange]);

  return (
    <div className={["basic-react-grid-table flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-neutral-700 dark:bg-neutral-900", className].filter(Boolean).join(" ")}>
      <div className="flex items-stretch border-b border-zinc-200 bg-zinc-100/60 dark:border-neutral-700 dark:bg-neutral-900/60">
        <div
          className="flex items-center justify-center border-r border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-neutral-700 dark:text-neutral-400"
          style={{ width: rowNumberWidth, minWidth: rowNumberWidth }}
        >
          #
        </div>
        <div className="flex-1">
          <WidthAwareGridLayout
            className="column-header-layout"
            layout={columnLayouts}
            cols={Math.max(totalColumnUnits, columnLayouts.length || 1)}
            rowHeight={headerHeight}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            isBounded
            compactType={null}
            preventCollision
            draggableHandle=".column-drag-handle"
            resizeHandles={["e", "w"]}
            onDragStop={handleColumnDragStop}
            onResizeStop={handleColumnResizeStop}
          >
            {orderedColumns.map(({ id: columnId, column }) => {
              return (
                <div
                  key={columnId}
                  className="column-header flex h-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium shadow-sm transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <span className="column-drag-handle cursor-grab select-none text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-neutral-100">
                    {column.name ?? columnId}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-neutral-500">
                    {column.type}
                  </span>
                </div>
              );
            })}
          </WidthAwareGridLayout>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="border-r border-zinc-200 bg-zinc-50/80 dark:border-neutral-700 dark:bg-neutral-900/60"
          style={{ width: rowNumberWidth, minWidth: rowNumberWidth }}
        >
          <WidthAwareGridLayout
            className="row-handle-layout h-full"
            layout={rowLayouts}
            cols={1}
            rowHeight={ROW_UNIT_HEIGHT}
            margin={[0, 8]}
            containerPadding={[0, 8]}
            isResizable
            isDraggable
            compactType={null}
            preventCollision
            draggableHandle=".row-drag-handle"
            resizeHandles={["s"]}
            onDragStop={handleRowDragStop}
            onResizeStop={handleRowResizeStop}
          >
            {rowState.order.map((rowId, position) => {
              const rowHeightUnits = rowState.heights[rowId] ?? DEFAULT_ROW_HEIGHT_UNITS;
              return (
                <div
                  key={rowId}
                  data-row-id={rowId}
                  className="row-number-item group relative flex h-full items-center justify-center rounded-md border border-transparent bg-transparent text-xs font-semibold text-zinc-500 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-600 dark:text-neutral-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                  style={{ minHeight: rowHeightUnits * ROW_UNIT_HEIGHT }}
                >
                  <span className="row-drag-handle cursor-grab select-none px-2 py-1">
                    {position + 1}
                  </span>
                  <span className="absolute bottom-1 right-1 hidden text-[10px] font-medium uppercase tracking-wide text-zinc-400 group-hover:block dark:text-neutral-500">
                    Resize
                  </span>
                </div>
              );
            })}
          </WidthAwareGridLayout>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className="grid border-collapse text-sm"
            style={{
              gridTemplateColumns: columnGridTemplate,
              minWidth: orderedColumns.length ? "100%" : 0
            }}
          >
            {orderedRows.map(({ id: rowId, row }) => {
              const rowHeightUnits = rowState.heights[rowId] ?? DEFAULT_ROW_HEIGHT_UNITS;
              const rowHeightPx = rowHeightUnits * ROW_UNIT_HEIGHT;
              return orderedColumns.map(({ id: columnId, column }, colIdx) => {
                const value = (row as Record<string, unknown>)[String(column.key)] ?? null;
                return (
                  <div
                    key={`${rowId}-${columnId ?? colIdx}`}
                    className="flex items-center border-b border-r border-zinc-200 px-3 py-2 text-zinc-700 last:border-r-0 dark:border-neutral-700 dark:text-neutral-200"
                    style={{
                      height: rowHeightPx
                    }}
                  >
                    <span className="truncate">{normalizeCellValue(value)}</span>
                  </div>
                );
              });
            })}
          </div>
          {totalRowHeightPx === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500 dark:text-neutral-400">
              No rows to display yet.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-500 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-400">
        Drag headers to reorder columns. Drag the row numbers to reorder rows. Resize handles adjust column widths and row heights for the entire column or row respectively.
      </div>
    </div>
  );
}

export function renderBasicReactGridTable<T extends Record<string, unknown>>(props: BasicGridTableProps<T>) {
  return <BasicReactGridTable<T> {...props} />;
}

export const originalTableReference = {
  file: "utils/tableUtils.ts",
  sections: {
    history: "utils/tableUtils.ts:2169",
    selection: "utils/tableUtils.ts:5125",
    fieldAgents: "utils/tableUtils.ts:187",
    resizing: "utils/tableUtils.ts:5920",
    rowOperations: "utils/tableUtils.ts:6000"
  }
};
