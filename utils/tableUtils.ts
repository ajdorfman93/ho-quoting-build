// utils/tableUtils.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  FaAlignLeft,
  FaCalendarAlt,
  FaCheckSquare,
  FaClock,
  FaColumns,
  FaDollarSign,
  FaEnvelope,
  FaFont,
  FaGripVertical,
  FaHashtag,
  FaHourglassHalf,
  FaLayerGroup,
  FaLink,
  FaListOl,
  FaListUl,
  FaPaperclip,
  FaPercent,
  FaPhoneAlt,
  FaProjectDiagram,
  FaSearch,
  FaStar,
  FaStream,
  FaTag,
  FaTags,
  FaTh,
  FaThLarge,
  FaUser,
  FaHistory,
  FaUserEdit,
  FaUserPlus,
  FaWpforms
} from "react-icons/fa";
import { PiFunctionFill } from "react-icons/pi";

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

type CellStyle = {
  background?: string;
  color?: string;
};

const STYLE_FIELD = "__styles";

type ViewDefinition = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  group: "primary" | "secondary";
};

const VIEW_DEFINITIONS: ViewDefinition[] = [
  { id: "grid", name: "Grid", icon: FaThLarge, colorClass: "text-blue-500", group: "primary" },
  { id: "calendar", name: "Calendar", icon: FaCalendarAlt, colorClass: "text-orange-500", group: "primary" },
  { id: "gallery", name: "Gallery", icon: FaTh, colorClass: "text-blue-500", group: "primary" },
  { id: "kanban", name: "Kanban", icon: FaColumns, colorClass: "text-green-500", group: "primary" },
  { id: "timeline", name: "Timeline", icon: FaProjectDiagram, colorClass: "text-pink-500", group: "primary" },
  { id: "list", name: "List", icon: FaListUl, colorClass: "text-blue-500", group: "primary" },
  { id: "gantt", name: "Gantt", icon: FaStream, colorClass: "text-teal-500", group: "primary" },
  { id: "form", name: "Form", icon: FaWpforms, colorClass: "text-purple-500", group: "secondary" },
  { id: "section", name: "Section", icon: FaLayerGroup, colorClass: "text-gray-500", group: "secondary" }
];

const columnTypeIconMap: Partial<Record<ColumnType, React.ComponentType<{ className?: string }>>> = {
  singleLineText: FaFont,
  longText: FaAlignLeft,
  attachment: FaPaperclip,
  checkbox: FaCheckSquare,
  multipleSelect: FaTags,
  singleSelect: FaTag,
  user: FaUser,
  date: FaCalendarAlt,
  phone: FaPhoneAlt,
  email: FaEnvelope,
  url: FaLink,
  number: FaHashtag,
  currency: FaDollarSign,
  percent: FaPercent,
  duration: FaHourglassHalf,
  rating: FaStar,
  formula: PiFunctionFill,
  rollup: FaLayerGroup,
  count: FaListOl,
  lookup: FaSearch,
  createdTime: FaClock,
  lastModifiedTime: FaHistory,
  createdBy: FaUserPlus,
  lastModifiedBy: FaUserEdit,
  linkToRecord: FaLink
};

function renderColumnIcon(type: ColumnType) {
  const Icon = columnTypeIconMap[type];
  return Icon ? h(Icon, { className: "w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-300" }) : null;
}

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
  const s = nf.format(n);
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

type HistoryEntry<T extends Record<string, any>> = { rows: T[]; columns: ColumnSpec<T>[] };

