// utils/tableUtils.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";

/* -----------------------------------------------------------
 * 1) Existing utility exports (kept compatible with page.tsx)
 * ---------------------------------------------------------*/

export function mergeClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function createCurrencyFormatter(locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  });
}

export function createDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, options);
}

export function createHeaderAbbreviation(label: string) {
  const parts = String(label).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function formatPercentage(value: number, digits = 0) {
  const pct = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  return `${(pct * 100).toFixed(digits)}%`;
}

/* -----------------------------------------------------------
 * 2) Types for the interactive grid
 * ---------------------------------------------------------*/

export type ColumnType =
  | "singleLineText"
  | "longText"
  | "attachment"
  | "checkbox"
  | "multipleSelect"
  | "singleSelect"
  | "user"
  | "date"
  | "phone"
  | "email"
  | "url"
  | "number"
  | "currency"
  | "percent"
  | "duration"
  | "rating"
  | "formula"
  | "rollup"
  | "count"
  | "lookup"
  | "createdTime"
  | "lastModifiedTime"
  | "createdBy"
  | "lastModifiedBy"
  | "linkToRecord";

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

export interface ColumnSpec<T extends Record<string, any> = any> {
  key: keyof T | string;
  name: string;
  type: ColumnType;
  width?: number; // px
  /** Per-type configuration */
  config?: {
    number?: {
      decimals?: number;
      thousands?: boolean;
      abbreviate?: boolean; // 1,000,000 -> 1M
    };
    currency?: {
      locale?: string;
      currency?: string;
      thousandSeparator?: "local" | "comma-period" | "period-comma" | "space-comma" | "space-period";
      decimals?: number;
    };
    percent?: { decimals?: number };
    rating?: { max?: number; icon?: "star" | "heart" | "circle" };
    date?: { format?: string }; // display format only
    multipleSelect?: { options: SelectOption[] };
    singleSelect?: { options: SelectOption[] };
    checkbox?: { style?: "checkbox" | "toggle" };
    attachment?: { accept?: string };
  };
  /** For computed columns */
  formula?: (row: T, rowIndex: number, rows: T[]) => any;
  rollup?: (linked: any[]) => any;
  lookup?: (row: T) => any;
  readOnly?: boolean; // formula/rollup/lookup and system fields default to true
}

export interface InteractiveTableProps<T extends Record<string, any> = any> {
  /** Initial rows */
  rows: T[];
  /** Columns (can be re-ordered/renamed) */
  columns: ColumnSpec<T>[];
  /** Unique row id */
  getRowId?: (row: T, idx: number) => string | number;
  /** Called on any data structure change (rows/columns) */
  onChange?: (next: { rows: T[]; columns: ColumnSpec<T>[] }) => void;
  /** Optional expandable master/detail renderer */
  renderDetails?: (row: T, rowIndex: number) => React.ReactNode;
  /** Optional user directory for "user" column type */
  users?: Array<{ id: string; name: string; email?: string; avatarUrl?: string }>;
  /** Theme classes */
  classNames?: Partial<{
    container: string;
    grid: string;
    headerRow: string;
    row: string;
    cell: string;
    headerCell: string;
    resizer: string;
    plusButton: string;
    selection: string;
    editor: string;
    contextMenu: string;
    toolbar: string;
    search: string;
  }>;
  /** Start with header height (px) */
  initialHeaderHeight?: number;
  /** Minimums */
  minColumnWidth?: number;
  minRowHeight?: number;
}

/* -----------------------------------------------------------
 * 3) Internal helpers
 * ---------------------------------------------------------*/

const h = React.createElement;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function tsvToMatrix(tsv: string) {
  return tsv
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.split("\t"));
}

function matrixToTsv(matrix: string[][]) {
  return matrix.map((r) => r.join("\t")).join("\n");
}

