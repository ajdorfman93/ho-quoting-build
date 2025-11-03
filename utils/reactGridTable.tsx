"use client";

import * as React from "react";
import GridLayout, { WidthProvider, type Layout, type UniformRowResizeEvent } from "react-grid-layout";
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
const GUIDE_LINE_THICKNESS = 2.5;
const GUIDE_BAR_THICKNESS = 5;
const GUIDE_BAR_LENGTH = 25;

type ResizeAxis = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type ColumnResizeAxis = "e" | "w";
type RowResizeAxis = "s";

interface ResizeGuideBaseState {
  position: number;
  pointerOffset: number;
  tableWidth: number;
  tableHeight: number;
}

type ResizeGuideState =
  | ({ kind: "column" } & ResizeGuideBaseState)
  | ({ kind: "row" } & ResizeGuideBaseState);

function clampValue(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  if (Number.isFinite(max)) {
    return Math.max(min, Math.min(max, value));
  }
  return Math.max(min, value);
}

function resolveClientPoint(event?: Event | null) {
  if (!event) return null;
  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (touch) {
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
  }
  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
    return { clientX: event.clientX, clientY: event.clientY };
  }
  if (typeof MouseEvent !== "undefined" && event instanceof MouseEvent) {
    return { clientX: event.clientX, clientY: event.clientY };
  }
  const candidate = event as { clientX?: number; clientY?: number; touches?: Array<{ clientX: number; clientY: number }>; changedTouches?: Array<{ clientX: number; clientY: number }> };
  if (Array.isArray(candidate?.touches) && candidate.touches[0]) {
    return { clientX: candidate.touches[0].clientX, clientY: candidate.touches[0].clientY };
  }
  if (Array.isArray(candidate?.changedTouches) && candidate.changedTouches[0]) {
    return { clientX: candidate.changedTouches[0].clientX, clientY: candidate.changedTouches[0].clientY };
  }
  if (typeof candidate?.clientX === "number" && typeof candidate?.clientY === "number") {
    return { clientX: candidate.clientX, clientY: candidate.clientY };
  }
  return null;
}

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
  rowId: string;
  columnId: string;
  columnKey: string;
  rowIndex: number;
  columnIndex: number;
}

function ensureOrder(baseOrder: string[], incomingIds: string[]): string[] {
  const known = new Set(incomingIds);
  const preserved = baseOrder.filter((id) => known.has(id));
  const additions = incomingIds.filter((id) => !preserved.includes(id));
  return [...preserved, ...additions];
}