function useHistory<T extends Record<string, any>>(initial: HistoryEntry<T>) {
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

function useCellContextMenu() {
  const [menu, setMenu] = React.useState<null | {
    x: number;
    y: number;
    selection: Selection;
  }>(null);

  const open = (e: React.MouseEvent, selection: Selection) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, selection });
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
  const latestRowsRef = React.useRef(rows);
  const availableViews = React.useMemo(
    () => VIEW_DEFINITIONS.map((def) => ({ ...def, instanceId: def.id, displayName: def.name })),
    []
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activeView, setActiveView] = React.useState(() => availableViews[0]?.instanceId ?? "grid");
  const columnDragRef = React.useRef<{ from: number } | null>(null);
  const rowDragRef = React.useRef<{ from: number } | null>(null);
  const editOriginalRef = React.useRef<any>(null);
  const headerMenu = useContextMenu();
  const cellMenu = useCellContextMenu();

  // sync from history index changes
  React.useEffect(() => {
    const nextRows = deepClone(current.rows);
    const nextCols = deepClone(current.columns);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColumns(nextCols);
    latestRowsRef.current = nextRows;
  }, [current]);

  React.useEffect(() => {
    latestRowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    if (!availableViews.some((view) => view.instanceId === activeView)) {
      setActiveView(availableViews[0]?.instanceId ?? "grid");
    }
  }, [availableViews, activeView]);

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
    latestRowsRef.current = next;
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

  function displayValue(v: any, col: ColumnSpec<T>) {
    switch (col.type) {
      case "number": return formatNumber(Number(v || 0), col.config?.number);
      case "currency": return formatCurrency(Number(v || 0), col.config?.currency);
      case "percent": return formatPercentage((Number(v || 0)) / 100, col.config?.percent?.decimals ?? 0);
      case "checkbox": return v ? "☑" : "";
      case "rating": {
        const max = col.config?.rating?.max ?? 5;
        const icon = col.config?.rating?.icon ?? "star";
        const filled = Number(v || 0);
        const ch = icon === "heart" ? "❤" : icon === "circle" ? "●" : "★";
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
      latestRowsRef.current = next;
      commit(next, columns);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Editing */
  function beginEdit(r: number, c: number) {
    const col = columns[c];
    if (col.readOnly) return;
    editOriginalRef.current = deepClone(getCellValue(r, c));
    setActiveCell({ r, c });
    setEditing({ r, c });
    // focus happens after input is rendered
    setTimeout(() => editorRef.current?.focus(), 0);
  }
  function commitEdit() {
    if (!editing) return;
    const { r, c } = editing;
    editOriginalRef.current = null;
    setEditing(null);
    commit(latestRowsRef.current, columns);
    setActiveCell({ r, c });
  }
  function cancelEdit() {
    if (!editing) return;
    const { r, c } = editing;
    const col = columns[c];
    const previous = deepClone(editOriginalRef.current);
    editOriginalRef.current = null;
    if (!col) {
      setEditing(null);
      return;
    }
    setRows((prev) => {
      const next = deepClone(prev);
      if (next[r]) (next[r] as any)[col.key as keyof T] = previous;
      latestRowsRef.current = next;
      return next;
    });
    setEditing(null);
    setActiveCell({ r, c });
  }
  function handleEditorKeyDown(e: React.KeyboardEvent) {
    if (!editing) return;
    if (e.key === "Enter") {
      const colType = columns[editing.c]?.type;
      if (colType === "longText" && e.shiftKey) return;
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  function createBlankRow(): any {
    const template: any = {};
    for (const c of columns) template[c.key as string] = defaultValueForType(c.type);
    return template;
  }

  function insertRowsAt(index: number, newRows: T[], heights?: number[]) {
    if (!newRows.length) return;
    const safeIndex = clamp(index, 0, rows.length);
    const nextRows = rows.slice();
    nextRows.splice(safeIndex, 0, ...newRows.map((row) => deepClone(row)));
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setRowHeights((prev) => {
      const nextHeights = prev.slice();
      const inserts = heights && heights.length === newRows.length
        ? heights
        : newRows.map(() => minRowHeight);
      inserts.forEach((h, offset) => {
        nextHeights.splice(safeIndex + offset, 0, h ?? minRowHeight);
      });
      return nextHeights;
    });
    commit(nextRows, columns);
  }

  function removeRows(range: { start: number; end: number }) {
    const start = Math.max(0, range.start);
    const end = Math.min(rows.length - 1, range.end);
    if (end < start) return;
    const nextRows = rows.filter((_row, idx) => idx < start || idx > end);
    const nextHeights = rowHeights.filter((_height, idx) => idx < start || idx > end);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setRowHeights(nextHeights);
    setSelection(null);
    commit(nextRows, columns);
  }

  function createNewColumnSpec(baseName = "New column"): ColumnSpec<T> {
    const key = uniqueColumnKey(columns, "new_field");
    return { key, name: baseName, type: "singleLineText", width: 160 } as ColumnSpec<T>;
  }

  function insertColumnAtIndex(index: number, column?: ColumnSpec<T>) {
    const newColumn = column ?? createNewColumnSpec();
    const safeIndex = clamp(index, 0, columns.length);
    const nextCols = columns.slice();
    nextCols.splice(safeIndex, 0, { ...newColumn });
    const nextRows = rows.map((row) => ({
      ...row,
      [newColumn.key as string]: defaultValueForType(newColumn.type)
    }));
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColWidths((prev) => {
      const next = prev.slice();
      next.splice(safeIndex, 0, clamp(newColumn.width ?? 160, minColumnWidth, 800));
      return next;
    });
    commit(nextRows, nextCols);
  }

  function dropColumnStyles(row: any, key: string) {
    if (!row?.[STYLE_FIELD]) return row;
    const styles = { ...row[STYLE_FIELD] };
    delete styles[key];
    if (Object.keys(styles).length) {
      row[STYLE_FIELD] = styles;
    } else {
      delete row[STYLE_FIELD];
    }
    return row;
  }

  function removeColumnsByIndex(indices: number[]) {
    if (!indices.length) return;
    const unique = Array.from(new Set(indices.filter((idx) => idx >= 0 && idx < columns.length))).sort((a, b) => a - b);
    if (!unique.length) return;
    const keysToRemove = unique.map((idx) => columns[idx]?.key as string).filter(Boolean);
    const nextCols = columns.filter((_col, idx) => !unique.includes(idx));
    const nextRows = rows.map((row) => {
      const nextRow: any = { ...row };
      for (const key of keysToRemove) {
        delete nextRow[key];
        dropColumnStyles(nextRow, key);
      }
      return nextRow as T;
    });
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColWidths((prev) => prev.filter((_w, idx) => !unique.includes(idx)));
    commit(nextRows, nextCols);
  }

  function getCellStyle(r: number, c: number): CellStyle | null {
    const row = rows[r] as any;
    const col = columns[c];
    if (!row || !col) return null;
    const styles = row[STYLE_FIELD] as Record<string, CellStyle> | undefined;
    return styles?.[col.key as string] ?? null;
  }

  function applyCellStyleToSelection(sel: Selection, partial: Partial<CellStyle>) {
    if (!sel) return;
    const next = deepClone(rows);
    for (let r = sel.r0; r <= sel.r1; r++) {
      const row = next[r] as any;
      const styles = { ...(row[STYLE_FIELD] ?? {}) };
      for (let c = sel.c0; c <= sel.c1; c++) {
        const col = columns[c];
        if (!col) continue;
        const key = col.key as string;
        const merged = { ...(styles[key] ?? {}), ...partial };
        if (!merged.background && !merged.color) {
          delete styles[key];
        } else {
          styles[key] = merged;
        }
      }
      if (Object.keys(styles).length) {
        row[STYLE_FIELD] = styles;
      } else {
        delete row[STYLE_FIELD];
      }
    }
    setRows(next);
    latestRowsRef.current = next;
    commit(next, columns);
  }

  function clearStylesFromSelection(sel: Selection) {
    if (!sel) return;
    const next = deepClone(rows);
    for (let r = sel.r0; r <= sel.r1; r++) {
      const row = next[r] as any;
      if (!row[STYLE_FIELD]) continue;
      const styles = { ...row[STYLE_FIELD] };
      for (let c = sel.c0; c <= sel.c1; c++) {
        const col = columns[c];
        if (!col) continue;
        delete styles[col.key as string];
      }
      if (Object.keys(styles).length) {
        row[STYLE_FIELD] = styles;
      } else {
        delete row[STYLE_FIELD];
      }
    }
    setRows(next);
    latestRowsRef.current = next;
    commit(next, columns);
  }

  function selectionToMatrix(sel: Selection): string[][] {
    if (!sel) return [];
    const matrix: string[][] = [];
    for (let r = sel.r0; r <= sel.r1; r++) {
      const row: string[] = [];
      for (let c = sel.c0; c <= sel.c1; c++) {
        const v = getCellValue(r, c);
        row.push(v == null ? "" : String(v));
      }
      matrix.push(row);
    }
    return matrix;
  }

  function clearSelectionCells(sel: Selection) {
    if (!sel) return;
    const next = deepClone(rows);
    for (let r = sel.r0; r <= sel.r1; r++) {
      for (let c = sel.c0; c <= sel.c1; c++) {
        const col = columns[c];
        if (!col || col.readOnly) continue;
        (next[r] as any)[col.key as keyof T] = defaultValueForType(col.type);
      }
    }
    setRows(next);
    latestRowsRef.current = next;
    commit(next, columns);
  }

  function applyMatrixAt(matrix: string[][], baseR: number, baseC: number) {
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
    latestRowsRef.current = next;
    commit(next, columns);
  }

  /* copy / paste */
  React.useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      if (!selection) return;
      e.clipboardData?.setData("text/plain", matrixToTsv(selectionToMatrix(selection)));
      e.preventDefault();
    }
    function onPaste(e: ClipboardEvent) {
      if (!activeCell) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      const matrix = tsvToMatrix(text);
      const baseR = activeCell.r;
      const baseC = activeCell.c;
      applyMatrixAt(matrix, baseR, baseC);
      e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
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
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        const { r0, r1, c0, c1 } = selection;
        if (c0 === 0 && c1 === columns.length - 1) {
          e.preventDefault();
          removeRows({ start: r0, end: r1 });
        } else {
          e.preventDefault();
          clearSelectionCells(selection);
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
  }, [selection, activeCell, columns.length, applyMatrixAt, clearSelectionCells, removeRows, undo, redo, selectionToMatrix]);

  async function copySelectionToClipboard(sel: Selection) {
    if (!sel || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(matrixToTsv(selectionToMatrix(sel)));
    } catch {
      /* noop */
    }
  }

  async function cutSelectionRange(sel: Selection) {
    if (!sel) return;
    await copySelectionToClipboard(sel);
    clearSelectionCells(sel);
  }

  async function pasteFromClipboard(sel: Selection) {
    if (!sel || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const matrix = tsvToMatrix(text);
      applyMatrixAt(matrix, sel.r0, sel.c0);
    } catch {
      /* noop */
    }
  }

  function handleCellContextMenu(e: React.MouseEvent, r: number, c: number) {
    const within =
      selection &&
      r >= selection.r0 &&
      r <= selection.r1 &&
      c >= selection.c0 &&
      c <= selection.c1;
    const nextSelection = within ? selection! : { r0: r, r1: r, c0: c, c1: c };
    if (!within) {
      setSelection(nextSelection);
      setActiveCell({ r, c });
    }
    cellMenu.open(e, nextSelection);
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
    insertRowsAt(rows.length, [createBlankRow()]);
  }
  function duplicateSelectedRows() {
    if (!selection) return;
    const { r0, r1 } = selection;
    const copies = rows.slice(r0, r1 + 1);
    const heights = rowHeights.slice(r0, r1 + 1);
    insertRowsAt(r1 + 1, copies as T[], heights);
  }
  function deleteSelectedRows(sel: Selection = selection) {
    if (!sel) return;
    removeRows({ start: sel.r0, end: sel.r1 });
  }
  function addColumn() {
    insertColumnAtIndex(columns.length);
  }
  function deleteColumn(idx: number) {
    removeColumnsByIndex([idx]);
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
    latestRowsRef.current = updatedRows;
    commit(updatedRows, next);
  }

  function startColumnDrag(idx: number, e: React.DragEvent) {
    columnDragRef.current = { from: idx };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {
      /* no-op for browsers that disallow setData */
    }
  }

  function onColumnDragOver(idx: number, e: React.DragEvent) {
    if (!columnDragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onColumnDrop(idx: number, e: React.DragEvent) {
    if (!columnDragRef.current) return;
    e.preventDefault();
    const from = columnDragRef.current.from;
    columnDragRef.current = null;
    if (from === idx) return;
    const nextCols = columns.slice();
    const nextWidths = colWidths.slice();
    const [movedCol] = nextCols.splice(from, 1);
    const [movedWidth] = nextWidths.splice(from, 1);
    const placingAtEnd = idx >= columns.length;
    let target = placingAtEnd ? nextCols.length : idx;
    if (!placingAtEnd && from < idx) target = Math.max(0, idx - 1);
    if (target < 0) target = 0;
    if (target > nextCols.length) target = nextCols.length;
    nextCols.splice(target, 0, movedCol);
    nextWidths.splice(target, 0, movedWidth);
    setColumns(nextCols);
    setColWidths(nextWidths);
    setSelection(null);
    setActiveCell(null);
    setEditing(null);
    commit(rows, nextCols);
  }

  function endColumnDrag() {
    columnDragRef.current = null;
  }

  function startRowDrag(idx: number, e: React.DragEvent) {
    rowDragRef.current = { from: idx };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {
      /* ignore */
    }
  }

  function onRowDragOver(idx: number, e: React.DragEvent) {
    if (!rowDragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onRowDrop(idx: number, e: React.DragEvent) {
    if (!rowDragRef.current) return;
    e.preventDefault();
    const from = rowDragRef.current.from;
    rowDragRef.current = null;
    if (from === idx) return;
    const nextRows = rows.slice();
    const nextHeights = rowHeights.slice();
    const [movedRow] = nextRows.splice(from, 1);
    const [movedHeight] = nextHeights.splice(from, 1);
    const placingAtEnd = idx >= rows.length;
    let target = placingAtEnd ? nextRows.length : idx;
    if (!placingAtEnd && from < idx) target = Math.max(0, idx - 1);
    if (target < 0) target = 0;
    if (target > nextRows.length) target = nextRows.length;
    nextRows.splice(target, 0, movedRow);
    nextHeights.splice(target, 0, movedHeight);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setRowHeights(nextHeights);
    setSelection(null);
    setActiveCell(null);
    setEditing(null);
    commit(nextRows, columns);
  }

  function endRowDrag() {
    rowDragRef.current = null;
  }

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

  function renderCellEditor(r: number, c: number) {
    const col = columns[c];
    const val = getCellValue(r, c);
    const commonProps: any = {
      ref: (el: any) => (editorRef.current = el),
      onBlur: commitEdit,
      className: "absolute inset-0 z-20 w-full h-full px-2 py-1 text-sm bg-white dark:bg-neutral-900 outline-none ring-2 ring-blue-500",
      defaultValue: (col.type === "longText" ? String(val ?? "") : undefined),
      onKeyDown: handleEditorKeyDown,
      onChange: (e: any) => setCellValue(r, c, e.target.value)
    };

    // Editor per type
    switch (col.type) {
      case "checkbox":
        return h("div", { className: "absolute inset-0 z-20 flex items-center justify-center" },
          h("input", {
            type: "checkbox",
            checked: Boolean(val),
            onChange: (e: any) => setCellValue(r, c, e.target.checked),
            onBlur: commitEdit,
            onKeyDown: handleEditorKeyDown
          })
        );
      case "number":
      case "currency":
      case "percent":
        return h("input", {
          ...commonProps,
          type: "number",
          step: col.type === "percent" ? "1" : "any",
          defaultValue: String(val ?? ""),
          onChange: (e: any) => setCellValue(r, c, coerceValue(e.target.value, col))
        });
      case "date":
        return h("input", {
          ...commonProps,
          type: "date",
          defaultValue: val ? new Date(val).toISOString().slice(0, 10) : "",
          onChange: (e: any) => {
            const inputValue = e.target.value ? new Date(e.target.value).toISOString() : null;
            setCellValue(r, c, inputValue);
          }
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
            const files: Array<{ name: string; url: string }> = Array.from(
              e.target.files ?? [],
              (f: File) => ({
                name: f.name, url: URL.createObjectURL(f)
              })
            );
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
          onContextMenu: (e: React.MouseEvent) => headerMenu.open(e, c),
          role: "columnheader",
          "data-c": c,
          draggable: true,
          onDragStart: (e: React.DragEvent) => startColumnDrag(c, e),
          onDragOver: (e: React.DragEvent) => onColumnDragOver(c, e),
          onDrop: (e: React.DragEvent) => onColumnDrop(c, e),
          onDragEnd: () => endColumnDrag(),
          title: String(col.name)
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
          : h("div", { className: "flex items-center gap-2 truncate" },
              renderColumnIcon(col.type),
              h("span", { className: "truncate text-zinc-700 dark:text-zinc-200 font-medium" }, String(col.name))
            ),
        // header resizer
        h("div", {
          className: mergeClasses(cx("resizer", ""), "absolute right-0 top-0 h-full w-1 cursor-col-resize"),
          draggable: false,
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
      title: "Add column",
      onDragOver: (e: React.DragEvent) => onColumnDragOver(columns.length, e),
      onDrop: (e: React.DragEvent) => onColumnDrop(columns.length, e)
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
          role: "row",
          onDragOver: (e: React.DragEvent) => onRowDragOver(r, e),
          onDrop: (e: React.DragEvent) => onRowDrop(r, e)
        },
        h("button", {
          className: "absolute -left-16 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border bg-white dark:bg-neutral-900 flex items-center justify-center text-zinc-400 hover:text-zinc-600",
          draggable: true,
          onDragStart: (e: React.DragEvent) => { e.stopPropagation(); startRowDrag(r, e); },
          onDragEnd: () => endRowDrag(),
          title: "Drag to reorder row"
        }, h(FaGripVertical, { className: "h-3 w-3" })),
        ...columns.map((col, c) => {
          const active = activeCell && activeCell.r === r && activeCell.c === c;
          const inSel = selection && r >= selection.r0 && r <= selection.r1 && c >= selection.c0 && c <= selection.c1;
          const style: React.CSSProperties = {
            width: `${colWidths[c]}px`,
            minWidth: `${colWidths[c]}px`,
            maxWidth: `${colWidths[c]}px`,
            userSelect: "none",
            backgroundColor: undefined,
            color: undefined
          };
          const decorated = getCellStyle(r, c);
          if (decorated?.background) style.backgroundColor = decorated.background;
          if (decorated?.color) style.color = decorated.color;
          if (!decorated?.background && inSel) {
            style.backgroundColor = "rgba(59,130,246,0.08)";
          } else if (inSel) {
            style.boxShadow = "inset 0 0 0 2px rgba(59,130,246,0.35)";
          }
          return h("div",
            {
              key: colKey(col, c),
              className: mergeClasses(cx("cell", baseCellClass), "px-2 py-1 overflow-hidden", active && "ring-2 ring-blue-500"),
              style,
              role: "gridcell",
              "data-r": r,
              "data-c": c,
              onMouseDown: (e: React.MouseEvent) => startDrag(r, c, e),
              onDoubleClick: () => beginEdit(r, c),
              onContextMenu: (e: React.MouseEvent) => handleCellContextMenu(e, r, c)
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
        onClick: addRow,
        onDragOver: (e: React.DragEvent) => onRowDragOver(rows.length, e),
        onDrop: (e: React.DragEvent) => onRowDrop(rows.length, e)
      }, "+ Add row")
    )
  );

  /* Context menu UI */
  const headerContextMenu = headerMenu.menu && h("div", {
    className: mergeClasses(cx("contextMenu",""), "fixed z-50 rounded-lg border bg-white dark:bg-neutral-900 shadow-xl p-2 text-sm"),
    style: { left: `${headerMenu.menu.x}px`, top: `${headerMenu.menu.y}px` },
    onMouseLeave: () => headerMenu.close()
  },
    h("button", { className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { deleteColumn(headerMenu.menu!.columnIndex); headerMenu.close(); } }, "Delete column"),
    h("button", { className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { setHeaderEditing(headerMenu.menu!.columnIndex); headerMenu.close(); } }, "Rename column"),
    h("div", { className: "border-t my-1" }),
    h("div", { className: "px-3 py-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400" }, "Change type"),
    h("div", { className: "max-h-56 overflow-auto" },
      ...ALL_TYPES.map((opt) =>
        h("button", {
          key: opt.value,
          className: "block w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-neutral-800",
          onClick: () => { changeColumnType(headerMenu.menu!.columnIndex, opt.value); headerMenu.close(); }
        }, h("span", { className: "flex items-center gap-2" },
            renderColumnIcon(opt.value),
            h("span", null, opt.label)
          ))
      )
    )
  );

  const cellContextMenu = cellMenu.menu && (() => {
    const sel = cellMenu.menu!.selection;
    const sample = getCellStyle(sel.r0, sel.c0) || { background: "#ffffff", color: "#000000" };
    const fillValue = typeof sample.background === "string" ? sample.background : "#ffffff";
    const textValue = typeof sample.color === "string" ? sample.color : "#000000";
    return h("div", {
      className: "fixed z-50 rounded-lg border bg-white dark:bg-neutral-900 shadow-xl p-2 text-sm min-w-[200px]",
      style: { left: `${cellMenu.menu!.x}px`, top: `${cellMenu.menu!.y}px` },
      onMouseLeave: () => cellMenu.close()
    },
      h("div", { className: "flex flex-col gap-1" },
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await cutSelectionRange(sel); cellMenu.close(); } }, "Cut"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await copySelectionToClipboard(sel); cellMenu.close(); } }, "Copy"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await pasteFromClipboard(sel); cellMenu.close(); } }, "Paste"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { clearSelectionCells(sel); cellMenu.close(); } }, "Delete"),
        h("div", { className: "border-t my-1" }),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertRowsAt(sel.r0, [createBlankRow()]); cellMenu.close(); } }, "Insert row above"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertRowsAt(sel.r1 + 1, [createBlankRow()]); cellMenu.close(); } }, "Insert row below"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertColumnAtIndex(sel.c0); cellMenu.close(); } }, "Insert column left"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertColumnAtIndex(sel.c1 + 1); cellMenu.close(); } }, "Insert column right"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { removeRows({ start: sel.r0, end: sel.r1 }); cellMenu.close(); } }, "Delete row"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { const indices = Array.from({ length: sel.c1 - sel.c0 + 1 }, (_v, i) => sel.c0 + i); removeColumnsByIndex(indices); cellMenu.close(); } }, "Delete column")
      ),
      h("div", { className: "border-t my-2" }),
      h("div", { className: "px-3 py-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400" }, "Colors"),
      h("div", { className: "flex items-center gap-3 px-3 pb-2" },
        h("label", { className: "flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-300" },
          "Fill",
          h("input", {
            type: "color",
            value: fillValue,
            onChange: (e: any) => applyCellStyleToSelection(sel, { background: e.target.value })
          })
        ),
        h("label", { className: "flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-300" },
          "Text",
          h("input", {
            type: "color",
            value: textValue,
            onChange: (e: any) => applyCellStyleToSelection(sel, { color: e.target.value })
          })
        )
      ),
      h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 w-full", onClick: () => { clearStylesFromSelection(sel); cellMenu.close(); } }, "Clear colors")
    );
  })();

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

  const primaryViews = availableViews.filter((view) => view.group === "primary");
  const secondaryViews = availableViews.filter((view) => view.group === "secondary");

  const renderViewButton = (view: (typeof availableViews)[number]) => {
    const isActive = activeView === view.instanceId;
    return h("button", {
      key: view.instanceId,
      type: "button",
      className: mergeClasses(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
          : "hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-600 dark:text-zinc-200",
        sidebarCollapsed && "justify-center px-0"
      ),
      onClick: () => setActiveView(view.instanceId),
      title: view.displayName
    },
      h(view.icon, { className: mergeClasses("h-4 w-4", view.colorClass) }),
      !sidebarCollapsed && h("span", { className: "truncate" }, view.displayName)
    );
  };

  const sidebarToggle = h("button", {
    type: "button",
    className: "mb-3 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-neutral-800",
    onClick: () => setSidebarCollapsed((v) => !v),
    title: sidebarCollapsed ? "Expand views" : "Collapse views"
  }, sidebarCollapsed ? "»" : "«");

  const sidebarElement = h("aside", {
    className: mergeClasses(
      "rounded-2xl border bg-white dark:bg-neutral-950/80 p-3 transition-all",
      sidebarCollapsed ? "w-16" : "w-60",
      "shrink-0"
    )
  },
    sidebarToggle,
    h("div", { className: "flex flex-col gap-1" },
      ...primaryViews.map(renderViewButton),
      secondaryViews.length ? h("div", { className: "border-t my-2" }) : null,
      ...secondaryViews.map(renderViewButton)
    )
  );

  const tableContent = h("div", { className: "relative overflow-auto rounded-xl border" },
    header,
    body
  );

  /* Container */
  const mainContent = h("div",
    { className: mergeClasses(cx("container","rounded-2xl border p-3 bg-white dark:bg-neutral-950/80 flex-1")) },
    toolbar,
    searchBox,
    tableContent
  );

  return h("div",
    { className: "flex gap-4 items-start" },
    sidebarElement,
    mainContent,
    headerContextMenu,
    cellContextMenu
  );
}

/* -----------------------------------------------------------
 * 7) Layout math for selection rectangle and handle
 * ---------------------------------------------------------*/

const SELECTION_VERTICAL_OFFSET = -40;

function selectionBoxStyle(sel: Selection, colW: number[], rowH: number[], headerH: number) {
  if (!sel) return {};
  const { r0, r1, c0, c1 } = sel;
  const top = headerH + sum(rowH, 0, r0) + SELECTION_VERTICAL_OFFSET;
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