function abbreviateNumber(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function formatNumber(
  n: number,
  cfg: NonNullable<ColumnSpec["config"]>["number"] | undefined
) {
  const decimals = cfg?.decimals ?? 0;
  const thousands = cfg?.thousands ?? true;
  const abbr = cfg?.abbreviate ?? false;
  if (!Number.isFinite(n)) return "";
  if (abbr) return abbreviateNumber(n);
  const parts = n.toFixed(decimals).split(".");
  if (thousands) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(decimals ? "." : "");
}

function formatCurrency(
  n: number,
  cfg: NonNullable<ColumnSpec["config"]>["currency"] | undefined
) {
  const locale = cfg?.locale ?? "en-US";
  const currency = cfg?.currency ?? "USD";
  const decimals = cfg?.decimals ?? 2;
  const nf = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: decimals });
  let s = nf.format(n);
  if (!cfg?.thousandSeparator || cfg.thousandSeparator === "local") return s;

  // Re-map separators for the custom options.
  const map: Record<string, { g: RegExp; repl: string; dec: string }> = {
    "comma-period": { g: /\B(?=(\d{3})+(?!\d))/g, repl: ",", dec: "." },
    "period-comma": { g: /\B(?=(\d{3})+(?!\d))/g, repl: ".", dec: "," },
    "space-comma": { g: /\B(?=(\d{3})+(?!\d))/g, repl: " ", dec: "," },
    "space-period": { g: /\B(?=(\d{3})+(?!\d))/g, repl: " ", dec: "." }
  };

  // naive rebuild: strip currency, rebuild numeric part
  const m = s.match(/(-?[\d.,\s]+)(.*)/);
  if (!m) return s;
  const raw = m[1].replace(/[^\d.-]/g, "");
  const { g, repl, dec } = map[cfg.thousandSeparator];
  const parts = Number(raw).toFixed(decimals).split(".");
  parts[0] = parts[0].replace(g, repl);
  return s.replace(/-?[\d.,\s]+/, parts.join(dec));
}

/* -----------------------------------------------------------
 * 4) History (undo/redo)
 * ---------------------------------------------------------*/

type HistoryEntry<T> = { rows: T[]; columns: ColumnSpec<T>[] };

function useHistory<T>(initial: HistoryEntry<T>) {
  const [stack, setStack] = React.useState<HistoryEntry<T>[]>([deepClone(initial)]);
  const [index, setIndex] = React.useState(0);

  const canUndo = index > 0;
  const canRedo = index < stack.length - 1;

  const push = React.useCallback((entry: HistoryEntry<T>) => {
    setStack((s) => {
      const next = s.slice(0, index + 1);
      next.push(deepClone(entry));
      return next;
    });
    setIndex((i) => i + 1);
  }, [index]);

  const undo = React.useCallback(() => {
    if (index === 0) return null;
    setIndex((i) => i - 1);
    return null;
  }, [index]);

  const redo = React.useCallback(() => {
    setIndex((i) => Math.min(i + 1, stack.length - 1));
  }, [stack.length]);

  const current = stack[index];

  return { current, push, undo, redo, canUndo, canRedo };
}

/* -----------------------------------------------------------
 * 5) Context menu & type picker (lightweight)
 * ---------------------------------------------------------*/

function useContextMenu() {
  const [menu, setMenu] = React.useState<null | {
    x: number; y: number;
    columnIndex: number;
  }>(null);

  const open = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, columnIndex });
  };
  const close = () => setMenu(null);

  return { menu, open, close };
}