function ordersMatch(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
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

  const tableRef = React.useRef<HTMLDivElement>(null);
  const isResizingRef = React.useRef(false);
  const activeColumnAxisRef = React.useRef<ColumnResizeAxis | null>(null);
  const activeRowAxisRef = React.useRef<RowResizeAxis | null>(null);
  const [resizeGuide, setResizeGuide] = React.useState<ResizeGuideState | null>(null);

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

  const updateColumnGuideFromClientPoint = React.useCallback((clientX: number, clientY: number) => {
    const tableElement = tableRef.current;
    if (!tableElement) return;
    const rect = tableElement.getBoundingClientRect();
    const linePosition = clampValue(clientX - rect.left, 0, rect.width);
    const pointerOffset = clampValue(clientY - rect.top, 0, rect.height);
    setResizeGuide({
      kind: "column",
      position: linePosition,
      pointerOffset,
      tableWidth: rect.width,
      tableHeight: rect.height
    });
  }, []);

  const updateRowGuideFromClientPoint = React.useCallback((clientX: number, clientY: number) => {
    const tableElement = tableRef.current;
    if (!tableElement) return;
    const rect = tableElement.getBoundingClientRect();
    const linePosition = clampValue(clientY - rect.top, 0, rect.height);
    const pointerOffset = clampValue(clientX - rect.left, 0, rect.width);
    setResizeGuide({
      kind: "row",
      position: linePosition,
      pointerOffset,
      tableWidth: rect.width,
      tableHeight: rect.height
    });
  }, []);

  const clearGuideIfIdle = React.useCallback((kind: ResizeGuideState["kind"]) => {
    if (isResizingRef.current) return;
    setResizeGuide((current) => {
      if (!current || current.kind !== kind) return current;
      return null;
    });
  }, []);

  const updateColumnGuideFromElement = React.useCallback(
    (element: HTMLElement, event?: Event | null) => {
      const tableElement = tableRef.current;
      if (!tableElement) return;
      const tableRect = tableElement.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const axis = activeColumnAxisRef.current ?? "e";
      const rawPosition = axis === "w" ? elementRect.left - tableRect.left : elementRect.right - tableRect.left;
      const linePosition = clampValue(rawPosition, 0, tableRect.width);
      const point = resolveClientPoint(event);
      const fallbackPointerY = elementRect.top - tableRect.top + elementRect.height / 2;
      const pointerY = clampValue((point ? point.clientY - tableRect.top : fallbackPointerY), 0, tableRect.height);
      setResizeGuide({
        kind: "column",
        position: linePosition,
        pointerOffset: pointerY,
        tableWidth: tableRect.width,
        tableHeight: tableRect.height
      });
    },
    []
  );

  const updateRowGuideFromElement = React.useCallback(
    (element: HTMLElement, event?: Event | null) => {
      const tableElement = tableRef.current;
      if (!tableElement) return;
      const tableRect = tableElement.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const axis = activeRowAxisRef.current ?? "s";
      const rawPosition = axis === "s" ? elementRect.bottom - tableRect.top : elementRect.top - tableRect.top;
      const linePosition = clampValue(rawPosition, 0, tableRect.height);
      const point = resolveClientPoint(event);
      const fallbackPointerX = elementRect.left - tableRect.left + elementRect.width / 2;
      const pointerX = clampValue((point ? point.clientX - tableRect.left : fallbackPointerX), 0, tableRect.width);
      setResizeGuide({
        kind: "row",
        position: linePosition,
        pointerOffset: pointerX,
        tableWidth: tableRect.width,
        tableHeight: tableRect.height
      });
    },
    []
  );

  const cellItems = React.useMemo<CellRenderItem[]>(() => {
    const items: CellRenderItem[] = [];
    const columnCount = orderedColumns.length;

    orderedRows.forEach(({ id: rowId, row }, rowIndex) => {
      const rowLayout = rowLayoutLookup.get(rowId);
      if (!rowLayout) return;

      orderedColumns.forEach(({ id: columnId, column }, columnIndex) => {
        const columnLayout = columnLayoutLookup.get(columnId);
        if (!columnLayout) return;

        const cellId = `${rowId}::${columnId}`;
        const rowRecord = row as Record<string, unknown>;
        const rawColumnKey = column.key;
        const columnKey = rawColumnKey !== undefined && rawColumnKey !== null ? String(rawColumnKey) : columnId;
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
          value: rowRecord[columnKey] ?? null,
          isLastColumn: columnIndex === columnCount - 1,
          rowId,
          columnId,
          columnKey,
          rowIndex,
          columnIndex
        });
      });
    });

    return items;
  }, [orderedColumns, orderedRows, columnLayoutLookup, rowLayoutLookup]);

  const cellLayouts = React.useMemo<Layout[]>(() => cellItems.map((item) => item.layout), [cellItems]);

  const handleColumnDragStop = React.useCallback((nextLayout: Layout[]) => {
    const sorted = [...nextLayout].sort((a, b) => a.x - b.x);
    const nextOrder = sorted.map((item) => item.i);
    setColumnState((previous) => {
      if (ordersMatch(previous.order, nextOrder)) return previous;
      return {
        order: nextOrder,
        widths: previous.widths
      };
    });
  }, []);

  const handleColumnResizeStart = React.useCallback(
    (_layout: Layout[], _oldItem: Layout, _newItem: Layout, _placeholder: Layout, event: Event, element: HTMLElement) => {
      isResizingRef.current = true;
      if (!activeColumnAxisRef.current) {
        activeColumnAxisRef.current = "e";
      }
      if (element instanceof HTMLElement) {
        updateColumnGuideFromElement(element, event);
      }
    },
    [updateColumnGuideFromElement]
  );

  const handleColumnResize = React.useCallback(
    (_layout: Layout[], _oldItem: Layout, newItem: Layout, _placeholder: Layout, event: Event, element: HTMLElement) => {
      const axis = activeColumnAxisRef.current ?? "e";
      if (axis === "e") {
        const nextWidth = Math.max(minColumnUnits, Math.min(maxColumnUnits, newItem.w));
        setColumnState((previous) => {
          if (previous.widths[newItem.i] === nextWidth) return previous;
          return {
            order: previous.order,
            widths: { ...previous.widths, [newItem.i]: nextWidth }
          };
        });
      }
      if (element instanceof HTMLElement) {
        updateColumnGuideFromElement(element, event);
      }
    },
    [maxColumnUnits, minColumnUnits, updateColumnGuideFromElement]
  );

  const handleColumnResizeStop = React.useCallback(
    (
      _layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      _placeholder: Layout,
      event: Event,
      element: HTMLElement,
      _uniform?: UniformRowResizeEvent
    ) => {
      const nextWidth = Math.max(minColumnUnits, Math.min(maxColumnUnits, newItem.w));
      if (element instanceof HTMLElement) {
        updateColumnGuideFromElement(element, event);
      }
      isResizingRef.current = false;
      activeColumnAxisRef.current = null;
      clearGuideIfIdle("column");
      if (nextWidth === oldItem.w) return;
      setColumnState((previous) => {
        if (previous.widths[newItem.i] === nextWidth) return previous;
        return {
          order: previous.order,
          widths: { ...previous.widths, [newItem.i]: nextWidth }
        };
      });
    },
    [clearGuideIfIdle, maxColumnUnits, minColumnUnits, updateColumnGuideFromElement]
  );

  const handleRowDragStop = React.useCallback((nextLayout: Layout[]) => {
    const sorted = [...nextLayout].sort((a, b) => a.y - b.y);
    const nextOrder = sorted.map((item) => item.i);
    setRowState((previous) => {
      if (ordersMatch(previous.order, nextOrder)) return previous;
      return {
        order: nextOrder,
        heights: previous.heights
      };
    });
  }, []);

  const handleRowResizeStart = React.useCallback(
    (_layout: Layout[], _oldItem: Layout, _newItem: Layout, _placeholder: Layout, event: Event, element: HTMLElement) => {
      isResizingRef.current = true;
      if (!activeRowAxisRef.current) {
        activeRowAxisRef.current = "s";
      }
      if (element instanceof HTMLElement) {
        updateRowGuideFromElement(element, event);
      }
    },
    [updateRowGuideFromElement]
  );

  const handleRowResize = React.useCallback(
    (_layout: Layout[], _oldItem: Layout, newItem: Layout, _placeholder: Layout, event: Event, element: HTMLElement) => {
      const axis = activeRowAxisRef.current ?? "s";
      if (axis === "s") {
        const nextHeight = Math.max(minRowUnits, Math.min(maxRowUnits, newItem.h));
        setRowState((previous) => {
          if (previous.heights[newItem.i] === nextHeight) return previous;
          return {
            order: previous.order,
            heights: { ...previous.heights, [newItem.i]: nextHeight }
          };
        });
      }
      if (element instanceof HTMLElement) {
        updateRowGuideFromElement(element, event);
      }
    },
    [maxRowUnits, minRowUnits, updateRowGuideFromElement]
  );

  const handleRowResizeStop = React.useCallback(
    (
      _layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      _placeholder: Layout,
      event: Event,
      element: HTMLElement,
      _uniform?: UniformRowResizeEvent
    ) => {
      const nextHeight = Math.max(minRowUnits, Math.min(maxRowUnits, newItem.h));
      if (element instanceof HTMLElement) {
        updateRowGuideFromElement(element, event);
      }
      isResizingRef.current = false;
      activeRowAxisRef.current = null;
      clearGuideIfIdle("row");
      if (nextHeight === oldItem.h) return;
      setRowState((previous) => {
        if (previous.heights[newItem.i] === nextHeight) return previous;
        return {
          order: previous.order,
          heights: { ...previous.heights, [newItem.i]: nextHeight }
        };
      });
    },
    [clearGuideIfIdle, maxRowUnits, minRowUnits, updateRowGuideFromElement]
  );

  const renderColumnResizeHandle = React.useCallback(
    (axis: ResizeAxis, ref: React.Ref<HTMLSpanElement>) => {
      if (axis !== "e" && axis !== "w") {
        return <span ref={ref} />;
      }
      const handleAxis = axis as ColumnResizeAxis;
      return (
        <span
          ref={ref}
          role="presentation"
          data-axis={handleAxis}
          className={`grid-resize-handle grid-resize-handle-column grid-resize-handle-${handleAxis}`}
          onPointerEnter={(event) => updateColumnGuideFromClientPoint(event.clientX, event.clientY)}
          onPointerMove={(event) => updateColumnGuideFromClientPoint(event.clientX, event.clientY)}
          onPointerLeave={() => clearGuideIfIdle("column")}
          onPointerDown={(event) => {
            activeColumnAxisRef.current = handleAxis;
            updateColumnGuideFromClientPoint(event.clientX, event.clientY);
          }}
          onPointerUp={() => {
            if (isResizingRef.current) return;
            activeColumnAxisRef.current = null;
            clearGuideIfIdle("column");
          }}
        />
      );
    },
    [clearGuideIfIdle, updateColumnGuideFromClientPoint]
  );

  const renderRowResizeHandle = React.useCallback(
    (axis: ResizeAxis, ref: React.Ref<HTMLSpanElement>) => {
      if (axis !== "s") {
        return <span ref={ref} />;
      }
      const handleAxis = axis as RowResizeAxis;
      return (
        <span
          ref={ref}
          role="presentation"
          data-axis={handleAxis}
          className={`grid-resize-handle grid-resize-handle-row grid-resize-handle-${handleAxis}`}
          onPointerEnter={(event) => updateRowGuideFromClientPoint(event.clientX, event.clientY)}
          onPointerMove={(event) => updateRowGuideFromClientPoint(event.clientX, event.clientY)}
          onPointerLeave={() => clearGuideIfIdle("row")}
          onPointerDown={(event) => {
            activeRowAxisRef.current = handleAxis;
            updateRowGuideFromClientPoint(event.clientX, event.clientY);
          }}
          onPointerUp={() => {
            if (isResizingRef.current) return;
            activeRowAxisRef.current = null;
            clearGuideIfIdle("row");
          }}
        />
      );
    },
    [clearGuideIfIdle, updateRowGuideFromClientPoint]
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

  const resizeOverlay = React.useMemo(() => {
    if (!resizeGuide) return null;
    const lineColor = "rgba(37, 99, 235, 0.55)";
    const barColor = "rgba(37, 99, 235, 0.85)";

    if (resizeGuide.kind === "column") {
      const lineStyle: React.CSSProperties = {
        left: resizeGuide.position,
        top: 0,
        width: GUIDE_LINE_THICKNESS,
        height: resizeGuide.tableHeight,
        transform: `translateX(-${GUIDE_LINE_THICKNESS / 2}px)`
      };
      const barStyle: React.CSSProperties = {
        left: resizeGuide.position,
        top: clampValue(resizeGuide.pointerOffset - GUIDE_BAR_LENGTH / 2, 0, resizeGuide.tableHeight - GUIDE_BAR_LENGTH),
        width: GUIDE_BAR_THICKNESS,
        height: GUIDE_BAR_LENGTH,
        transform: `translateX(-${GUIDE_BAR_THICKNESS / 2}px)`
      };
      return (
        <div className="grid-resize-overlay pointer-events-none absolute inset-0 z-30">
          <div className="grid-resize-guide-line" style={{ ...lineStyle, backgroundColor: lineColor }} />
          <div className="grid-resize-guide-bar" style={{ ...barStyle, backgroundColor: barColor }} />
        </div>
      );
    }

    const lineStyle: React.CSSProperties = {
      top: resizeGuide.position,
      left: 0,
      height: GUIDE_LINE_THICKNESS,
      width: resizeGuide.tableWidth,
      transform: `translateY(-${GUIDE_LINE_THICKNESS / 2}px)`
    };
    const barStyle: React.CSSProperties = {
      top: resizeGuide.position,
      left: clampValue(resizeGuide.pointerOffset - GUIDE_BAR_LENGTH / 2, 0, resizeGuide.tableWidth - GUIDE_BAR_LENGTH),
      width: GUIDE_BAR_LENGTH,
      height: GUIDE_BAR_THICKNESS,
      transform: `translateY(-${GUIDE_BAR_THICKNESS / 2}px)`
    };

    return (
      <div className="grid-resize-overlay pointer-events-none absolute inset-0 z-30">
        <div className="grid-resize-guide-line" style={{ ...lineStyle, backgroundColor: lineColor }} />
        <div className="grid-resize-guide-bar" style={{ ...barStyle, backgroundColor: barColor }} />
      </div>
    );
  }, [resizeGuide]);

  return (
    <div
      ref={tableRef}
      className={["basic-react-grid-table relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-neutral-700 dark:bg-neutral-900", className]
        .filter(Boolean)
        .join(" ")}
    >
      {resizeOverlay}
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
              cols={layoutColumnSpan}
              rowHeight={headerHeight}
              margin={[0, 0]}
              containerPadding={[0, 0]}
              compactType={null}
              preventCollision
              draggableHandle=".column-drag-handle"
              resizeHandles={["e", "w"]}
              resizeHandle={renderColumnResizeHandle}
              onDragStop={handleColumnDragStop}
              onResizeStart={handleColumnResizeStart}
              onResize={handleColumnResize}
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
            margin={[0, 0]}
            containerPadding={[0, 0]}
            isResizable
            isDraggable
            compactType={null}
            preventCollision
            draggableHandle=".row-drag-handle"
            resizeHandles={["s"]}
            resizeHandle={renderRowResizeHandle}
            onDragStop={handleRowDragStop}
            onResizeStart={handleRowResizeStart}
            onResize={handleRowResize}
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
          <WidthAwareGridLayout
            className="cell-grid-layout text-sm"
            layout={cellLayouts}
            cols={layoutColumnSpan}
            rowHeight={ROW_UNIT_HEIGHT}
            margin={[0, 0]}
            containerPadding={[0, 0]}
            isDraggable={false}
            isResizable={false}
            compactType={null}
            preventCollision
            style={{ minWidth: orderedColumns.length ? "100%" : 0 }}
          >
            {cellItems.map((cell) => {
              const className = [
                "cell-item flex h-full items-center border-b border-r border-zinc-200 px-3 py-2 text-zinc-700 dark:border-neutral-700 dark:text-neutral-200",
                cell.isLastColumn ? "border-r-0" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={cell.id}
                  data-row-id={cell.rowId}
                  data-column-id={cell.columnId}
                  data-column-key={cell.columnKey}
                  role="gridcell"
                  aria-rowindex={cell.rowIndex + 1}
                  aria-colindex={cell.columnIndex + 1}
                  className={className}
                >
                  <span className="truncate">{normalizeCellValue(cell.value)}</span>
                </div>
              );
            })}
          </WidthAwareGridLayout>
          {orderedRows.length === 0 && (
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