const ALL_TYPES: Array<{ value: ColumnType; label: string }> = [
  { value: "linkToRecord", label: "Link to another record" },
  { value: "singleLineText", label: "Single line text" },
  { value: "longText", label: "Long text" },
  { value: "attachment", label: "Attachment" },
  { value: "checkbox", label: "Checkbox" },
  { value: "multipleSelect", label: "Multiple select" },
  { value: "singleSelect", label: "Single select" },
  { value: "user", label: "User" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Phone number" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
  { value: "duration", label: "Duration" },
  { value: "rating", label: "Rating" },
  { value: "formula", label: "Formula" },
  { value: "rollup", label: "Rollup" },
  { value: "count", label: "Count" },
  { value: "lookup", label: "Lookup" },
  { value: "createdTime", label: "Created time" },
  { value: "lastModifiedTime", label: "Last modified time" },
  { value: "createdBy", label: "Created by" },
  { value: "lastModifiedBy", label: "Last modified by" }
];

/* -----------------------------------------------------------
 * 6) The interactive grid component (no JSX to keep .ts file)
 * ---------------------------------------------------------*/

type Selection = { r0: number; c0: number; r1: number; c1: number } | null;

export function renderInteractiveTable<T extends Record<string, any> = any>(
  props: InteractiveTableProps<T>
): React.ReactElement {
  return h(InteractiveTableImpl as React.FC<InteractiveTableProps<T>>, props);
}

function InteractiveTableImpl<T extends Record<string, any> = any>(
  {
    rows: initialRows,
    columns: initialColumns,
    getRowId,
    onChange,
    renderDetails,
    users = [],
    classNames = {},
    initialHeaderHeight = 40,
    minColumnWidth = 96,
    minRowHeight = 34
  }: InteractiveTableProps<T>
) {
  /* Data & columns live in history for undo/redo */
  const history = useHistory<T>({ rows: initialRows, columns: initialColumns });
  const { current, push, undo, redo, canUndo, canRedo } = history;

  const [rows, setRows] = React.useState<T[]>(() => deepClone(current.rows));
  const [columns, setColumns] = React.useState<ColumnSpec<T>[]>(() => {
    // default readOnly for computed/system types
    return deepClone(current.columns).map((c) =>
      ({ readOnly: ["formula","rollup","lookup","createdTime","lastModifiedTime","createdBy","lastModifiedBy"].includes(c.type) ? true : c.readOnly, ...c })
    );
  });

  // sync from history index changes
  React.useEffect(() => {
    setRows(deepClone(current.rows));
    setColumns(deepClone(current.columns));
  }, [current]);

  const commit = React.useCallback((nextRows: T[] = rows, nextCols: ColumnSpec<T>[] = columns) => {
    push({ rows: nextRows, columns: nextCols });
    onChange?.({ rows: deepClone(nextRows), columns: deepClone(nextCols) });
  }, [rows, columns, push, onChange]);

  /* sizing */
  const [headerHeight, setHeaderHeight] = React.useState(initialHeaderHeight);
  const [rowHeights, setRowHeights] = React.useState<number[]>(
    () => rows.map(() => minRowHeight)
  );
  const [colWidths, setColWidths] = React.useState<number[]>(
    () => columns.map((c) => clamp(c.width ?? 160, minColumnWidth, 800))
  );

  React.useEffect(() => {
    // keep arrays aligned on insert/delete
    if (rowHeights.length !== rows.length) {
      setRowHeights((prev) => {
        const next = rows.map((_r, i) => prev[i] ?? minRowHeight);
        return next;
      });
    }
  }, [rows, rowHeights.length, minRowHeight]);

  React.useEffect(() => {
    if (colWidths.length !== columns.length) {
      setColWidths((prev) => {
        const next = columns.map((_c, i) => clamp(prev[i] ?? 160, minColumnWidth, 800));
        return next;
      });
    }
  }, [columns, colWidths.length, minColumnWidth]);

  /* selection & editing */
  const [selection, setSelection] = React.useState<Selection>(null);
  const [activeCell, setActiveCell] = React.useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = React.useState<{ r: number; c: number } | null>(null);
  const [headerEditing, setHeaderEditing] = React.useState<number | null>(null);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  function getCellValue(r: number, c: number) {
    const row = rows[r];
    const col = columns[c];
    const key = col.key as keyof T;
    if (!row || !col) return "";
    if (col.type === "formula" && typeof col.formula === "function") {
      try { return col.formula(row, r, rows); } catch { return ""; }
    }
    if (col.type === "lookup" && typeof col.lookup === "function") {
      try { return col.lookup(row); } catch { return ""; }
    }
    return (row as any)[key];
  }

  function setCellValue(r: number, c: number, value: any) {
    const col = columns[c];
    if (!col || col.readOnly) return;
    const key = col.key as keyof T;
    const next = deepClone(rows);
    (next[r] as any)[key] = value;
    setRows(next);
  }

  /* copy / paste */
  React.useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      if (!selection) return;
      const { r0, c0, r1, c1 } = selection;
      const matrix: string[][] = [];
      for (let r = r0; r <= r1; r++) {
        const row: string[] = [];
        for (let c = c0; c <= c1; c++) {
          const v = getCellValue(r, c);
          row.push(v == null ? "" : String(v));
        }
        matrix.push(row);
      }
      e.clipboardData?.setData("text/plain", matrixToTsv(matrix));
      e.preventDefault();
    }
    function onPaste(e: ClipboardEvent) {
      if (!activeCell) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      const matrix = tsvToMatrix(text);
      const baseR = activeCell.r;
      const baseC = activeCell.c;
      const next = deepClone(rows);
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          const r = baseR + i;
          const c = baseC + j;
          if (r < next.length && c < columns.length) {
            const col = columns[c];
            if (!col.readOnly) {
              (next[r] as any)[col.key as keyof T] = coerceValue(matrix[i][j], col);
            }
          }
        }
      }
      setRows(next);
      commit(next, columns);
      e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      // ctrl/cmd + f
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // undo / redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      // delete rows (if entire rows selected)
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        const { r0, r1, c0, c1 } = selection;
        // If all columns selected -> delete rows
        if (c0 === 0 && c1 === columns.length - 1) {
          const next = rows.filter((_r, idx) => idx < r0 || idx > r1);
          setRows(next);
          setSelection(null);
          commit(next, columns);
          e.preventDefault();
        } else {
          // clear cell contents
          const next = deepClone(rows);
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              const col = columns[c];
              if (!col.readOnly) (next[r] as any)[col.key as keyof T] = null;
            }
          }
          setRows(next);
          commit(next, columns);
          e.preventDefault();
        }
      }
    }

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKey);
    };
  }, [selection, activeCell, rows, columns, commit, undo, redo]);

  /* Mouse selection & fill-down drag */
  const dragRef = React.useRef<{ r0: number; c0: number } | null>(null);
  function startDrag(r: number, c: number, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { r0: r, c0: c };
    setSelection({ r0: r, c0: c, r1: r, c1: c });
    setActiveCell({ r, c });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current || !gridRef.current) return;
    const el = e.target as HTMLElement;
    const cell = el.closest("[data-r][data-c]") as HTMLElement | null;
    if (!cell) return;
    const r = Number(cell.getAttribute("data-r"));
    const c = Number(cell.getAttribute("data-c"));
    const { r0, c0 } = dragRef.current;
    setSelection({
      r0: Math.min(r0, r), c0: Math.min(c0, c),
      r1: Math.max(r0, r), c1: Math.max(c0, c)
    });
  }
  function endDrag() {
    dragRef.current = null;
  }

  /* Resize columns */
  function startColResize(idx: number, e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[idx];
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      setColWidths((w) => {
        const next = w.slice();
        next[idx] = clamp(startW + dx, minColumnWidth, 800);
        return next;
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // persist column width on spec
      const nextCols = deepClone(columns);
      nextCols[idx].width = colWidths[idx];
      setColumns(nextCols);
      commit(rows, nextCols);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Resize rows */
  function startRowResize(idx: number, e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = rowHeights[idx];
    function onMove(ev: MouseEvent) {
      const dy = ev.clientY - startY;
      setRowHeights((h) => {
        const next = h.slice();
        next[idx] = clamp(startH + dy, minRowHeight, 400);
        return next;
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Resize header (height) */
  function startHeaderResize(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = headerHeight;
    function onMove(ev: MouseEvent) {
      const dy = ev.clientY - startY;
      setHeaderHeight(clamp(startH + dy, 28, 120));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Fill-down handle (bottom-right of selection) */
  function onFillMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    if (!selection) return;
    const start = selection;
    function onMove(ev: MouseEvent) {
      const el = ev.target as HTMLElement;
      const cell = el.closest("[data-r][data-c]") as HTMLElement | null;
      if (!cell) return;
      const r = Number(cell.getAttribute("data-r"));
      const c = Number(cell.getAttribute("data-c"));
      setSelection({
        r0: start.r0, c0: start.c0,
        r1: Math.max(start.r1, r),
        c1: Math.max(start.c1, c)
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!selection) return;
      const srcVal = getCellValue(selection.r0, selection.c0);
      const next = deepClone(rows);
      for (let r = selection.r0; r <= selection.r1; r++) {
        for (let c = selection.c0; c <= selection.c1; c++) {
          const col = columns[c];
          if (!col.readOnly) (next[r] as any)[col.key as keyof T] = srcVal;
        }
      }
      setRows(next);
      commit(next, columns);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Editing */
  function beginEdit(r: number, c: number) {
    const col = columns[c];
    if (col.readOnly) return;
    setActiveCell({ r, c });
    setEditing({ r, c });
    // focus happens after input is rendered
    setTimeout(() => editorRef.current?.focus(), 0);
  }
  function commitEdit() {
    if (!editing) return;
    const { r, c } = editing;
    setEditing(null);
    commit(rows, columns);
    setActiveCell({ r, c });
  }

  /* Expand / collapse details (with optional button) */
  function toggleExpand(idx: number) {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  /* Column header: rename on double click */
  function renameColumn(idx: number, name: string) {
    const next = deepClone(columns);
    next[idx].name = name || String(next[idx].name);
    setColumns(next);
    commit(rows, next);
  }

  /* Insert / delete rows/columns */
  function addRow() {
    const template: any = {};
    for (const c of columns) template[c.key as string] = defaultValueForType(c.type);
    const next = rows.concat([template]);
    setRows(next);
    commit(next, columns);
  }
  function duplicateSelectedRows() {
    if (!selection) return;
    const { r0, r1 } = selection;
    const copies = rows.slice(r0, r1 + 1).map((x) => deepClone(x));
    const next = rows.slice(0, r1 + 1).concat(copies).concat(rows.slice(r1 + 1));
    setRows(next);
    commit(next, columns);
  }
  function deleteSelectedRows() {
    if (!selection) return;
    const { r0, r1 } = selection;
    const next = rows.filter((_r, idx) => idx < r0 || idx > r1);
    setRows(next);
    commit(next, columns);
    setSelection(null);
  }
  function addColumn() {
    const key = uniqueColumnKey(columns, "new_field");
    const nextCol: ColumnSpec<T> = { key, name: "New column", type: "singleLineText", width: 160 };
    const nextCols = columns.concat([nextCol]);
    const nextRows = rows.map((r) => ({ ...r, [key]: "" }));
    setColumns(nextCols);
    setRows(nextRows);
    commit(nextRows, nextCols);
  }
  function deleteColumn(idx: number) {
    const key = columns[idx].key as string;
    const nextCols = columns.filter((_c, i) => i !== idx);
    const nextRows = rows.map((r) => {
      const { [key]: _drop, ...rest } = r;
      return rest as T;
    });
    setColumns(nextCols);
    setRows(nextRows);
    commit(nextRows, nextCols);
  }
  function changeColumnType(idx: number, type: ColumnType) {
    const next = deepClone(columns);
    next[idx].type = type;

    // Auto readOnly for computed/system types
    next[idx].readOnly = ["formula","rollup","lookup","createdTime","lastModifiedTime","createdBy","lastModifiedBy"].includes(type);

    // Initialize cell values if needed
    const key = next[idx].key as string;
    const updatedRows = rows.map((r) => ({
      ...r,
      [key]: coerceValue((r as any)[key], next[idx])
    }));
    setColumns(next);
    setRows(updatedRows);
    commit(updatedRows, next);
  }

  /* Right-click context menu for headers */
  const menu = useContextMenu();

  /* Search box filtering (Ctrl+F) */
  const visibleRowIndexes = React.useMemo(() => {
    if (!searchTerm.trim()) return rows.map((_r, i) => i);
    const q = searchTerm.toLowerCase();
    const hit: number[] = [];
    rows.forEach((row, rIdx) => {
      const s = columns.map((c) => String(getCellValue(rIdx, columns.indexOf(c)) ?? "")).join(" ").toLowerCase();
      if (s.includes(q)) hit.push(rIdx);
    });
    return hit;
  }, [rows, columns, searchTerm]);

  /* Row & column ids for React keys */
  const rowKey = (row: T, idx: number) => String(getRowId?.(row, idx) ?? idx);
  const colKey = (col: ColumnSpec<T>, idx: number) => String(col.key ?? idx);

  /* Styles */
  const cx = (base: string, fallback: string) => classNames[base as keyof typeof classNames] || fallback;
  const baseCellClass = "relative border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm";
  const baseHeaderClass = "relative border border-zinc-300 dark:border-neutral-700 bg-zinc-100 dark:bg-neutral-800 text-xs font-semibold uppercase tracking-wide select-none";

  /* Render helpers (cell editor & display) */
  function coerceValue(input: any, col: ColumnSpec): any {
    if (input == null) return defaultValueForType(col.type);
    switch (col.type) {
      case "number":
        return Number.isFinite(Number(input)) ? Number(input) : null;
      case "currency":
        return Number.isFinite(Number(input)) ? Number(input) : null;
      case "percent":
        return Number.isFinite(Number(input)) ? Number(input) : null;
      case "checkbox":
        if (typeof input === "boolean") return input;
        return /^(true|1|yes|y)$/i.test(String(input));
      case "rating":
        return clamp(Number(input) || 0, 0, col.config?.rating?.max ?? 5);
      case "multipleSelect": {
        const str = String(input);
        const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
        const known = col.config?.multipleSelect?.options ?? [];
        const ensured = parts.map((p) => known.find((o) => o.label === p) ?? { id: p, label: p });
        return ensured;
      }
      case "singleSelect": {
        const label = String(input).trim();
        const known = col.config?.singleSelect?.options ?? [];
        return known.find((o) => o.label === label) ?? (label ? { id: label, label } : null);
      }
      case "date":
        return input ? new Date(input).toISOString() : null;
      default:
        return input;
    }
  }

  function defaultValueForType(type: ColumnType) {
    switch (type) {
      case "checkbox": return false;
      case "number":
      case "currency":
      case "percent": return 0;
      case "rating": return 0;
      case "multipleSelect": return [] as SelectOption[];
      case "singleSelect": return null as SelectOption | null;
      case "user": return null;
      case "date": return null as string | null;
      case "attachment": return [] as Array<{ name: string; url: string }>;
      case "duration": return 0; // seconds
      case "formula":
      case "rollup":
      case "count":
      case "lookup":
      case "createdTime":
      case "lastModifiedTime":
      case "createdBy":
      case "lastModifiedBy":
      case "linkToRecord":
      case "url":
      case "email":
      case "phone":
      case "singleLineText":
      case "longText":
      default:
        return "";
    }
  }

  function displayValue(v: any, col: ColumnSpec<T>) {
    switch (col.type) {
      case "number": return formatNumber(Number(v || 0), col.config?.number);
      case "currency": return formatCurrency(Number(v || 0), col.config?.currency);
      case "percent": return formatPercentage((Number(v || 0)) / 100, col.config?.percent?.decimals ?? 0);
      case "checkbox": return v ? "✓" : "";
      case "rating": {
        const max = col.config?.rating?.max ?? 5;
        const icon = col.config?.rating?.icon ?? "star";
        const filled = Number(v || 0);
        const ch = icon === "heart" ? "♥" : icon === "circle" ? "●" : "★";
        const gr = icon === "heart" ? "♡" : icon === "circle" ? "○" : "☆";
        return `${ch.repeat(filled)}${gr.repeat(Math.max(0, max - filled))}`;
      }
      case "multipleSelect": {
        const arr = Array.isArray(v) ? v as SelectOption[] : [];
        return arr.map((o) => o.label).join(", ");
      }
      case "singleSelect": return (v && (v as SelectOption).label) || "";
      case "user": {
        const u = v ? users.find((x) => x.id === v || x.name === v) : null;
        return u ? u.name : "";
      }
      case "date":
        return v ? new Date(v).toLocaleDateString() : "";
      default:
        return v ?? "";
    }
  }

  function renderCellEditor(r: number, c: number) {
    const col = columns[c];
    const val = getCellValue(r, c);
    const commonProps: any = {
      ref: (el: any) => (editorRef.current = el),
      onBlur: commitEdit,
      className: "absolute inset-0 z-20 w-full h-full px-2 py-1 text-sm bg-white dark:bg-neutral-900 outline-none ring-2 ring-blue-500",
      defaultValue: (col.type === "longText" ? String(val ?? "") : undefined)
    };

    // Editor per type
    switch (col.type) {
      case "checkbox":
        return h("div", { className: "absolute inset-0 z-20 flex items-center justify-center" },
          h("input", {
            type: "checkbox",
            checked: Boolean(val),
            onChange: (e: any) => setCellValue(r, c, e.target.checked),
            onBlur: commitEdit
          })
        );
      case "number":
      case "currency":
      case "percent":
        return h("input", {
          ...commonProps,
          type: "number",
          step: col.type === "percent" ? "1" : "any",
          defaultValue: String(val ?? "")
        });
      case "date":
        return h("input", {
          ...commonProps,
          type: "date",
          defaultValue: val ? new Date(val).toISOString().slice(0, 10) : ""
        });
      case "longText":
        return h("textarea", {
          ...commonProps,
          defaultValue: String(val ?? "")
        });
      case "multipleSelect": {
        const opts = col.config?.multipleSelect?.options ?? [];
        return h("div", { className: "absolute inset-0 z-20 flex items-center gap-2 px-2" },
          h("input", {
            className: "flex-1 rounded border px-2 py-1",
            placeholder: "Type and press Enter to add",
            onKeyDown: (e: any) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                const label = e.currentTarget.value.trim();
                const nextArr: SelectOption[] = Array.isArray(val) ? [...val] : [];
                let found = opts.find((o) => o.label === label);
                if (!found) found = { id: label, label };
                nextArr.push(found);
                setCellValue(r, c, nextArr);
                e.currentTarget.value = "";
              }
            },
            onBlur: commitEdit
          }),
          h("div", { className: "flex flex-wrap gap-1" },
            ...(Array.isArray(val) ? (val as SelectOption[]).map((o, i) =>
              h("span", {
                key: o.id + i,
                className: "rounded-full border px-2 py-0.5 text-xs"
              }, o.label)
            ) : [])
          )
        );
      }
      case "singleSelect": {
        const opts = col.config?.singleSelect?.options ?? [];
        return h("select", {
          ...commonProps,
          defaultValue: (val && (val as SelectOption).id) || "",
          onChange: (e: any) => {
            const found = opts.find((o) => o.id === e.target.value) ?? null;
            setCellValue(r, c, found);
            commitEdit();
          }
        },
          h("option", { value: "" }, "—"),
          ...opts.map((o) => h("option", { key: o.id, value: o.id }, o.label))
        );
      }
      case "attachment":
        return h("input", {
          ...commonProps,
          type: "file",
          multiple: true,
          onChange: (e: any) => {
            const files: Array<{ name: string; url: string }> = Array.from(e.target.files || []).map((f: File) => ({
              name: f.name, url: URL.createObjectURL(f)
            }));
            setCellValue(r, c, files);
            commitEdit();
          }
        });
      default:
        return h("input", {
          ...commonProps,
          type: "text",
          defaultValue: String(val ?? "")
        });
    }
  }

  /* ---- render grid ---- */

  // Header row
  const header = h("div",
    {
      className: mergeClasses(cx("headerRow", "flex relative bg-zinc-100 dark:bg-neutral-800 border-b border-zinc-300 dark:border-neutral-700")),
      style: { height: `${headerHeight}px` }
    },
    ...columns.map((col, c) => {
      const isEditing = headerEditing === c;
      return h("div",
        {
          key: colKey(col, c),
          className: mergeClasses(
            cx("headerCell", baseHeaderClass),
            "flex items-center gap-2 px-3",
          ),
          style: { width: `${colWidths[c]}px`, minWidth: `${colWidths[c]}px`, maxWidth: `${colWidths[c]}px` },
          onDoubleClick: () => setHeaderEditing(c),
          onContextMenu: (e: React.MouseEvent) => menu.open(e, c),
          role: "columnheader",
          "data-c": c
        },
        isEditing
          ? h("input", {
              className: "w-full rounded border px-2 py-1 text-sm",
              defaultValue: col.name,
              autoFocus: true,
              onBlur: (e: any) => { setHeaderEditing(null); renameColumn(c, e.target.value); },
              onKeyDown: (e: any) => {
                if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
                if (e.key === "Escape") setHeaderEditing(null);
              }
            })
          : h(React.Fragment, null,
              h("span", null, createHeaderAbbreviation(String(col.name))),
              h("span", { className: "text-zinc-600 dark:text-zinc-300 ml-2" }, String(col.name))
            ),
        // header resizer
        h("div", {
          className: mergeClasses(cx("resizer", ""), "absolute right-0 top-0 h-full w-1 cursor-col-resize"),
          onMouseDown: (e: React.MouseEvent) => startColResize(c, e)
        })
      );
    }),
    // header height resizer
    h("div", {
      className: "absolute bottom-0 left-0 right-0 h-1 cursor-row-resize",
      onMouseDown: startHeaderResize
    }),
    // "+" add column at end
    h("button", {
      className: mergeClasses(cx("plusButton", ""), "absolute -right-10 top-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs bg-white dark:bg-neutral-900"),
      onClick: addColumn,
      title: "Add column"
    }, "+")
  );

  // Body rows
  const body = h("div",
    {
      className: mergeClasses(cx("grid", "relative")),
      ref: gridRef,
      onMouseMove,
      onMouseUp: endDrag
    },
    ...rows.map((row, r) => {
      const show = visibleRowIndexes.includes(r);
      if (!show) return null;
      const isExpanded = !!expanded[r];
      return h("div",
        {
          key: rowKey(row, r),
          className: mergeClasses(cx("row", "flex relative")),
          style: { height: `${rowHeights[r]}px` },
          role: "row"
        },
        ...columns.map((col, c) => {
          const active = activeCell && activeCell.r === r && activeCell.c === c;
          const inSel = selection && r >= selection.r0 && r <= selection.r1 && c >= selection.c0 && c <= selection.c1;
          return h("div",
            {
              key: colKey(col, c),
              className: mergeClasses(cx("cell", baseCellClass), "px-2 py-1 overflow-hidden", active && "ring-2 ring-blue-500"),
              style: {
                width: `${colWidths[c]}px`,
                minWidth: `${colWidths[c]}px`,
                maxWidth: `${colWidths[c]}px`,
                userSelect: "none",
                background: inSel ? "rgba(59,130,246,0.08)" : undefined
              },
              role: "gridcell",
              "data-r": r,
              "data-c": c,
              onMouseDown: (e: React.MouseEvent) => startDrag(r, c, e),
              onDoubleClick: () => beginEdit(r, c)
            },
            editing && editing.r === r && editing.c === c
              ? renderCellEditor(r, c)
              : h("div", { className: "truncate" }, displayValue(getCellValue(r, c), col))
          );
        }),
        // row resizer handle
        h("div", {
          className: "absolute bottom-0 left-0 right-0 h-1 cursor-row-resize",
          onMouseDown: (e: React.MouseEvent) => startRowResize(r, e)
        }),
        // expand details button
        h("button", {
          className: "absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border text-xs bg-white dark:bg-neutral-900",
          onClick: () => toggleExpand(r),
          title: isExpanded ? "Collapse details" : "Expand details"
        }, isExpanded ? "−" : "+"),
        isExpanded && h("div",
          { className: "absolute left-0 right-0 translate-y-full mt-2 rounded-lg border p-3 bg-white dark:bg-neutral-900 text-sm" },
          renderDetails ? renderDetails(row, r) : h("div", null, "No details renderer provided.")
        )
      );
    }),
    // Selection border + fill handle
    selection && h("div", {
      className: mergeClasses(cx("selection", ""), "pointer-events-none absolute border-2 border-blue-500"),
      style: selectionBoxStyle(selection, colWidths, rowHeights, headerHeight)
    }),
    selection && h("div", {
      className: "absolute w-3 h-3 bg-blue-500 rounded-sm cursor-crosshair",
      style: selectionFillHandleStyle(selection, colWidths, rowHeights, headerHeight),
      onMouseDown: onFillMouseDown
    }),
    // "+" add row at bottom
    h("div", { className: "flex items-center justify-center py-3" },
      h("button", {
        className: mergeClasses(cx("plusButton", ""), "rounded-full border px-3 py-1 text-sm bg-white dark:bg-neutral-900"),
        onClick: addRow
      }, "+ Add row")
    )
  );

  /* Context menu UI */
  const contextMenu = menu.menu && h("div", {
    className: mergeClasses(cx("contextMenu",""), "fixed z-50 rounded-lg border bg-white dark:bg-neutral-900 shadow-xl p-2 text-sm"),
    style: { left: `${menu.menu.x}px`, top: `${menu.menu.y}px` },
    onMouseLeave: () => menu.close()
  },
    h("button", { className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { deleteColumn(menu.menu!.columnIndex); menu.close(); } }, "Delete column"),
    h("button", { className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { setHeaderEditing(menu.menu!.columnIndex); menu.close(); } }, "Rename column"),
    h("div", { className: "border-t my-1" }),
    h("div", { className: "px-3 py-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400" }, "Change type"),
    h("div", { className: "max-h-56 overflow-auto" },
      ...ALL_TYPES.map((opt) =>
        h("button", {
          key: opt.value,
          className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800",
          onClick: () => { changeColumnType(menu.menu!.columnIndex, opt.value); menu.close(); }
        }, opt.label)
      )
    )
  );

  /* Toolbar (undo/redo, duplicate/delete rows, search) */
  const toolbar = h("div", {
    className: mergeClasses(cx("toolbar",""), "flex items-center gap-2 py-2")
  },
    h("button", {
      className: "rounded-full border px-3 py-1 text-sm disabled:opacity-40",
      onClick: () => undo(),
      disabled: !canUndo
    }, "Undo (Ctrl+Z)"),
    h("button", {
      className: "rounded-full border px-3 py-1 text-sm disabled:opacity-40",
      onClick: () => redo(),
      disabled: !canRedo
    }, "Redo (Ctrl+Y)"),
    h("span", { className: "mx-3 text-zinc-400 select-none" }, "•"),
    h("button", {
      className: "rounded-full border px-3 py-1 text-sm",
      onClick: duplicateSelectedRows
    }, "Duplicate rows"),
    h("button", {
      className: "rounded-full border px-3 py-1 text-sm",
      onClick: deleteSelectedRows
    }, "Delete rows"),
    h("span", { className: "mx-3 text-zinc-400 select-none" }, "•"),
    h("button", {
      className: "rounded-full border px-3 py-1 text-sm",
      onClick: () => setSearchOpen((v) => !v)
    }, "Search (Ctrl+F)")
  );

  const searchBox = searchOpen && h("div", {
    className: mergeClasses(cx("search",""), "mb-2 flex items-center gap-2")
  },
    h("input", {
      className: "w-64 rounded-2xl border px-3 py-2 text-sm",
      placeholder: "Search in table…",
      value: searchTerm,
      onChange: (e: any) => setSearchTerm(e.target.value)
    }),
    h("button", { className: "rounded-full border px-3 py-1 text-sm", onClick: () => setSearchTerm("") }, "Clear")
  );

  /* Container */
  return h("div",
    { className: mergeClasses(cx("container","rounded-2xl border p-3 bg-white dark:bg-neutral-950/80")) },
    toolbar,
    searchBox,
    h("div", { className: "relative overflow-auto rounded-xl border" },
      header,
      body,
      contextMenu
    )
  );
}

/* -----------------------------------------------------------
 * 7) Layout math for selection rectangle and handle
 * ---------------------------------------------------------*/

function selectionBoxStyle(sel: Selection, colW: number[], rowH: number[], headerH: number) {
  if (!sel) return {};
  const { r0, r1, c0, c1 } = sel;
  const top = headerH + sum(rowH, 0, r0);
  const left = sum(colW, 0, c0);
  const height = sum(rowH, r0, r1 + 1);
  const width = sum(colW, c0, c1 + 1);
  return { top, left, height, width };
}

function selectionFillHandleStyle(sel: Selection, colW: number[], rowH: number[], headerH: number) {
  const box = selectionBoxStyle(sel, colW, rowH, headerH) as any;
  return {
    top: (box.top + box.height - 6) + "px",
    left: (box.left + box.width - 6) + "px"
  };
}

function sum(arr: number[], start: number, end: number) {
  let s = 0;
  for (let i = start; i < end; i++) s += arr[i] || 0;
  return s;
}

function uniqueColumnKey(cols: ColumnSpec[], base: string) {
  let i = 1;
  let k = base;
  const keys = new Set(cols.map((c) => String(c.key)));
  while (keys.has(k)) { i += 1; k = `${base}_${i}`; }
  return k;
}
