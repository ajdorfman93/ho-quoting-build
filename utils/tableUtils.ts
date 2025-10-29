// utils/tableUtils.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaArrowLeft,
  FaArrowRight,
  FaBold,
  FaCalendarAlt,
  FaCheckSquare,
  FaCheck,
  FaChevronDown,
  FaClone,
  FaClock,
  FaColumns,
  FaDollarSign,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFilter,
  FaFont,
  FaHeart,
  FaGripVertical,
  FaHashtag,
  FaHourglassHalf,
  FaInfoCircle,
  FaItalic,
  FaLayerGroup,
  FaLink,
  FaListOl,
  FaListUl,
  FaLock,
  FaPaperclip,
  FaPalette,
  FaPencilAlt,
  FaPercent,
  FaPhoneAlt,
  FaProjectDiagram,
  FaSearch,
  FaSlidersH,
  FaSortAmountDown,
  FaSortAmountUp,
  FaStar,
  FaTimes,
  FaStream,
  FaTag,
  FaTags,
  FaTextHeight,
  FaTh,
  FaThLarge,
  FaCircle,
  FaUnderline,
  FaUser,
  FaHistory,
  FaUserEdit,
  FaUserPlus,
  FaTrash,
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
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

const STYLE_FIELD = "__styles";

type HiddenColumnEntry<T extends Record<string, any> = any> = {
  column: ColumnSpec<T>;
  index: number;
  values: any[];
  styles: Array<CellStyle | null>;
  width: number;
};

type ConfirmAction<T extends Record<string, any> = any> =
  | { type: "deleteRows"; range: { start: number; end: number; count: number } }
  | { type: "deleteColumns"; indices: number[]; columns: Array<ColumnSpec<T>> };

type ViewDefinition = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  group: "primary" | "secondary";
};

const ROW_HEIGHT_PRESETS = {
  short: 34,
  medium: 52,
  tall: 76,
  extraTall: 104
} as const;

type RowHeightPreset = keyof typeof ROW_HEIGHT_PRESETS;
const ROW_COLOR_PALETTE = ["#22d3ee", "#fb7185", "#f97316", "#22c55e", "#818cf8", "#facc15", "#14b8a6", "#f472b6"] as const;

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

type RGBColor = { r: number; g: number; b: number };
type OptionPillStyle = { backgroundColor: string; borderColor: string; color: string };

const DEFAULT_OPTION_PILL_STYLE: OptionPillStyle = {
  backgroundColor: "rgba(63,63,70,0.85)",
  borderColor: "rgba(148,163,184,0.25)",
  color: "#f8fafc"
};

function parseHexColor(input?: string | null): RGBColor | null {
  if (!input) return null;
  const hex = input.trim();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  let value = match[1];
  if (value.length === 3) {
    value = value.split("").map((ch) => ch + ch).join("");
  }
  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff
  };
}

function mixWithWhite(base: RGBColor, amount: number): RGBColor {
  const clampAmount = Math.max(0, Math.min(1, amount));
  return {
    r: Math.round(base.r + (255 - base.r) * clampAmount),
    g: Math.round(base.g + (255 - base.g) * clampAmount),
    b: Math.round(base.b + (255 - base.b) * clampAmount)
  };
}

function rgbToCss(rgb: RGBColor, alpha = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function readableTextColor(background: RGBColor): string {
  const luminance = 0.2126 * background.r + 0.7152 * background.g + 0.0722 * background.b;
  return luminance > 150 ? "#111827" : "#f8fafc";
}

function optionPillStylesFromColor(color?: string | null): OptionPillStyle {
  const rgb = parseHexColor(color);
  if (!rgb) return DEFAULT_OPTION_PILL_STYLE;
  const background = mixWithWhite(rgb, 0.65);
  const border = mixWithWhite(rgb, 0.4);
  return {
    backgroundColor: rgbToCss(background),
    borderColor: rgbToCss(border),
    color: readableTextColor(background)
  };
}

function resolveOptionMeta<T extends Record<string, any>>(
  column: ColumnSpec<T>,
  value: unknown
): SelectOption | null {
  if (value == null || value === "") return null;
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<SelectOption>)
      : null;
  const rawId = candidate?.id ?? (typeof value === "string" ? value : undefined);
  const rawLabel = candidate?.label ?? (typeof value === "string" ? value : undefined);
  const id = rawId != null ? String(rawId).trim() : "";
  const label = rawLabel != null ? String(rawLabel).trim() : id;

  const available =
    column.config?.singleSelect?.options ??
    column.config?.multipleSelect?.options ??
    [];

  const match =
    available.find((opt) => {
      const optId = opt.id != null ? String(opt.id).trim() : "";
      const optLabel = opt.label != null ? String(opt.label).trim() : "";
      if (id && optId && optId.localeCompare(id, undefined, { sensitivity: "accent" }) === 0) return true;
      if (label && optLabel && optLabel.localeCompare(label, undefined, { sensitivity: "accent" }) === 0) return true;
      return false;
    }) ?? null;

  if (match) {
    return {
      ...match,
      color: candidate?.color ?? match.color
    };
  }

  if (!id && !label) return null;
  return {
    id: id || label || "",
    label: label || id || "",
    color: candidate?.color
  };
}

function optionIdentifier(option: Partial<SelectOption> | null | undefined): string {
  if (!option) return "";
  const raw = option.id ?? option.label ?? "";
  return String(raw);
}

export interface ColumnSpec<T extends Record<string, any> = any> {
  key: keyof T | string;
  name: string;
  type: ColumnType;
  width?: number; // px
  description?: string;
  permissions?: string;
  hidden?: boolean;
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
    rowNumberHeader: string;
    rowNumberCell: string;
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
  /** Infinite scrolling support */
  hasMoreRows?: boolean;
  loadingMoreRows?: boolean;
  onLoadMoreRows?: () => void | Promise<void>;
  /** Optional explicit virtualization overscan in px */
  virtualizationOverscan?: number;
}

/* -----------------------------------------------------------
 * 3) Internal helpers
 * ---------------------------------------------------------*/

const h = React.createElement;
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
type DropdownPlacement = "top" | "bottom";

interface FloatingAnchorPosition {
  x: number;
  y: number;
  columnIndex: number;
  anchorRect?: DOMRect | DOMRectReadOnly | null;
  anchorElement?: HTMLElement | null;
  align?: "start" | "center" | "end";
  side?: DropdownPlacement;
  offset?: number;
}

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

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [
    String(mins).padStart(2, "0"),
    String(secs).padStart(2, "0")
  ];
  if (hrs > 0) parts.unshift(String(hrs));
  return parts.join(":");
}

function formatDateValue(value: unknown, format?: string): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) return "";
  if (!format) {
    return date.toLocaleDateString(undefined, { dateStyle: "medium" });
  }
  const token = format.toLowerCase();
  switch (token) {
    case "iso":
      return date.toISOString();
    case "iso-date":
      return date.toISOString().split("T")[0] ?? date.toISOString();
    case "short":
      return date.toLocaleDateString(undefined, { dateStyle: "short" });
    case "medium":
      return date.toLocaleDateString(undefined, { dateStyle: "medium" });
    case "long":
      return date.toLocaleDateString(undefined, { dateStyle: "long" });
    case "full":
      return date.toLocaleDateString(undefined, { dateStyle: "full" });
    case "time":
      return date.toLocaleTimeString(undefined, { timeStyle: "short" });
    case "datetime":
      return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    default:
      return date.toLocaleDateString(undefined, { dateStyle: "medium" });
  }
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => stringifyValue(v)).filter(Boolean).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function displayValue<T extends Record<string, any>>(value: unknown, column: ColumnSpec<T>): React.ReactNode {
  switch (column.type) {
    case "checkbox":
      return value ? h(FaCheck, { className: "mx-auto text-emerald-500" }) : "";
    case "number": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? formatNumber(num, column.config?.number) : "";
    }
    case "currency": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? formatCurrency(num, column.config?.currency) : "";
    }
    case "percent": {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) return "";
      const normalized = Math.abs(num) <= 1 ? num : num / 100;
      const digits = column.config?.percent?.decimals ?? 0;
      return formatPercentage(normalized, digits);
    }
    case "rating": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? String(num) : "";
    }
    case "date":
    case "createdTime":
    case "lastModifiedTime":
      return formatDateValue(value, column.config?.date?.format);
    case "duration": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? formatDuration(num) : "";
    }
    case "multipleSelect": {
      const options = Array.isArray(value) ? value : [];
      if (!options.length) return "";
      const pills = options
        .map((opt) => resolveOptionMeta(column, opt))
        .filter((opt): opt is SelectOption => Boolean(opt))
        .map((opt) => {
          const pillStyle = optionPillStylesFromColor(opt.color);
          return h("span", {
            key: optionIdentifier(opt),
            className: "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            style: pillStyle
          }, opt.label);
        });
      return h("div", { className: "flex flex-wrap gap-1" }, ...pills);
    }
    case "singleSelect": {
      const option = resolveOptionMeta(column, value);
      if (!option) return stringifyValue(value);
      const pillStyle = optionPillStylesFromColor(option.color);
      return h("span", {
        className: "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        style: pillStyle
      }, option.label);
    }
    case "attachment": {
      const files = Array.isArray(value) ? value : [];
      if (!files.length) return "";
      return h("div", { className: "flex flex-wrap gap-1" },
        ...files.map((file, idx) => {
          const label = (file && typeof file === "object" && "name" in file) ? String((file as any).name ?? `File ${idx + 1}`) : stringifyValue(file);
          return h("span", {
            key: `${idx}-${label}`,
            className: "inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:border-neutral-600 dark:text-neutral-200"
          }, label);
        })
      );
    }
    case "url": {
      const text = stringifyValue(value);
      if (!text) return "";
      return h("a", {
        href: text,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
      }, text);
    }
    case "email": {
      const text = stringifyValue(value);
      if (!text) return "";
      return h("a", {
        href: `mailto:${text}`,
        className: "text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
      }, text);
    }
    case "phone": {
      const text = stringifyValue(value);
      if (!text) return "";
      return h("a", {
        href: `tel:${text.replace(/\s+/g, "")}`,
        className: "text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
      }, text);
    }
    case "user": {
      if (!value) return "";
      if (Array.isArray(value)) {
        const names = value.map((v) => {
          if (typeof v === "string") return v;
          if (v && typeof v === "object") {
            const maybeUser = v as { name?: string; email?: string; id?: string };
            return maybeUser.name ?? maybeUser.email ?? maybeUser.id ?? "";
          }
          return "";
        }).filter(Boolean);
        return names.join(", ");
      }
      if (typeof value === "object") {
        const user = value as { name?: string; email?: string; id?: string };
        return user.name ?? user.email ?? user.id ?? "";
      }
      return stringifyValue(value);
    }
    case "linkToRecord":
    case "lookup":
    case "rollup":
    case "formula":
    case "count":
    case "singleLineText":
    case "longText":
    default:
      return stringifyValue(value);
  }
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
  const [menu, setMenu] = React.useState<FloatingAnchorPosition | null>(null);

  const open = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect?.() ?? null;
    setMenu({
      x: e.clientX,
      y: e.clientY,
      columnIndex,
      anchorRect: rect,
      anchorElement: target,
      align: "start",
      side: "bottom",
      offset: 8
    });
  };
  const openAt = (coords: FloatingAnchorPosition) => {
    setMenu({ ...coords, offset: coords.offset ?? 8 });
  };
  const close = () => setMenu(null);

  return { menu, open, openAt, close };
}

function useAutoDropdownPlacement(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
  options?: { defaultPlacement?: DropdownPlacement; offset?: number }
) {
  const { defaultPlacement = "bottom", offset = 8 } = options ?? {};
  const [placement, setPlacement] = React.useState<DropdownPlacement>(defaultPlacement);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      let nextPlacement: DropdownPlacement = defaultPlacement;

      if (defaultPlacement === "bottom") {
        nextPlacement =
          spaceBelow >= menuRect.height + offset || spaceBelow >= spaceAbove
            ? "bottom"
            : "top";
      } else {
        nextPlacement =
          spaceAbove >= menuRect.height + offset || spaceAbove >= spaceBelow
            ? "top"
            : "bottom";
      }

      setPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));

      const availableSpace = nextPlacement === "bottom" ? spaceBelow : spaceAbove;
      if (availableSpace < menuRect.height + offset) {
        const maxHeight = Math.max(availableSpace - offset, 160);
        menu.style.maxHeight = `${Math.max(120, maxHeight)}px`;
        menu.style.overflowY = "auto";
      } else {
        menu.style.maxHeight = "";
        menu.style.overflowY = "";
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, triggerRef, menuRef, defaultPlacement, offset]);

  React.useEffect(() => {
    if (!isOpen) {
      setPlacement(defaultPlacement);
      const menu = menuRef.current;
      if (menu) {
        menu.style.maxHeight = "";
        menu.style.overflowY = "";
      }
    }
  }, [isOpen, defaultPlacement, menuRef]);

  return placement;
}

interface FloatingMenuSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  anchorElement?: HTMLElement | null;
  anchorRect?: DOMRect | DOMRectReadOnly | null;
  align?: "start" | "center" | "end";
  side?: DropdownPlacement;
  offset?: number;
  point?: { x: number; y: number };
}

function FloatingMenuSurface({
  anchorElement,
  anchorRect,
  align = "start",
  side = "bottom",
  offset = 8,
  point,
  className,
  style,
  children,
  ...rest
}: FloatingMenuSurfaceProps) {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<{ left: number; top: number }>({
    left: point?.x ?? 0,
    top: point?.y ?? 0
  });
  const [placement, setPlacement] = React.useState<DropdownPlacement>(side);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const updatePosition = () => {
      const el = menuRef.current;
      if (!el) return;
      const offsetValue = offset ?? 8;
      const resolvedAnchorRect =
        anchorElement?.getBoundingClientRect?.() ?? anchorRect ?? null;
      const rect = el.getBoundingClientRect();
      let left = point?.x ?? coords.left;
      let top = point?.y ?? coords.top;
      let nextPlacement: DropdownPlacement = side ?? "bottom";

      if (resolvedAnchorRect) {
        const alignValue = align ?? "start";
        if (alignValue === "center") {
          left = resolvedAnchorRect.left + resolvedAnchorRect.width / 2 - rect.width / 2;
        } else if (alignValue === "end") {
          left = resolvedAnchorRect.right - rect.width;
        } else {
          left = resolvedAnchorRect.left;
        }

        const spaceBelow = window.innerHeight - resolvedAnchorRect.bottom;
        const spaceAbove = resolvedAnchorRect.top;

        if ((side ?? "bottom") === "bottom") {
          nextPlacement =
            spaceBelow >= rect.height + offsetValue || spaceBelow >= spaceAbove
              ? "bottom"
              : "top";
        } else {
          nextPlacement =
            spaceAbove >= rect.height + offsetValue || spaceAbove >= spaceBelow
              ? "top"
              : "bottom";
        }

        top =
          nextPlacement === "bottom"
            ? resolvedAnchorRect.bottom + offsetValue
            : resolvedAnchorRect.top - rect.height - offsetValue;

        const availableVertical =
          nextPlacement === "bottom" ? spaceBelow : spaceAbove;
        if (availableVertical < rect.height + offsetValue) {
          const maxHeight = Math.max(availableVertical - offsetValue, 160);
          el.style.maxHeight = `${Math.max(120, maxHeight)}px`;
          el.style.overflowY = "auto";
        } else {
          el.style.maxHeight = "";
          el.style.overflowY = "";
        }
      } else if (point) {
        const maxLeft = window.innerWidth - rect.width - offsetValue;
        const maxTop = window.innerHeight - rect.height - offsetValue;
        left = clamp(point.x, offsetValue, Math.max(offsetValue, maxLeft));
        top = clamp(point.y, offsetValue, Math.max(offsetValue, maxTop));
        el.style.maxHeight = "";
        el.style.overflowY = "";
      }

      left = clamp(
        left,
        offsetValue,
        Math.max(offsetValue, window.innerWidth - rect.width - offsetValue)
      );
      top = clamp(
        top,
        offsetValue,
        Math.max(offsetValue, window.innerHeight - rect.height - offsetValue)
      );

      setCoords((prev) =>
        Math.abs(prev.left - left) > 0.5 || Math.abs(prev.top - top) > 0.5
          ? { left, top }
          : prev
      );
      setPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    anchorElement,
    anchorRect,
    align,
    side,
    offset,
    point?.x,
    point?.y,
    children
  ]);

  React.useEffect(() => {
    const element = menuRef.current;
    return () => {
      if (element) {
        element.style.maxHeight = "";
        element.style.overflowY = "";
      }
    };
  }, []);

  // eslint-disable-next-line react-hooks/refs
  return h("div", {
    ref: menuRef,
    className,
    style: {
      ...style,
      position: "fixed",
      left: `${coords.left}px`,
      top: `${coords.top}px`
    },
    "data-placement": placement,
    ...rest
  }, children);
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
const ROW_NUMBER_COLUMN_WIDTH = 52;

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
    minRowHeight = 34,
    hasMoreRows = false,
    loadingMoreRows,
    onLoadMoreRows,
    virtualizationOverscan = 200
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
  const [activeView, setActiveView] = React.useState(() => availableViews[0]?.instanceId ?? "grid");
  const [viewsDropdownOpen, setViewsDropdownOpen] = React.useState(false);
  const viewsTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const viewsDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const viewsDropdownId = React.useId();
  const [fieldsMenuOpen, setFieldsMenuOpen] = React.useState(false);
  const [fieldsSearchTerm, setFieldsSearchTerm] = React.useState("");
  const fieldsButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const fieldsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const fieldsSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const fieldsSearchInputId = React.useId();
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const filterButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = React.useState(false);
  const groupButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const groupMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = React.useState(false);
  const sortButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [colorMenuOpen, setColorMenuOpen] = React.useState(false);
  const colorButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const colorMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [rowHeightMenuOpen, setRowHeightMenuOpen] = React.useState(false);
  const rowHeightButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const rowHeightMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [rowHeightPreset, setRowHeightPreset] = React.useState<RowHeightPreset>("short");
  const rowHeightPresetRef = React.useRef<RowHeightPreset>("short");
  const [wrapHeaders, setWrapHeaders] = React.useState(false);
  const selectAllCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const [hoveredRowHeader, setHoveredRowHeader] = React.useState<number | null>(null);
  React.useEffect(() => {
    rowHeightPresetRef.current = rowHeightPreset;
  }, [rowHeightPreset]);
  const [filterDraftColumn, setFilterDraftColumn] = React.useState<string>("");
  const [filterDraftOperator, setFilterDraftOperator] = React.useState<"contains" | "equals">("contains");
  const [filterDraftValue, setFilterDraftValue] = React.useState("");
  const [activeFilters, setActiveFilters] = React.useState<Array<{ columnKey: string; operator: "contains" | "equals"; term: string }>>([]);
  const [sortConfig, setSortConfig] = React.useState<{ columnKey: string; direction: "asc" | "desc" } | null>(null);
  const [groupConfig, setGroupConfig] = React.useState<{ columnKey: string } | null>(null);
  const [colorConfig, setColorConfig] = React.useState<{ columnKey: string } | null>(null);
  const columnDragRef = React.useRef<{ from: number } | null>(null);
  const rowDragRef = React.useRef<{ from: number } | null>(null);
  const editOriginalRef = React.useRef<any>(null);
  const headerMenu = useContextMenu();
  const cellMenu = useCellContextMenu();
  const formatClipboardRef = React.useRef<CellStyle | null>(null);
  const [ratingPreview, setRatingPreview] = React.useState<{ r: number; c: number; value: number } | null>(null);
  const [columnDragHover, setColumnDragHover] = React.useState<{ from: number; to: number } | null>(null);
  const [rowDragHover, setRowDragHover] = React.useState<{ from: number; to: number } | null>(null);
  const viewsDropdownPlacement = useAutoDropdownPlacement(viewsDropdownOpen, viewsTriggerRef, viewsDropdownRef, { offset: 8 });
  const fieldsMenuPlacement = useAutoDropdownPlacement(fieldsMenuOpen, fieldsButtonRef, fieldsMenuRef, { offset: 8 });
  const filterMenuPlacement = useAutoDropdownPlacement(filterMenuOpen, filterButtonRef, filterMenuRef, { offset: 8 });
  const groupMenuPlacement = useAutoDropdownPlacement(groupMenuOpen, groupButtonRef, groupMenuRef, { offset: 8 });
  const sortMenuPlacement = useAutoDropdownPlacement(sortMenuOpen, sortButtonRef, sortMenuRef, { offset: 8 });
  const colorMenuPlacement = useAutoDropdownPlacement(colorMenuOpen, colorButtonRef, colorMenuRef, { offset: 8 });
  const rowHeightMenuPlacement = useAutoDropdownPlacement(rowHeightMenuOpen, rowHeightButtonRef, rowHeightMenuRef, { offset: 8 });
  const activeViewDefinition = React.useMemo(
    () => availableViews.find((view) => view.instanceId === activeView),
    [availableViews, activeView]
  );
  const ActiveViewIcon = (activeViewDefinition?.icon ?? FaThLarge) as React.ComponentType<{ className?: string }>;
  const activeViewLabel = activeViewDefinition?.displayName ?? "Grid view";

  // sync from history index changes
  React.useEffect(() => {
    const nextRows = deepClone(current.rows);
    const nextCols = deepClone(current.columns);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColumns(nextCols);
    latestRowsRef.current = nextRows;
    setRowHeights(nextRows.map(() => ROW_HEIGHT_PRESETS[rowHeightPresetRef.current]));
  }, [current]);

  React.useEffect(() => {
    latestRowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    if (!availableViews.some((view) => view.instanceId === activeView)) {
      setActiveView(availableViews[0]?.instanceId ?? "grid");
    }
  }, [availableViews, activeView]);

  const closeAllMenus = React.useCallback(() => {
    setViewsDropdownOpen(false);
    setFieldsMenuOpen(false);
    setFilterMenuOpen(false);
    setGroupMenuOpen(false);
    setSortMenuOpen(false);
    setColorMenuOpen(false);
    setRowHeightMenuOpen(false);
  }, []);

  React.useEffect(() => {
    if (!(viewsDropdownOpen || fieldsMenuOpen || filterMenuOpen || groupMenuOpen || sortMenuOpen || colorMenuOpen || rowHeightMenuOpen)) {
      return;
    }
    const menus = [
      { open: viewsDropdownOpen, trigger: viewsTriggerRef as React.RefObject<HTMLElement>, menu: viewsDropdownRef as React.RefObject<HTMLElement> },
      { open: fieldsMenuOpen, trigger: fieldsButtonRef as React.RefObject<HTMLElement>, menu: fieldsMenuRef as React.RefObject<HTMLElement> },
      { open: filterMenuOpen, trigger: filterButtonRef as React.RefObject<HTMLElement>, menu: filterMenuRef as React.RefObject<HTMLElement> },
      { open: groupMenuOpen, trigger: groupButtonRef as React.RefObject<HTMLElement>, menu: groupMenuRef as React.RefObject<HTMLElement> },
      { open: sortMenuOpen, trigger: sortButtonRef as React.RefObject<HTMLElement>, menu: sortMenuRef as React.RefObject<HTMLElement> },
      { open: colorMenuOpen, trigger: colorButtonRef as React.RefObject<HTMLElement>, menu: colorMenuRef as React.RefObject<HTMLElement> },
      { open: rowHeightMenuOpen, trigger: rowHeightButtonRef as React.RefObject<HTMLElement>, menu: rowHeightMenuRef as React.RefObject<HTMLElement> }
    ];
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const insideActiveMenu = menus.some((entry) => {
        if (!entry.open) return false;
        return Boolean(entry.menu.current?.contains(target) || entry.trigger.current?.contains(target));
      });
      if (!insideActiveMenu) {
        closeAllMenus();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewsDropdownOpen, fieldsMenuOpen, filterMenuOpen, groupMenuOpen, sortMenuOpen, colorMenuOpen, rowHeightMenuOpen, closeAllMenus]);

  const commit = React.useCallback((nextRows: T[] = rows, nextCols: ColumnSpec<T>[] = columns) => {
    push({ rows: nextRows, columns: nextCols });
    onChange?.({ rows: deepClone(nextRows), columns: deepClone(nextCols) });
  }, [rows, columns, push, onChange]);

  /* sizing */
  const [headerHeight, setHeaderHeight] = React.useState(initialHeaderHeight);
  const [rowHeights, setRowHeights] = React.useState<number[]>(
    () => rows.map(() => ROW_HEIGHT_PRESETS[rowHeightPreset])
  );
  const [colWidths, setColWidths] = React.useState<number[]>(
    () => columns.map((c) => clamp(c.width ?? 160, minColumnWidth, 800))
  );

  React.useEffect(() => {
    if (rowHeights.length !== rows.length) {
      const height = ROW_HEIGHT_PRESETS[rowHeightPresetRef.current];
      setRowHeights((prev) => rows.map((_r, i) => prev[i] ?? height));
    }
  }, [rows, rowHeights.length]);
  React.useEffect(() => {
    const target = wrapHeaders ? Math.max(initialHeaderHeight, 64) : initialHeaderHeight;
    setHeaderHeight((prev) => {
      if (wrapHeaders && prev < target) return target;
      if (!wrapHeaders && prev !== target) return target;
      return prev;
    });
  }, [wrapHeaders, initialHeaderHeight]);
  const applyRowHeightPreset = React.useCallback((preset: RowHeightPreset) => {
    const height = ROW_HEIGHT_PRESETS[preset];
    setRowHeightPreset(preset);
    setRowHeights(() => Array.from({ length: latestRowsRef.current.length }, () => height));
  }, []);

  React.useEffect(() => {
    if (colWidths.length !== columns.length) {
      setColWidths((prev) => {
        const next = columns.map((_c, i) => clamp(prev[i] ?? 160, minColumnWidth, 800));
        return next;
      });
    }
  }, [columns, colWidths.length, minColumnWidth]);
  React.useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);
  React.useEffect(() => { rowHeightsRef.current = rowHeights; }, [rowHeights]);

  /* selection & editing */
  const [selection, setSelection] = React.useState<Selection>(null);
  const [activeCell, setActiveCell] = React.useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = React.useState<{ r: number; c: number } | null>(null);
  const [selectDropdown, setSelectDropdown] = React.useState<{
    r: number;
    c: number;
    mode: "single" | "multiple";
    search: string;
  } | null>(null);
  const [selectDropdownAnchor, setSelectDropdownAnchor] = React.useState<{
    element: HTMLElement | null;
    rect: DOMRect | null;
  } | null>(null);
  const [headerEditing, setHeaderEditing] = React.useState<number | null>(null);
  const [detailsModal, setDetailsModal] = React.useState<{ rowIndex: number } | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [hiddenColumns, setHiddenColumns] = React.useState<HiddenColumnEntry<T>[]>([]);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction<T> | null>(null);
  const [columnResizeHover, setColumnResizeHover] = React.useState<number | null>(null);
  const [columnResizeGuide, setColumnResizeGuide] = React.useState<{ index: number; left: number; active: boolean; cursor?: number } | null>(null);
  const [rowResizeHover, setRowResizeHover] = React.useState<number | null>(null);
  const [rowResizeGuide, setRowResizeGuide] = React.useState<{ index: number; top: number; active: boolean; cursor?: number } | null>(null);
  const [viewport, setViewport] = React.useState<{ scrollTop: number; scrollLeft: number; width: number; height: number }>({ scrollTop: 0, scrollLeft: 0, width: 0, height: 0 });
  const [internalLoadMorePending, setInternalLoadMorePending] = React.useState(false);

  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const headerContextMenuRef = React.useRef<HTMLDivElement | null>(null);
  const cellContextMenuRef = React.useRef<HTMLDivElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const colWidthsRef = React.useRef(colWidths);
  const rowHeightsRef = React.useRef(rowHeights);

  React.useEffect(() => {
    if (typeof loadingMoreRows === "boolean") {
      setInternalLoadMorePending(loadingMoreRows);
    }
  }, [loadingMoreRows]);

  React.useEffect(() => {
    if (!hasMoreRows) {
      setInternalLoadMorePending(false);
    }
  }, [hasMoreRows]);

  React.useLayoutEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const update = () => {
      setViewport({
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
        width: el.clientWidth,
        height: el.clientHeight
      });
    };
    update();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        setViewport({
          scrollTop: el.scrollTop,
          scrollLeft: el.scrollLeft,
          width: el.clientWidth,
          height: el.clientHeight
        });
      });
      resizeObserver.observe(el);
    }
    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    setViewport((prev) => ({
      scrollTop: el.scrollTop,
      scrollLeft: el.scrollLeft,
      width: prev.width,
      height: prev.height
    }));
  }, []);

  const updateColumnGuidePosition = React.useCallback((index: number, clientX: number, clientY: number | null, active: boolean) => {
    const container = tableContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const left = Math.max(0, Math.min(container.scrollWidth, container.scrollLeft + relativeX));
    let cursor = columnResizeGuide?.cursor ?? container.scrollTop;
    if (typeof clientY === "number") {
      const relativeY = clientY - rect.top;
      cursor = Math.max(0, Math.min(container.scrollHeight, container.scrollTop + relativeY));
    }
    setColumnResizeGuide({ index, left, active, cursor });
  }, [columnResizeGuide]);

  const updateRowGuidePosition = React.useCallback((index: number, clientY: number, clientX: number | null, active: boolean) => {
    const container = tableContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const top = Math.max(0, Math.min(container.scrollHeight, container.scrollTop + relativeY));
    let cursor = rowResizeGuide?.cursor ?? container.scrollLeft;
    if (typeof clientX === "number") {
      const relativeX = clientX - rect.left;
      cursor = Math.max(0, Math.min(container.scrollWidth, container.scrollLeft + relativeX));
    }
    setRowResizeGuide({ index, top, active, cursor });
  }, [rowResizeGuide]);

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

  function setCellValue(r: number, c: number, value: any, options?: { commit?: boolean }) {
    const col = columns[c];
    if (!col || col.readOnly) return;
    const key = col.key as keyof T;
    const next = deepClone(rows);
    (next[r] as any)[key] = value;
    setRows(next);
    latestRowsRef.current = next;
    if (options?.commit) {
      commit(next, columns);
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

  function coerceValue(input: any, col: ColumnSpec): any {
    if (input == null || input === "") return defaultValueForType(col.type);
    switch (col.type) {
      case "number":
      case "currency": {
        const normalized = typeof input === "number"
          ? input
          : Number(String(input).replace(/,/g, "").trim());
        return Number.isFinite(normalized) ? normalized : defaultValueForType(col.type);
      }
      case "currency":
      case "percent":
        return Number.isFinite(Number(input)) ? Number(input) : defaultValueForType(col.type);
      case "checkbox":
        if (typeof input === "boolean") return input;
        if (typeof input === "number") return input !== 0;
        return /^(true|1|yes|y|on)$/i.test(String(input).trim());
      case "rating":
        return clamp(Number(input) || 0, 0, col.config?.rating?.max ?? 5);
      case "multipleSelect": {
        const known = col.config?.multipleSelect?.options ?? [];
        const normalizeOption = (raw: unknown): SelectOption | null => {
          if (raw == null || raw === "") return null;
          if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
            const text = String(raw).trim();
            if (!text) return null;
            const match = known.find((opt) => opt.id === text || opt.label === text);
            return match ? { ...match } : { id: text, label: text };
          }
          if (typeof raw === "object") {
            const opt = raw as Partial<SelectOption>;
            const id = opt.id != null ? String(opt.id).trim() : "";
            const label = opt.label != null ? String(opt.label).trim() : "";
            const match = known.find((candidate) =>
              (id && (candidate.id === id || candidate.label === id)) ||
              (label && (candidate.id === label || candidate.label === label))
            );
            if (match) {
              if (opt.color && opt.color !== match.color) {
                return { ...match, color: opt.color };
              }
              return match;
            }
            const fallbackId = id || label;
            const fallbackLabel = label || id;
            if (!fallbackId && !fallbackLabel) return null;
            return {
              id: fallbackId || fallbackLabel || "",
              label: fallbackLabel || fallbackId || "",
              color: opt.color
            };
          }
          const text = String(raw).trim();
          if (!text) return null;
          const match = known.find((opt) => opt.id === text || opt.label === text);
          return match ? match : { id: text, label: text };
        };

        if (Array.isArray(input)) {
          return input
            .map((item) => normalizeOption(item))
            .filter((opt): opt is SelectOption => Boolean(opt));
        }

        if (typeof input === "string") {
          const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            return parts
              .map((part) => normalizeOption(part))
              .filter((opt): opt is SelectOption => Boolean(opt));
          }
        }

        const normalized = normalizeOption(input);
        return normalized ? [normalized] : [];
      }
      case "singleSelect": {
        const known = col.config?.singleSelect?.options ?? [];
        if (Array.isArray(input) && input.length) {
          const first = input[0];
          if (typeof first === "string") {
            const trimmed = first.trim();
            return known.find((o) => o.id === trimmed || o.label === trimmed) ?? (trimmed ? { id: trimmed, label: trimmed } : null);
          }
          if (first && typeof first === "object") {
            const opt = first as SelectOption;
            const id = opt.id ?? opt.label;
            const label = opt.label ?? String(id ?? "");
            return known.find((o) => o.id === id || o.label === label) ?? (label ? { id: String(id ?? label), label } : null);
          }
        }
        if (input && typeof input === "object" && "id" in input) {
          const opt = input as SelectOption;
          return known.find((o) => o.id === opt.id || o.label === opt.label) ?? { id: String(opt.id ?? opt.label ?? ""), label: opt.label ?? String(opt.id ?? "") };
        }
        const label = String(input).trim();
        return known.find((o) => o.label === label) ?? (label ? { id: label, label } : null);
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
    const target = e.target as HTMLElement | null;
    if (target) {
      const allowText = target.closest("textarea, input, select, [data-allow-text-selection='true']");
      if (allowText) return;
    }
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

  function selectColumnByIndex(index: number) {
    if (index < 0 || index >= columns.length) return;
    const lastRow = rows.length > 0 ? rows.length - 1 : 0;
    const alreadySelected =
      selection &&
      selection.c0 === index &&
      selection.c1 === index &&
      selection.r0 === 0 &&
      selection.r1 >= lastRow;
    if (alreadySelected) {
      setSelection(null);
      setActiveCell(null);
      dragRef.current = null;
      return;
    }
    const nextSelection: Selection = {
      r0: 0,
      c0: index,
      r1: rows.length > 0 ? lastRow : 0,
      c1: index
    };
    setSelection(nextSelection);
    setActiveCell(rows.length ? { r: 0, c: index } : null);
    dragRef.current = null;
  }

  function selectRowByIndex(index: number) {
    if (index < 0 || index >= rows.length) return;
    if (!columns.length) return;
    const lastColumn = columns.length - 1;
    const alreadySelected =
      selection &&
      selection.c0 === 0 &&
      selection.c1 === lastColumn &&
      index >= selection.r0 &&
      index <= selection.r1;
    const isSingleRow = alreadySelected && selection.r0 === selection.r1;
    if (isSingleRow) {
      setSelection(null);
      setActiveCell(null);
      dragRef.current = null;
      return;
    }
    setSelection({
      r0: index,
      r1: index,
      c0: 0,
      c1: lastColumn
    });
    setActiveCell({ r: index, c: 0 });
    dragRef.current = null;
  }

  function toggleSelectAllRows() {
    if (!columns.length || !rows.length) {
      setSelection(null);
      setActiveCell(null);
      dragRef.current = null;
      return;
    }
    const lastRow = rows.length - 1;
    const lastColumn = columns.length - 1;
    if (isAllRowsSelected) {
      setSelection(null);
      setActiveCell(null);
      dragRef.current = null;
      return;
    }
    setSelection({
      r0: 0,
      r1: lastRow,
      c0: 0,
      c1: lastColumn
    });
    setActiveCell({ r: 0, c: 0 });
    dragRef.current = null;
  }

  /* Resize columns */
  function startColResize(idx: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[idx];
    setColumnResizeHover(idx);
    updateColumnGuidePosition(idx, e.clientX, e.clientY, true);
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      setColWidths((w) => {
        const next = w.slice();
        next[idx] = clamp(startW + dx, minColumnWidth, 800);
        colWidthsRef.current = next;
        return next;
      });
      updateColumnGuidePosition(idx, ev.clientX, ev.clientY, true);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // persist column width on spec
      const nextCols = deepClone(columns);
      nextCols[idx].width = colWidthsRef.current[idx];
      setColumns(nextCols);
      commit(rows, nextCols);
      setColumnResizeGuide(null);
      setColumnResizeHover(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* Resize rows */
  function startRowResize(idx: number, e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = rowHeights[idx];
    setRowResizeHover(idx);
    updateRowGuidePosition(idx, e.clientY, e.clientX, true);
    function onMove(ev: MouseEvent) {
      const dy = ev.clientY - startY;
      setRowHeights((h) => {
        const next = h.slice();
        next[idx] = clamp(startH + dy, minRowHeight, 400);
        rowHeightsRef.current = next;
        return next;
      });
      updateRowGuidePosition(idx, ev.clientY, ev.clientX, true);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setRowResizeGuide(null);
      setRowResizeHover(null);
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
    if (col.type === "singleSelect" || col.type === "multipleSelect") {
      setSelectDropdown({
        r,
        c,
        mode: col.type === "singleSelect" ? "single" : "multiple",
        search: ""
      });
      return;
    }
    setSelectDropdown(null);
    // focus happens after input is rendered
    setTimeout(() => editorRef.current?.focus(), 0);
  }
  function commitEdit() {
    if (!editing) return;
    setSelectDropdown(null);
    const { r, c } = editing;
    editOriginalRef.current = null;
    setEditing(null);
    commit(latestRowsRef.current, columns);
    setActiveCell({ r, c });
  }
  function cancelEdit() {
    if (!editing) return;
    setSelectDropdown(null);
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
      if (e.shiftKey && (colType === "longText" || colType === "singleLineText")) return;
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
      const fallbackHeight = ROW_HEIGHT_PRESETS[rowHeightPresetRef.current] ?? minRowHeight;
      const inserts = heights && heights.length === newRows.length
        ? heights
        : newRows.map(() => fallbackHeight);
      inserts.forEach((h, offset) => {
        const heightValue = h ?? fallbackHeight;
        nextHeights.splice(safeIndex + offset, 0, heightValue);
      });
      return nextHeights;
    });
    commit(nextRows, columns);
  }

  function performRemoveRows(range: { start: number; end: number }) {
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

  function requestRemoveRows(range: { start: number; end: number }) {
    const start = Math.max(0, range.start);
    const end = Math.min(rows.length - 1, range.end);
    if (end < start) return;
    const count = end - start + 1;
    setConfirmAction({
      type: "deleteRows",
      range: { start, end, count }
    });
  }

  function createNewColumnSpec(baseName = "New column", type: ColumnType = "singleLineText"): ColumnSpec<T> {
    const key = uniqueColumnKey(columns, "new_field");
    return { key, name: baseName, type, width: 160 } as ColumnSpec<T>;
  }
  function promptNewColumnSpec(): ColumnSpec<T> | null {
    if (typeof window === "undefined") return createNewColumnSpec();
    const defaultName = `Field ${columns.length + 1}`;
    const nameInput = window.prompt("Enter new field name", defaultName);
    if (nameInput === null) return null;
    const trimmedName = nameInput.trim() || defaultName;
    const allowedTypes = new Set(ALL_TYPES.map((opt) => opt.value));
    const defaultType: ColumnType = "singleLineText";
    const typeInput = window.prompt(
      `Enter field type (${Array.from(allowedTypes).join(", ")})`,
      defaultType
    );
    const cleanedType = (typeInput ?? "").trim();
    const normalizedType = cleanedType && allowedTypes.has(cleanedType as ColumnType)
      ? (cleanedType as ColumnType)
      : defaultType;
    return createNewColumnSpec(trimmedName, normalizedType);
  }

  function insertColumnAtIndex(index: number, column?: ColumnSpec<T>) {
    let newColumn: ColumnSpec<T> | null = column ?? null;
    if (!newColumn) {
      newColumn = promptNewColumnSpec();
      if (!newColumn) return;
    }
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

  function duplicateColumn(idx: number) {
    const source = columns[idx];
    if (!source) return;
    const copy = deepClone(source);
    copy.name = `${String(copy.name)} copy`;
    copy.key = uniqueColumnKey(columns, String(copy.key));
    copy.hidden = false;
    insertColumnAtIndex(idx + 1, copy);
  }

  function promptColumnDescription(idx: number) {
    if (typeof window === "undefined") return;
    const col = columns[idx];
    if (!col) return;
    const current = col.description ?? "";
    const value = window.prompt("Edit field description", current);
    if (value === null) return;
    const nextCols = deepClone(columns);
    nextCols[idx].description = value.trim() || undefined;
    setColumns(nextCols);
    commit(rows, nextCols);
  }

  function promptColumnPermissions(idx: number) {
    if (typeof window === "undefined") return;
    const col = columns[idx];
    if (!col) return;
    const current = col.permissions ?? "";
    const value = window.prompt("Edit field permissions", current || "Read/write");
    if (value === null) return;
    const nextCols = deepClone(columns);
    nextCols[idx].permissions = value.trim() || undefined;
    setColumns(nextCols);
    commit(rows, nextCols);
  }

  async function copyFieldUrlToClipboard(idx: number) {
    const col = columns[idx];
    if (!col) return;
    const key = encodeURIComponent(String(col.key));
    let base = "https://example.com";
    if (typeof window !== "undefined" && window.location) {
      base = window.location.origin || base;
    }
    const url = `${base.replace(/\/$/, "")}/field/${key}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch {
      /* noop */
    }
  }

  function hideColumn(idx: number) {
    const col = columns[idx];
    if (!col) return;
    const key = String(col.key);
    const capturedValues = rows.map((row) => deepClone((row as any)[key]));
    const capturedStyles = rows.map((_row, rIdx) => getCellStyle(rIdx, idx));
    const width = clamp(colWidths[idx] ?? col.width ?? 160, minColumnWidth, 800);
    setHiddenColumns((prev) => [...prev, {
      column: deepClone(col),
      index: idx,
      values: capturedValues,
      styles: capturedStyles,
      width
    }]);
    const nextCols = columns.filter((_c, i) => i !== idx);
    const nextRows = rows.map((row) => {
      const nextRow: any = { ...row };
      dropColumnStyles(nextRow, key);
      delete nextRow[key];
      return nextRow as T;
    });
    const nextWidths = colWidths.filter((_w, i) => i !== idx);
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColWidths(nextWidths);
    commit(nextRows, nextCols);
  }

  function restoreHiddenColumn(hiddenIdx: number) {
    setHiddenColumns((prev) => {
      const entry = prev[hiddenIdx];
      if (!entry) return prev;
      const insertIndex = clamp(entry.index, 0, columns.length);
      const columnKey = String(entry.column.key);
      const nextCols = columns.slice();
      nextCols.splice(insertIndex, 0, deepClone(entry.column));
      const nextRows = rows.map((row, rIdx) => {
        const nextRow: any = { ...row };
        nextRow[columnKey] = deepClone(entry.values[rIdx]);
        if (entry.styles[rIdx]) {
          const styles = { ...((nextRow[STYLE_FIELD] as Record<string, CellStyle>) ?? {}) };
          styles[columnKey] = { ...entry.styles[rIdx]! };
          nextRow[STYLE_FIELD] = styles;
        } else if (nextRow[STYLE_FIELD]) {
          const styles = { ...(nextRow[STYLE_FIELD] as Record<string, CellStyle>) };
          delete styles[columnKey];
          if (Object.keys(styles).length) {
            nextRow[STYLE_FIELD] = styles;
          } else {
            delete nextRow[STYLE_FIELD];
          }
        }
        return nextRow as T;
      });
      setColumns(nextCols);
      setRows(nextRows);
      latestRowsRef.current = nextRows;
      setColWidths((prevWidths) => {
        const next = prevWidths.slice();
        next.splice(insertIndex, 0, clamp(entry.width, minColumnWidth, 800));
        return next;
      });
      commit(nextRows, nextCols);
      return prev.filter((_item, i) => i !== hiddenIdx);
    });
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

  function performRemoveColumnsByIndex(indices: number[]) {
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

  function requestRemoveColumns(indices: number[]) {
    const unique = Array.from(new Set(indices.filter((idx) => idx >= 0 && idx < columns.length))).sort((a, b) => a - b);
    if (!unique.length) return;
    setConfirmAction({
      type: "deleteColumns",
      indices: unique,
      columns: unique.map((idx) => columns[idx]).filter(Boolean) as Array<ColumnSpec<T>>
    });
  }
  function getCellStyle(r: number, c: number): CellStyle | null {
    const row = rows[r] as any;
    const col = columns[c];
    if (!row || !col) return null;
    const styles = row[STYLE_FIELD] as Record<string, CellStyle> | undefined;
    return styles?.[col.key as string] ?? null;
  }

  function cleanCellStyle(style: Partial<CellStyle>): CellStyle | null {
    const next: CellStyle = {};
    if (style.background) next.background = style.background;
    if (style.color) next.color = style.color;
    if (style.align) next.align = style.align;
    if (style.bold) next.bold = true;
    if (style.italic) next.italic = true;
    if (style.underline) next.underline = true;
    return Object.keys(next).length ? next : null;
  }

  function applyCellStyleToSelection(sel: Selection, partial: Partial<CellStyle>, mode: "merge" | "replace" = "merge") {
    if (!sel) return;
    const next = deepClone(rows);
    for (let r = sel.r0; r <= sel.r1; r++) {
      const row = next[r] as any;
      const styles = { ...(row[STYLE_FIELD] ?? {}) };
      for (let c = sel.c0; c <= sel.c1; c++) {
        const col = columns[c];
        if (!col) continue;
        const key = col.key as string;
        const existing = styles[key] ?? {};
        const merged = mode === "replace" ? { ...partial } : { ...existing, ...partial };
        const cleaned = cleanCellStyle(merged);
        if (cleaned) {
          styles[key] = cleaned;
        } else {
          delete styles[key];
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

  function copySelectionFormatting(sel: Selection) {
    if (!sel) return;
    const style = getCellStyle(sel.r0, sel.c0);
    formatClipboardRef.current = style ? { ...style } : null;
  }

  function pasteSelectionFormatting(sel: Selection) {
    if (!sel || !formatClipboardRef.current) return;
    applyCellStyleToSelection(sel, { ...formatClipboardRef.current }, "replace");
  }

  function toggleSelectionTextStyle(sel: Selection, key: "bold" | "italic" | "underline") {
    if (!sel) return;
    const sample = getCellStyle(sel.r0, sel.c0);
    const nextValue = !(sample?.[key] ?? false);
    applyCellStyleToSelection(sel, { [key]: nextValue } as Partial<CellStyle>);
  }

  function setSelectionAlignment(sel: Selection, align: CellStyle["align"]) {
    if (!sel) return;
    const sample = getCellStyle(sel.r0, sel.c0);
    const nextAlign = sample?.align === align ? undefined : align;
    applyCellStyleToSelection(sel, { align: nextAlign });
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
    if (!matrix.length) return;
    let next = deepClone(rows);
    const requiredRowCount = Math.max(next.length, baseR + matrix.length);
    if (requiredRowCount > next.length) {
      const additions: T[] = [];
      for (let idx = next.length; idx < requiredRowCount; idx++) {
        additions.push(createBlankRow() as T);
      }
      if (additions.length) {
        next = next.concat(additions);
        setRowHeights((prev) => {
          if (prev.length >= requiredRowCount) return prev;
          const nextHeights = prev.slice();
          const presetHeight = ROW_HEIGHT_PRESETS[rowHeightPresetRef.current] ?? minRowHeight;
          while (nextHeights.length < requiredRowCount) {
            nextHeights.push(presetHeight);
          }
          return nextHeights;
        });
      }
    }
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

  function sortCheckboxColumn(idx: number, direction: "uncheckedFirst" | "checkedFirst") {
    const col = columns[idx];
    if (!col || col.type !== "checkbox") return;
    const key = col.key as keyof T;
    const sorted = deepClone(rows).sort((a, b) => {
      const av = !!(a as any)[key];
      const bv = !!(b as any)[key];
      if (av === bv) return 0;
      return direction === "uncheckedFirst" ? (av ? 1 : -1) : (av ? -1 : 1);
    });
    setRows(sorted);
    latestRowsRef.current = sorted;
    commit(sorted, columns);
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
          requestRemoveRows({ start: r0, end: r1 });
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
  }, [selection, activeCell, columns.length, applyMatrixAt, clearSelectionCells, requestRemoveRows, undo, redo, selectionToMatrix]);

  React.useEffect(() => {
    if (!detailsModal) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setDetailsModal(null);
      }
    }
    window.addEventListener("keydown", onKey);
    const originalOverflow = typeof document !== "undefined" ? document.body.style.overflow : "";
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      if (typeof document !== "undefined") {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [detailsModal]);

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
    requestRemoveRows({ start: sel.r0, end: sel.r1 });
  }
  function addColumn() {
    insertColumnAtIndex(columns.length);
  }

  async function handleLoadMoreRows() {
    if (!onLoadMoreRows || isLoadMorePending) return;
    try {
      if (typeof loadingMoreRows !== "boolean") {
        setInternalLoadMorePending(true);
      }
      const maybePromise = onLoadMoreRows();
      if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
        await maybePromise;
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (typeof loadingMoreRows !== "boolean") {
        setInternalLoadMorePending(false);
      }
    }
  }

  function confirmDeletion() {
    if (!confirmAction) return;
    if (confirmAction.type === "deleteRows") {
      performRemoveRows({ start: confirmAction.range.start, end: confirmAction.range.end });
    } else if (confirmAction.type === "deleteColumns") {
      performRemoveColumnsByIndex(confirmAction.indices);
    }
    setConfirmAction(null);
  }

  function cancelDeletion() {
    setConfirmAction(null);
  }
  function normalizeColumnForType(col: ColumnSpec<T>, type: ColumnType) {
    const copy = deepClone(col);
    copy.type = type;
    copy.readOnly = ["formula","rollup","lookup","createdTime","lastModifiedTime","createdBy","lastModifiedBy"].includes(type) ? true : col.readOnly;

    const allowedConfigKeys = new Set<string>();
    switch (type) {
      case "number": allowedConfigKeys.add("number"); break;
      case "currency": allowedConfigKeys.add("currency"); break;
      case "percent": allowedConfigKeys.add("percent"); break;
      case "rating": allowedConfigKeys.add("rating"); break;
      case "multipleSelect": allowedConfigKeys.add("multipleSelect"); break;
      case "singleSelect": allowedConfigKeys.add("singleSelect"); break;
      case "checkbox": allowedConfigKeys.add("checkbox"); break;
      case "attachment": allowedConfigKeys.add("attachment"); break;
      case "date": allowedConfigKeys.add("date"); break;
      default:
        break;
    }

    const config = { ...(copy.config ?? {}) } as Record<string, any>;
    for (const key of Object.keys(config)) {
      if (!allowedConfigKeys.has(key)) delete config[key];
    }

    if (allowedConfigKeys.has("rating")) {
      const rating = { ...(config.rating ?? {}) };
      rating.max = Number.isFinite(rating.max) ? rating.max : 5;
      rating.icon = rating.icon ?? "star";
      config.rating = rating;
    }
    if (allowedConfigKeys.has("multipleSelect")) {
      const options = Array.isArray(config.multipleSelect?.options) ? config.multipleSelect.options : [];
      config.multipleSelect = { options };
    }
    if (allowedConfigKeys.has("singleSelect")) {
      const options = Array.isArray(config.singleSelect?.options) ? config.singleSelect.options : [];
      config.singleSelect = { options };
    }
    if (allowedConfigKeys.has("number")) {
      config.number = { ...(config.number ?? {}) };
    }
    if (allowedConfigKeys.has("currency")) {
      config.currency = { ...(config.currency ?? {}) };
    }
    if (allowedConfigKeys.has("percent")) {
      config.percent = { ...(config.percent ?? {}) };
    }
    if (allowedConfigKeys.has("checkbox")) {
      config.checkbox = { ...(config.checkbox ?? {}) };
    }
    if (allowedConfigKeys.has("attachment")) {
      config.attachment = { ...(config.attachment ?? {}) };
    }
    if (allowedConfigKeys.has("date")) {
      config.date = { ...(config.date ?? {}) };
    }

    copy.config = Object.keys(config).length ? config : undefined;
    return copy;
  }

  function changeColumnType(idx: number, type: ColumnType) {
    const next = deepClone(columns);
    const current = next[idx];
    if (!current) return;
    const columnKey = current?.key as string;

    let derivedOptions: SelectOption[] = [];
    if (columnKey && (type === "singleSelect" || type === "multipleSelect")) {
      const seen = new Set<string>();
      const registerOption = (raw: unknown) => {
        if (raw == null) return;
        let id = "";
        let label = "";
        let color: string | undefined;
        if (typeof raw === "string") {
          label = raw.trim();
          id = label;
        } else if (typeof raw === "object") {
          const opt = raw as SelectOption;
          label = typeof opt.label === "string" ? opt.label.trim() : "";
          const rawId = typeof opt.id === "string" ? opt.id.trim() : opt.id != null ? String(opt.id).trim() : "";
          id = rawId || label;
          if (typeof opt.color === "string") {
            color = opt.color;
          }
          if (!label && id) {
            label = id;
          }
        } else {
          label = String(raw).trim();
          id = label;
        }
        if (!label && !id) return;
        const finalId = id || label;
        const finalLabel = label || id;
        const key = finalId.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const option: SelectOption = { id: finalId, label: finalLabel };
        if (color) option.color = color;
        derivedOptions.push(option);
      };

      rows.forEach((row) => {
        const value = (row as any)[columnKey];
        if (value == null || value === "") return;
        if (type === "multipleSelect") {
          if (Array.isArray(value)) {
            value.forEach((entry) => registerOption(entry));
          } else if (typeof value === "string") {
            value
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean)
              .forEach((part) => registerOption(part));
          } else {
            registerOption(value);
          }
        } else {
          if (Array.isArray(value) && value.length > 0) {
            registerOption(value[0]);
          } else {
            registerOption(value);
          }
        }
      });
    }

    const prepared = normalizeColumnForType(current, type);

    if (derivedOptions.length && (type === "singleSelect" || type === "multipleSelect")) {
      const configKey = type === "singleSelect" ? "singleSelect" : "multipleSelect";
      const existingOptions = prepared.config?.[configKey]?.options ?? [];
      const merged: SelectOption[] = [];
      const seen = new Set<string>();
      const pushOption = (option: SelectOption) => {
        if (!option) return;
        const rawId = option.id ?? option.label ?? "";
        const id = typeof rawId === "string" ? rawId.trim() : String(rawId).trim();
        const label = typeof option.label === "string" ? option.label.trim() : String(option.label ?? id).trim();
        if (!label && !id) return;
        const finalId = id || label;
        const finalLabel = label || finalId;
        const key = finalId.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({ id: finalId, label: finalLabel });
      };
      existingOptions.forEach(pushOption);
      derivedOptions.forEach(pushOption);
      prepared.config = {
        ...(prepared.config ?? {}),
        [configKey]: { options: merged }
      };
    }

    next[idx] = prepared;

    // Initialize cell values if needed
    const key = prepared.key as string;
    const updatedRows = rows.map((r) => {
      const nextRow = { ...r } as any;
      nextRow[key] = coerceValue((r as any)[key], prepared);
      return nextRow as T;
    });
    setColumns(next);
    setRows(updatedRows);
    latestRowsRef.current = updatedRows;
    commit(updatedRows, next);
  }

  function computeColumnDropTarget(from: number, over: number) {
    const maxIndex = columns.length;
    const placingAtEnd = over >= maxIndex;
    let target = placingAtEnd ? maxIndex : over;
    if (!placingAtEnd && from < over) target = Math.max(0, over - 1);
    if (target < 0) target = 0;
    if (target > maxIndex) target = maxIndex;
    return target;
  }

  function computeRowDropTarget(from: number, over: number) {
    const maxIndex = rows.length;
    const placingAtEnd = over >= maxIndex;
    let target = placingAtEnd ? maxIndex : over;
    if (!placingAtEnd && from < over) target = Math.max(0, over - 1);
    if (target < 0) target = 0;
    if (target > maxIndex) target = maxIndex;
    return target;
  }

  function startColumnDrag(idx: number, e: React.DragEvent) {
    columnDragRef.current = { from: idx };
    setColumnDragHover({ from: idx, to: idx });
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
    const from = columnDragRef.current.from;
    const target = computeColumnDropTarget(from, idx);
    setColumnDragHover({ from, to: target });
  }

  function onColumnDrop(idx: number, e: React.DragEvent) {
    if (!columnDragRef.current) return;
    e.preventDefault();
    const from = columnDragRef.current.from;
    columnDragRef.current = null;
    setColumnDragHover(null);
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
    setColumnDragHover(null);
  }

  function startRowDrag(idx: number, e: React.DragEvent) {
    rowDragRef.current = { from: idx };
    setRowDragHover({ from: idx, to: idx });
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
    const from = rowDragRef.current.from;
    const target = computeRowDropTarget(from, idx);
    setRowDragHover({ from, to: target });
  }

  function onRowDrop(idx: number, e: React.DragEvent) {
    if (!rowDragRef.current) return;
    e.preventDefault();
    const from = rowDragRef.current.from;
    rowDragRef.current = null;
    setRowDragHover(null);
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
    setRowDragHover(null);
  }

  const normalizeSortValue = (value: any): any => {
    if (value == null) return "";
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return normalizeSortValue(value[0]);
      }
      if ("label" in value && typeof value.label === "string") {
        return value.label.toLowerCase();
      }
      if ("name" in value && typeof value.name === "string") {
        return value.name.toLowerCase();
      }
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && String(value).trim() !== "") return numeric;
    return String(value).toLowerCase();
  };

  /* View transformations (sort, group, filter, search) */
  const orderedRowIndexes = React.useMemo(() => {
    const order = rows.map((_row, index) => index);
    if (sortConfig) {
      const columnIndex = columns.findIndex((col) => String(col.key) === sortConfig.columnKey);
      if (columnIndex >= 0) {
        order.sort((a, b) => {
          const av = normalizeSortValue(getCellValue(a, columnIndex));
          const bv = normalizeSortValue(getCellValue(b, columnIndex));
          if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
          if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
          return a - b;
        });
      }
    }
    if (groupConfig) {
      const groupIndex = columns.findIndex((col) => String(col.key) === groupConfig.columnKey);
      if (groupIndex >= 0 && (!sortConfig || sortConfig.columnKey !== groupConfig.columnKey)) {
        order.sort((a, b) => {
          const av = normalizeSortValue(getCellValue(a, groupIndex));
          const bv = normalizeSortValue(getCellValue(b, groupIndex));
          if (av < bv) return -1;
          if (av > bv) return 1;
          return a - b;
        });
      }
    }
    return order;
  }, [rows, columns, sortConfig, groupConfig, getCellValue, normalizeSortValue]);

  const filteredRowIndexes = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const activeFilterEntries = activeFilters.filter((filter) => filter.term.trim().length);
    if (!q && !activeFilterEntries.length) return orderedRowIndexes;
    return orderedRowIndexes.filter((rowIdx) => {
      const matchesSearch = !q || columns.some((_col, colIdx) => {
        const value = getCellValue(rowIdx, colIdx);
        return String(value ?? "").toLowerCase().includes(q);
      });
      if (!matchesSearch) return false;
      return activeFilterEntries.every((filter) => {
        const columnIndex = columns.findIndex((col) => String(col.key) === filter.columnKey);
        if (columnIndex < 0) return true;
        const value = getCellValue(rowIdx, columnIndex);
        const normalized = String(value ?? "").toLowerCase();
        const term = filter.term.trim().toLowerCase();
        if (!term) return true;
        if (filter.operator === "equals") return normalized === term;
        return normalized.includes(term);
      });
    });
  }, [orderedRowIndexes, columns, searchTerm, activeFilters, getCellValue]);

  const groupHeaders = React.useMemo(() => {
    if (!groupConfig) return new Map<number, string>();
    const columnIndex = columns.findIndex((col) => String(col.key) === groupConfig.columnKey);
    if (columnIndex < 0) return new Map<number, string>();
    const headers = new Map<number, string>();
    let previousLabel: string | null = null;
    filteredRowIndexes.forEach((rowIdx) => {
      const raw = getCellValue(rowIdx, columnIndex);
      const label = String(
        raw == null || raw === ""
          ? "(Blank)"
          : typeof raw === "object" && raw !== null && "label" in raw
            ? (raw as any).label ?? "(Blank)"
            : raw
      );
      if (label !== previousLabel) {
        headers.set(rowIdx, label);
        previousLabel = label;
      }
    });
    return headers;
  }, [groupConfig, columns, filteredRowIndexes, getCellValue]);

  const rowColorMap = React.useMemo(() => {
    if (!colorConfig) return new Map<number, string>();
    const columnIndex = columns.findIndex((col) => String(col.key) === colorConfig.columnKey);
    if (columnIndex < 0) return new Map<number, string>();
    const column = columns[columnIndex];
    const map = new Map<number, string>();
    const resolveColor = (label: string, index: number) => {
      if (!label) return undefined;
      const paletteIndex = Math.abs(label.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % ROW_COLOR_PALETTE.length;
      return ROW_COLOR_PALETTE[paletteIndex] ?? ROW_COLOR_PALETTE[index % ROW_COLOR_PALETTE.length];
    };
    const optionColor = (label: string) => {
      const lower = label.toLowerCase();
      const options =
        column.config?.singleSelect?.options ??
        column.config?.multipleSelect?.options ??
        [];
      const match = options.find((opt) => {
        const id = opt.id ? String(opt.id).toLowerCase() : "";
        const optLabel = opt.label ? String(opt.label).toLowerCase() : "";
        return id === lower || optLabel === lower;
      });
      return match?.color;
    };
    rows.forEach((_row, idx) => {
      const raw = getCellValue(idx, columnIndex);
      if (raw == null || raw === "") return;
      if (column.type === "singleSelect") {
        const label = typeof raw === "object" && raw !== null ? (raw as any).label ?? (raw as any).id ?? "" : String(raw);
        const color = optionColor(label) ?? resolveColor(label, idx);
        if (color) map.set(idx, color);
      } else if (column.type === "multipleSelect" && Array.isArray(raw)) {
        const first = raw[0];
        const label = typeof first === "object" && first !== null ? (first as any).label ?? (first as any).id ?? "" : String(first ?? "");
        const color = optionColor(label) ?? resolveColor(label, idx);
        if (color) map.set(idx, color);
      } else {
        const label = typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw);
        const color = resolveColor(label, idx);
        if (color) map.set(idx, color);
      }
    });
    return map;
  }, [colorConfig, columns, rows, getCellValue]);

  const visibleRowIndexes = filteredRowIndexes;
  const isRowReorderLocked = Boolean(sortConfig || groupConfig);

  const menuButtonClass = (active: boolean) =>
    mergeClasses(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800",
      active && "border-blue-500 text-blue-600 bg-blue-500/10 dark:text-blue-300"
    );

  const ensureFilterColumn = React.useCallback(() => {
    if (!columns.length) {
      setFilterDraftColumn("");
      return;
    }
    setFilterDraftColumn((prev) => {
      if (prev && columns.some((col) => String(col.key) === prev)) return prev;
      const first = columns[0];
      return String(first?.key ?? "column_0");
    });
  }, [columns]);

  React.useEffect(() => {
    ensureFilterColumn();
    setActiveFilters((prev) =>
      prev.filter((filter) => columns.some((col) => String(col.key) === filter.columnKey))
    );
    if (sortConfig && !columns.some((col) => String(col.key) === sortConfig.columnKey)) {
      setSortConfig(null);
    }
    if (groupConfig && !columns.some((col) => String(col.key) === groupConfig.columnKey)) {
      setGroupConfig(null);
    }
    if (colorConfig && !columns.some((col) => String(col.key) === colorConfig.columnKey)) {
      setColorConfig(null);
    }
  }, [columns, ensureFilterColumn, sortConfig, groupConfig, colorConfig]);

  const toggleFieldsMenu = () => {
    if (fieldsMenuOpen) {
      setFieldsMenuOpen(false);
    } else {
      closeAllMenus();
      setFieldsMenuOpen(true);
    }
  };

  React.useEffect(() => {
    if (!fieldsMenuOpen) {
      setFieldsSearchTerm("");
      return;
    }
    const handle = window.setTimeout(() => {
      fieldsSearchInputRef.current?.focus();
      fieldsSearchInputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(handle);
  }, [fieldsMenuOpen]);

  const toggleFilterMenu = () => {
    if (filterMenuOpen) {
      setFilterMenuOpen(false);
    } else {
      closeAllMenus();
      ensureFilterColumn();
      setFilterMenuOpen(true);
    }
  };

  const toggleGroupMenu = () => {
    if (groupMenuOpen) {
      setGroupMenuOpen(false);
    } else {
      closeAllMenus();
      setGroupMenuOpen(true);
    }
  };

  const toggleSortMenu = () => {
    if (sortMenuOpen) {
      setSortMenuOpen(false);
    } else {
      closeAllMenus();
      setSortMenuOpen(true);
    }
  };

  const toggleColorMenu = () => {
    if (colorMenuOpen) {
      setColorMenuOpen(false);
    } else {
      closeAllMenus();
      setColorMenuOpen(true);
    }
  };

  const toggleRowHeightMenu = () => {
    if (rowHeightMenuOpen) {
      setRowHeightMenuOpen(false);
    } else {
      closeAllMenus();
      setRowHeightMenuOpen(true);
    }
  };

  const handleHideColumnClick = (idx: number) => {
    if (columns.length <= 1) return;
    hideColumn(idx);
  };

  function hideAllVisibleColumns() {
    if (columns.length <= 1) return;
    const entries = columns.map((col, idx) => {
      const key = String(col.key);
      return {
        column: deepClone(col),
        index: idx,
        values: rows.map((row) => deepClone((row as any)[key])),
        styles: rows.map((_row, rIdx) => getCellStyle(rIdx, idx)),
        width: clamp(colWidths[idx] ?? col.width ?? 160, minColumnWidth, 800)
      };
    });
    const nextRows = rows.map((row) => {
      const nextRow: any = { ...row };
      columns.forEach((col) => {
        const key = String(col.key);
        delete nextRow[key];
        dropColumnStyles(nextRow, key);
      });
      return nextRow as T;
    });
    setHiddenColumns((prev) => [...prev, ...entries]);
    setColumns([]);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColWidths([]);
    commit(nextRows, []);
  }

  function showAllHiddenColumns() {
    if (!hiddenColumns.length) return;
    const ordered = hiddenColumns
      .map((entry, idx) => ({ entry, idx }))
      .sort((a, b) => (a.entry.index - b.entry.index) || (a.idx - b.idx));
    const nextCols = columns.slice();
    const nextRows = rows.map((row) => ({ ...row })) as T[];
    const nextWidths = colWidths.slice();
    for (const { entry } of ordered) {
      const columnClone = deepClone(entry.column);
      const columnKey = String(columnClone.key);
      const insertIndex = clamp(entry.index, 0, nextCols.length);
      nextCols.splice(insertIndex, 0, columnClone);
      nextRows.forEach((row, rIdx) => {
        const nextRow: any = row;
        nextRow[columnKey] = deepClone(entry.values[rIdx]);
        if (entry.styles[rIdx]) {
          const styles = { ...((nextRow[STYLE_FIELD] as Record<string, CellStyle>) ?? {}) };
          styles[columnKey] = { ...entry.styles[rIdx]! };
          nextRow[STYLE_FIELD] = styles;
        } else if (nextRow[STYLE_FIELD]) {
          const styles = { ...(nextRow[STYLE_FIELD] as Record<string, CellStyle>) };
          delete styles[columnKey];
          if (Object.keys(styles).length) {
            nextRow[STYLE_FIELD] = styles;
          } else {
            delete nextRow[STYLE_FIELD];
          }
        }
      });
      nextWidths.splice(insertIndex, 0, clamp(entry.width, minColumnWidth, 800));
    }
    setColumns(nextCols);
    setRows(nextRows);
    latestRowsRef.current = nextRows;
    setColWidths(nextWidths);
    setHiddenColumns([]);
    commit(nextRows, nextCols);
  }

  const hasActiveFilters = activeFilters.some((filter) => filter.term.trim().length > 0);

  const handleFilterApply = () => {
    if (!filterDraftColumn) {
      setFilterMenuOpen(false);
      return;
    }
    const trimmed = filterDraftValue.trim();
    setActiveFilters((prev) => {
      const rest = prev.filter((filter) => filter.columnKey !== filterDraftColumn);
      if (!trimmed) return rest;
      return [...rest, { columnKey: filterDraftColumn, operator: filterDraftOperator, term: trimmed }];
    });
    setFilterMenuOpen(false);
  };

  const handleFilterRemove = (columnKey: string) => {
    setActiveFilters((prev) => prev.filter((filter) => filter.columnKey !== columnKey));
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setFilterMenuOpen(false);
  };

  const handleSortApply = (columnKey: string, direction: "asc" | "desc") => {
    setSortConfig({ columnKey, direction });
    closeAllMenus();
  };

  const clearSort = () => {
    setSortConfig(null);
    setSortMenuOpen(false);
  };

  const handleGroupApply = (columnKey: string) => {
    setGroupConfig({ columnKey });
    setSortConfig((prev) => {
      if (prev && prev.columnKey === columnKey) return prev;
      return { columnKey, direction: "asc" };
    });
    closeAllMenus();
  };

  const clearGroup = () => {
    setGroupConfig(null);
    setGroupMenuOpen(false);
  };

  const handleColorApply = (columnKey: string) => {
    setColorConfig({ columnKey });
    closeAllMenus();
  };

  const clearColor = () => {
    setColorConfig(null);
    setColorMenuOpen(false);
  };

  const handleRowHeightSelect = (preset: RowHeightPreset) => {
    applyRowHeightPreset(preset);
    setRowHeightMenuOpen(false);
  };

  const toggleWrapHeaders = () => setWrapHeaders((prev) => !prev);

  const rowHeightOptions: Array<{ id: RowHeightPreset; label: string; description: string }> = [
    { id: "short", label: "Short", description: "Compact rows" },
    { id: "medium", label: "Medium", description: "More space for notes" },
    { id: "tall", label: "Tall", description: "Comfortable multiline view" },
    { id: "extraTall", label: "Extra Tall", description: "Show full details at a glance" }
  ];
  const rowHeightLabel = rowHeightOptions.find((option) => option.id === rowHeightPreset)?.label ?? "Short";
  const rowHeightButtonActive = rowHeightMenuOpen || rowHeightPreset !== "short" || wrapHeaders;

  const visibleRowOffsets = React.useMemo(() => {
    const offsets: number[] = [0];
    for (let i = 0; i < visibleRowIndexes.length; i++) {
      const idx = visibleRowIndexes[i];
      const h = rowHeights[idx] ?? minRowHeight;
      offsets.push(offsets[offsets.length - 1] + h);
    }
    return offsets;
  }, [visibleRowIndexes, rowHeights, minRowHeight]);
  const totalVisibleRowHeight = visibleRowOffsets[visibleRowOffsets.length - 1] ?? 0;

  const columnOffsets = React.useMemo(() => {
    const offsets: number[] = new Array(colWidths.length + 1);
    offsets[0] = 0;
    for (let i = 0; i < colWidths.length; i++) {
      offsets[i + 1] = offsets[i] + (colWidths[i] ?? minColumnWidth);
    }
    return offsets;
  }, [colWidths, minColumnWidth]);
  const totalColumnWidth = columnOffsets[columnOffsets.length - 1] ?? 0;

  const overscanPx = Math.max(0, virtualizationOverscan ?? 0);
  const bodyViewportHeight = Math.max(0, viewport.height - headerHeight);
  const rowScrollTop = Math.max(0, viewport.scrollTop - headerHeight);
  const rowStartOffset = Math.max(0, rowScrollTop - overscanPx);
  const rowEndOffset = Math.min(totalVisibleRowHeight, rowScrollTop + bodyViewportHeight + overscanPx);
  const { start: rowRenderStart, end: rowRenderEnd } = visibleRangeFromOffsets(visibleRowOffsets, rowStartOffset, rowEndOffset);

  const columnScrollLeft = Math.max(0, viewport.scrollLeft);
  const columnStartOffset = Math.max(0, columnScrollLeft - overscanPx);
  const columnEndOffset = Math.min(totalColumnWidth, columnScrollLeft + viewport.width + overscanPx);
  const { start: columnRenderStart, end: columnRenderEnd } = visibleRangeFromOffsets(columnOffsets, columnStartOffset, columnEndOffset);

  const renderedRowIndexes = visibleRowIndexes.slice(rowRenderStart, rowRenderEnd);
  const renderedColumnIndices: number[] = [];
  for (let i = columnRenderStart; i < columnRenderEnd; i++) renderedColumnIndices.push(i);

  const rowSpacerTop = visibleRowOffsets[rowRenderStart] ?? 0;
  const rowSpacerBottom = Math.max(0, totalVisibleRowHeight - (visibleRowOffsets[rowRenderEnd] ?? totalVisibleRowHeight));
  const columnSpacerLeft = columnOffsets[columnRenderStart] ?? 0;
  const columnSpacerRight = Math.max(0, totalColumnWidth - (columnOffsets[columnRenderEnd] ?? totalColumnWidth));
  const headerColumnIndices = renderedColumnIndices.length ? renderedColumnIndices : columns.map((_col, idx) => idx);
  const bodyColumnIndices = headerColumnIndices;
  const isLoadMorePending = typeof loadingMoreRows === "boolean" ? loadingMoreRows : internalLoadMorePending;
  const resizeGuideContainerHeight = tableContainerRef.current?.scrollHeight ?? (headerHeight + totalVisibleRowHeight + 120);
  const resizeGuideContainerWidth = tableContainerRef.current?.scrollWidth ?? Math.max(totalColumnWidth + ROW_NUMBER_COLUMN_WIDTH, viewport.width + 120);
  const totalRowCount = rows.length;
  const totalColumnCount = columns.length;
  const lastRowIndex = totalRowCount > 0 ? totalRowCount - 1 : 0;
  const lastColumnIndex = totalColumnCount > 0 ? totalColumnCount - 1 : 0;
  const isRowSelectionRange = Boolean(
    selection &&
      totalColumnCount > 0 &&
      selection.c0 === 0 &&
      selection.c1 === lastColumnIndex
  );
  const isAllRowsSelected = Boolean(
    isRowSelectionRange &&
      selection &&
      totalRowCount > 0 &&
      selection.r0 === 0 &&
      selection.r1 >= lastRowIndex
  );
  const selectAllIndeterminate = Boolean(isRowSelectionRange && selection && !isAllRowsSelected);
  React.useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = selectAllIndeterminate;
    }
  }, [selectAllIndeterminate]);
  const columnHandleTop = columnResizeGuide ? Math.max(0, Math.min(resizeGuideContainerHeight - 25, (columnResizeGuide.cursor ?? viewport.scrollTop) - 12)) : 0;
  const rowHandleLeft = rowResizeGuide ? Math.max(0, Math.min(resizeGuideContainerWidth - 25, (rowResizeGuide.cursor ?? viewport.scrollLeft) - 12)) : 0;

  /* Row & column ids for React keys */
  const rowKey = (row: T, idx: number) => String(getRowId?.(row, idx) ?? idx);
  const colKey = (col: ColumnSpec<T>, idx: number) => String(col.key ?? idx);

  /* Styles */
  const cx = (base: string, fallback: string) => classNames[base as keyof typeof classNames] || fallback;
  const baseCellClass = "relative border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm select-none transition-colors hover:border-blue-300 dark:hover:border-blue-500";
  const baseHeaderClass = "relative border border-zinc-300 dark:border-neutral-700 bg-zinc-100 dark:bg-neutral-800 text-xs font-semibold uppercase tracking-wide select-none";

  interface MultipleSelectDropdownProps {
    options: SelectOption[];
    selectedValues: SelectOption[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onToggle: (option: SelectOption) => void;
    onClear: () => void;
    onDone: () => void;
    onCancel: () => void;
  }

  function MultipleSelectDropdown({
    options,
    selectedValues,
    searchTerm,
    onSearchChange,
    onToggle,
    onClear,
    onDone,
    onCancel
  }: MultipleSelectDropdownProps) {
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
      searchRef.current?.focus();
    }, []);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredOpts = normalizedSearch
      ? options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
      : options;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      } else if (event.key === "Enter") {
        event.preventDefault();
        onDone();
      }
    };

    return h("div", { className: "flex w-full flex-col gap-2 py-2" },
      selectedValues.length
        ? h("div", { className: "flex flex-wrap gap-1 px-3" },
            ...selectedValues.map((option) => h("span", {
              key: option.id,
              className: "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
            },
              option.label,
              h("button", {
                type: "button",
                className: "text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100",
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation();
                  onToggle(option);
                },
                title: `Remove ${option.label}`
              }, h(FaTimes, { className: "h-3 w-3" }))
            ))
          )
        : null,
      h("div", { className: "px-3" },
        h("input", {
          ref: searchRef,
          type: "text",
          value: searchTerm,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value),
          onKeyDown: handleKeyDown,
          className: "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
          placeholder: "Search options"
        })
      ),
      h("div", { className: "max-h-60 overflow-y-auto py-1", role: "listbox" },
        filteredOpts.length
          ? filteredOpts.map((option) => {
              const identifier = optionIdentifier(option);
              const isSelected = selectedValues.some((value) => optionIdentifier(value) === identifier);
              const swatchStyle: React.CSSProperties = option.color
                ? { backgroundColor: option.color, borderColor: option.color }
                : {};
              return h("button", {
                key: option.id,
                type: "button",
                className: mergeClasses(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                    : "hover:bg-zinc-100 dark:hover:bg-neutral-800"
                ),
                onClick: () => onToggle(option),
                role: "option",
                "aria-selected": isSelected ? "true" : "false"
              },
                h("span", {
                  className: "h-2.5 w-2.5 rounded-full border border-zinc-300",
                  style: swatchStyle
                }),
                h("span", { className: "flex-1 text-left" }, option.label),
                isSelected ? h(FaCheck, { className: "h-3.5 w-3.5" }) : null
              );
            })
          : h("div", { className: "px-3 py-2 text-sm text-zinc-400 dark:text-neutral-500" }, "No options found")
      ),
      h("div", { className: "flex items-center justify-between border-t border-zinc-200 px-3 pt-2 text-xs dark:border-neutral-700" },
        h("button", {
          type: "button",
          className: mergeClasses(
            "font-medium text-zinc-500 hover:text-zinc-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            !selectedValues.length && "pointer-events-none opacity-40"
          ),
          onClick: onClear,
          disabled: !selectedValues.length
        }, "Clear"),
        h("div", { className: "flex gap-2" },
          h("button", {
            type: "button",
            className: "font-medium text-zinc-500 hover:text-zinc-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            onClick: onCancel
          }, "Cancel"),
          h("button", {
            type: "button",
            className: "rounded-full bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
            onClick: onDone
          }, "Done")
        )
      )
    );
  }

  interface SingleSelectDropdownProps {
    options: SelectOption[];
    currentValue: SelectOption | null;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSelect: (nextValue: SelectOption | null) => void;
    onCancel: () => void;
  }

  function SingleSelectDropdown({
    options,
    currentValue,
    searchTerm,
    onSearchChange,
    onSelect,
    onCancel
  }: SingleSelectDropdownProps) {
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    React.useEffect(() => {
      searchRef.current?.focus();
    }, []);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredOpts = normalizedSearch
      ? options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
      : options;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };

    return h("div", { className: "flex w-full flex-col gap-2 py-2" },
      h("div", { className: "px-3" },
        h("input", {
          ref: searchRef,
          type: "text",
          value: searchTerm,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value),
          onKeyDown: handleKeyDown,
          className: "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
          placeholder: "Search options"
        })
      ),
      currentValue ? h("div", { className: "flex items-center justify-between px-3 text-xs text-zinc-500 dark:text-neutral-400" },
        h("span", null, `Selected: ${currentValue.label}`),
        h("button", {
          type: "button",
          className: "font-medium text-blue-600 hover:underline dark:text-blue-300",
          onClick: () => onSelect(null)
        }, "Clear")
      ) : null,
      h("div", { className: "max-h-60 overflow-y-auto py-1", role: "listbox" },
        filteredOpts.length
          ? filteredOpts.map((option) => {
              const isSelected = currentValue != null && optionIdentifier(currentValue) === optionIdentifier(option);
              const swatchStyle: React.CSSProperties = option.color
                ? { backgroundColor: option.color, borderColor: option.color }
                : {};
              return h("button", {
                key: option.id,
                type: "button",
                className: mergeClasses(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                    : "hover:bg-zinc-100 dark:hover:bg-neutral-800"
                ),
                onClick: () => onSelect(option),
                role: "option",
                "aria-selected": isSelected ? "true" : "false"
              },
                h("span", {
                  className: "h-2.5 w-2.5 rounded-full border border-zinc-300",
                  style: swatchStyle
                }),
                h("span", { className: "flex-1 text-left" }, option.label),
                isSelected ? h(FaCheck, { className: "h-3.5 w-3.5" }) : null
              );
            })
          : h("div", { className: "px-3 py-2 text-sm text-zinc-400 dark:text-neutral-500" }, "No options found")
      )
    );
  }

  function renderCellEditor(r: number, c: number) {
    const col = columns[c];
    const val = getCellValue(r, c);
    const baseEditorClass = "absolute inset-0 z-20 w-full h-full px-2 py-1 text-sm bg-white dark:bg-neutral-900 outline-none ring-2 ring-blue-500";
    const commonProps: any = {
      ref: (el: any) => (editorRef.current = el),
      onBlur: commitEdit,
      onKeyDown: handleEditorKeyDown
    };

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
          className: baseEditorClass,
          type: "number",
          step: col.type === "percent" ? "1" : "any",
          defaultValue: String(val ?? ""),
          onChange: (e: any) => setCellValue(r, c, coerceValue(e.target.value, col))
        });
      case "date":
        return h("input", {
          ...commonProps,
          className: baseEditorClass,
          type: "date",
          defaultValue: val ? new Date(val).toISOString().slice(0, 10) : "",
          onChange: (e: any) => {
            const inputValue = e.target.value ? new Date(e.target.value).toISOString() : null;
            setCellValue(r, c, inputValue);
          }
        });
      case "singleLineText":
      case "longText": {
        const valueString = String(val ?? "");
        const lineCount = Math.min(8, Math.max(1, valueString.split(/\r?\n/).length));
        return h("textarea", {
          ...commonProps,
          className: mergeClasses(baseEditorClass, "resize-none whitespace-pre-wrap leading-snug"),
          defaultValue: valueString,
          rows: lineCount,
          onChange: (e: any) => setCellValue(r, c, e.target.value)
        });
      }
      case "multipleSelect":
      case "singleSelect":
        return null;
      case "attachment":
        return h("input", {
          ...commonProps,
          className: baseEditorClass,
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
          className: baseEditorClass,
          type: "text",
          defaultValue: String(val ?? ""),
          onChange: (e: any) => setCellValue(r, c, e.target.value)
        });
    }
  }

  /* ---- render grid ---- */

  // Header row
  const columnPlaceholderLeft = columnDragHover ? sum(colWidths, 0, columnDragHover.to) : null;
  const columnPlaceholderWidth = columnDragHover ? (colWidths[columnDragHover.from] ?? minColumnWidth) : null;
  const columnPlaceholderHeader = columnPlaceholderLeft != null && columnPlaceholderWidth != null ? h("div", {
    className: "pointer-events-none absolute rounded border-2 border-dashed border-blue-400 bg-blue-400/10",
    style: { left: `${ROW_NUMBER_COLUMN_WIDTH + columnPlaceholderLeft}px`, top: 4, height: `${headerHeight - 8}px`, width: `${columnPlaceholderWidth}px` }
  }) : null;
  const columnPlaceholderBody = columnPlaceholderLeft != null && columnPlaceholderWidth != null ? h("div", {
    className: "pointer-events-none absolute border-2 border-dashed border-blue-400 bg-blue-400/10",
    style: { left: `${ROW_NUMBER_COLUMN_WIDTH + columnPlaceholderLeft}px`, top: 0, bottom: 0, width: `${columnPlaceholderWidth}px` }
  }) : null;

  const rowPlaceholderTop = rowDragHover ? sum(rowHeights, 0, rowDragHover.to) : null;
  const rowPlaceholderHeight = rowDragHover ? (rowHeights[rowDragHover.from] ?? minRowHeight) : null;
  const rowPlaceholderElement = rowPlaceholderTop != null && rowPlaceholderHeight != null ? h("div", {
    className: "pointer-events-none absolute border-2 border-dashed border-blue-400 bg-blue-400/10",
    style: { top: `${rowPlaceholderTop}px`, left: 0, right: 0, height: `${rowPlaceholderHeight}px` }
  }) : null;
  const columnResizeGuideLine = columnResizeGuide ? h(React.Fragment, null,
    h("div", {
      className: mergeClasses(
        "pointer-events-none absolute top-0 bottom-0 w-[2.5px]",
        columnResizeGuide.active ? "bg-blue-500/90" : "bg-blue-400/70"
      ),
      style: { left: `${columnResizeGuide.left - 1.25}px` }
    }),
    h("div", {
      className: "pointer-events-none absolute rounded-full bg-blue-500",
      style: { left: `${columnResizeGuide.left - 2}px`, top: `${columnHandleTop}px`, width: "4px", height: "25px" }
    })
  ) : null;
  const rowResizeGuideLine = rowResizeGuide ? h(React.Fragment, null,
    h("div", {
      className: mergeClasses(
        "pointer-events-none absolute left-0 right-0 h-[2.5px]",
        rowResizeGuide.active ? "bg-blue-500/90" : "bg-blue-400/70"
      ),
      style: { top: `${rowResizeGuide.top - 1.25}px` }
    }),
    h("div", {
      className: "pointer-events-none absolute rounded-full bg-blue-500",
      style: { top: `${rowResizeGuide.top - 2}px`, left: `${rowHandleLeft}px`, width: "25px", height: "4px" }
    })
  ) : null;

  const headerContent: React.ReactNode[] = [
    h("div", {
      key: "row-number-header",
      className: mergeClasses(
        cx("rowNumberHeader", baseHeaderClass),
        "sticky left-0 z-40 flex items-center justify-center px-2",
        isAllRowsSelected && "bg-blue-100 text-blue-700 dark:bg-neutral-700/80 dark:text-blue-100",
        selectAllIndeterminate && !isAllRowsSelected && "bg-blue-50/70 dark:bg-neutral-700/60"
      ),
      style: {
        width: `${ROW_NUMBER_COLUMN_WIDTH}px`,
        minWidth: `${ROW_NUMBER_COLUMN_WIDTH}px`,
        maxWidth: `${ROW_NUMBER_COLUMN_WIDTH}px`,
        height: "100%"
      },
      role: "button",
      tabIndex: 0,
      "aria-pressed": isAllRowsSelected ? "true" : "false",
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        toggleSelectAllRows();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleSelectAllRows();
        }
      }
    },
      h("input", {
        ref: selectAllCheckboxRef,
        type: "checkbox",
        className: "h-4 w-4 cursor-pointer accent-blue-500",
        checked: isAllRowsSelected,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          event.stopPropagation();
          toggleSelectAllRows();
        },
        onClick: (event: React.MouseEvent<HTMLInputElement>) => {
          event.stopPropagation();
        },
        "aria-label": "Select all rows"
      })
    )
  ];
  if (columnSpacerLeft > 0) {
    headerContent.push(h("div", { key: "header-left-spacer", style: { flex: "0 0 auto", width: `${columnSpacerLeft}px`, height: "100%" } }));
  }
  headerColumnIndices.forEach((c) => {
    const col = columns[c];
    if (!col) return;
    const isEditing = headerEditing === c;
    const isDraggingColumnHeader = columnDragHover && columnDragHover.from === c;
    const isColumnEdgeActive = columnResizeHover === c || (columnResizeGuide && columnResizeGuide.index === c);
    const isColumnResizing = !!(columnResizeGuide?.active && columnResizeGuide.index === c);
    const columnFullySelected = !!selection &&
      selection.c0 <= c &&
      selection.c1 >= c &&
      selection.r0 === 0 &&
      (rows.length === 0 ? selection.r1 === 0 : selection.r1 >= rows.length - 1);
    headerContent.push(h("div",
      {
        key: colKey(col, c),
        className: mergeClasses(
          cx("headerCell", baseHeaderClass),
          "flex items-center gap-2 px-3 transition-transform",
          isDraggingColumnHeader && "opacity-60 scale-[0.98] bg-blue-50/60 dark:bg-neutral-800/50",
          columnFullySelected && "bg-blue-100 text-blue-700 dark:bg-neutral-700/80 dark:text-blue-100"
        ),
        style: {
          width: `${colWidths[c]}px`,
          minWidth: `${colWidths[c]}px`,
          maxWidth: `${colWidths[c]}px`,
          transform: isDraggingColumnHeader ? "scale(0.98)" : undefined
        },
        onDoubleClick: () => setHeaderEditing(c),
        onContextMenu: (e: React.MouseEvent) => headerMenu.open(e, c),
        role: "columnheader",
        "data-c": c,
        draggable: true,
        onClick: (event: React.MouseEvent) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-header-menu-trigger='true']")) return;
          if (target?.closest("[data-resize-handle='true']")) return;
          selectColumnByIndex(c);
        },
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
        : (() => {
            const icon = renderColumnIcon(col.type);
            const openFromTarget = (target: HTMLElement) => {
              if (!target) return;
              const rect = target.getBoundingClientRect();
              headerMenu.openAt({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 6,
                columnIndex: c,
                anchorRect: rect,
                anchorElement: target,
                align: "center",
                side: "bottom",
                offset: 6
              });
            };
            return h("div", { className: "group flex w-full items-center gap-2 truncate" },
              icon,
              h("span", { className: "flex-1 truncate text-zinc-700 dark:text-zinc-200 font-medium" }, String(col.name)),
              h("button", {
                type: "button",
                className: "ml-auto inline-flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity hover:bg-blue-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-neutral-700 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:opacity-100",
                onClick: (ev: React.MouseEvent<HTMLButtonElement>) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  openFromTarget(ev.currentTarget);
                },
                "aria-haspopup": "menu",
                "aria-expanded": headerMenu.menu?.columnIndex === c ? "true" : "false",
                title: "Column options",
                "data-header-menu-trigger": "true"
              }, h(FaChevronDown, { className: "h-3.5 w-3.5" }))
            );
          })(),
      // header resizer
      h("div", {
        className: mergeClasses(
          cx("resizer", ""),
          "absolute right-0 top-0 h-full cursor-col-resize transition-all bg-transparent",
          isColumnResizing || isColumnEdgeActive ? "w-2.5" : "w-1"
        ),
        draggable: false,
        "data-resize-handle": "true",
        onMouseDown: (e: React.MouseEvent) => startColResize(c, e),
        onMouseEnter: (e: React.MouseEvent) => {
          setColumnResizeHover(c);
          updateColumnGuidePosition(c, e.clientX, e.clientY, false);
        },
        onMouseMove: (e: React.MouseEvent) => updateColumnGuidePosition(c, e.clientX, e.clientY, columnResizeGuide?.active ?? false),
        onMouseLeave: () => {
          if (!columnResizeGuide?.active) {
            setColumnResizeHover((prev) => (prev === c ? null : prev));
            setColumnResizeGuide((prev) => (prev && !prev.active ? null : prev));
          }
        }
      })
    ));
  });
  if (columnSpacerRight > 0) {
    headerContent.push(h("div", { key: "header-right-spacer", style: { flex: "0 0 auto", width: `${columnSpacerRight}px`, height: "100%" } }));
  }
  headerContent.push(
    columnPlaceholderHeader,
    h("div", {
      key: "header-resizer",
      className: "absolute bottom-0 left-0 right-0 h-1 cursor-row-resize",
      onMouseDown: startHeaderResize
    }),
    h("button", {
      key: "header-add-column",
      className: mergeClasses(cx("plusButton", ""), "absolute -right-10 top-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs bg-white dark:bg-neutral-900"),
      onClick: addColumn,
      title: "Add column",
      onDragOver: (e: React.DragEvent) => onColumnDragOver(columns.length, e),
      onDrop: (e: React.DragEvent) => onColumnDrop(columns.length, e)
    }, "+")
  );

  const header = h("div",
    {
      className: mergeClasses(cx("headerRow", "flex relative bg-zinc-100 dark:bg-neutral-800 border-b border-zinc-300 dark:border-neutral-700")),
      style: { height: `${headerHeight}px`, minWidth: `${Math.max(totalColumnWidth + ROW_NUMBER_COLUMN_WIDTH, ROW_NUMBER_COLUMN_WIDTH)}px` }
    },
    ...headerContent
  );

  // Body rows
  const rowElements = renderedRowIndexes.map((r) => {
    const row = rows[r];
    if (!row) return null;
    const rowAccentColor = rowColorMap.get(r) ?? null;
    const groupLabel = groupHeaders.get(r) ?? null;
    const isDraggingRow = rowDragHover && rowDragHover.from === r;
    const isRowEdgeActive = rowResizeHover === r || (rowResizeGuide && rowResizeGuide.index === r);
    const isRowResizing = !!(rowResizeGuide?.active && rowResizeGuide.index === r);
    const rowStyle: React.CSSProperties = {
      height: `${rowHeights[r]}px`,
      transform: isDraggingRow ? "scale(0.995)" : undefined
    };
    if (rowAccentColor) {
      const accent = `${rowAccentColor}4D`;
      rowStyle.boxShadow = [rowStyle.boxShadow, `inset 3px 0 0 ${rowAccentColor}`, `0 0 0 1px ${accent}`].filter(Boolean).join(", ");
    }
    if (groupLabel) {
      rowStyle.borderTop = "1px solid rgba(148,163,184,0.35)";
    }
    const rowChildren: React.ReactNode[] = [
      h("button", {
        key: `drag-${r}`,
        type: "button",
        className: mergeClasses(
          "absolute -left-16 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border bg-white dark:bg-neutral-900 flex items-center justify-center text-zinc-400 hover:text-zinc-600",
          isRowReorderLocked && "cursor-not-allowed opacity-40"
        ),
        draggable: !isRowReorderLocked,
        disabled: isRowReorderLocked,
        onDragStart: (e: React.DragEvent) => {
          if (isRowReorderLocked) {
            e.preventDefault();
            return;
          }
          e.stopPropagation();
          startRowDrag(r, e);
        },
        onDragEnd: () => endRowDrag(),
        title: isRowReorderLocked ? "Reorder disabled while sorted or grouped" : "Drag to reorder row"
      }, h(FaGripVertical, { className: "h-4 w-4" }))
    ];
    const isRowSelected = isRowSelectionRange && selection && r >= selection.r0 && r <= selection.r1;
    const showRowCheckbox = hoveredRowHeader === r || Boolean(isRowSelected);
    rowChildren.push(
      h("div", {
        key: `row-number-${r}`,
        className: mergeClasses(
          cx("rowNumberCell", ""),
          "sticky left-0 z-30 flex h-full cursor-pointer select-none items-center justify-center border-b border-r border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
          isRowSelected && "bg-blue-50/70 text-blue-600 dark:bg-neutral-800/70 dark:text-blue-100"
        ),
        style: {
          width: `${ROW_NUMBER_COLUMN_WIDTH}px`,
          minWidth: `${ROW_NUMBER_COLUMN_WIDTH}px`,
          maxWidth: `${ROW_NUMBER_COLUMN_WIDTH}px`
        },
        role: "button",
        tabIndex: 0,
        "aria-label": `Select row ${r + 1}`,
        "aria-pressed": isRowSelected ? "true" : "false",
        onClick: () => selectRowByIndex(r),
        onKeyDown: (ev: React.KeyboardEvent<HTMLDivElement>) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            selectRowByIndex(r);
          }
        },
        onMouseEnter: () => setHoveredRowHeader(r),
        onMouseLeave: () => setHoveredRowHeader((prev) => (prev === r ? null : prev))
      },
        showRowCheckbox
          ? h("input", {
              type: "checkbox",
              className: "h-4 w-4 cursor-pointer accent-blue-500",
              readOnly: true,
              checked: Boolean(isRowSelected),
              onClick: (ev: React.MouseEvent<HTMLInputElement>) => {
                ev.stopPropagation();
                selectRowByIndex(r);
              }
            })
          : h("span", { className: "text-xs font-medium" }, String(r + 1))
      )
    );
    if (columnSpacerLeft > 0) {
      rowChildren.push(h("div", { key: `row-${r}-left-spacer`, style: { flex: "0 0 auto", width: `${columnSpacerLeft}px`, height: "100%" } }));
    }
    const firstBodyColumnIndex = (bodyColumnIndices.length ? bodyColumnIndices : columns.map((_col, idx) => idx))[0] ?? 0;
    (bodyColumnIndices.length ? bodyColumnIndices : columns.map((_col, idx) => idx)).forEach((c) => {
      const col = columns[c];
      if (!col) return;
      const active = activeCell && activeCell.r === r && activeCell.c === c;
      const inSel = selection && r >= selection.r0 && r <= selection.r1 && c >= selection.c0 && c <= selection.c1;
      const isEditingCell = editing && editing.r === r && editing.c === c;
      const isColumnEdgeActive = columnResizeHover === c || (columnResizeGuide && columnResizeGuide.index === c);
      const isColumnResizing = !!(columnResizeGuide?.active && columnResizeGuide.index === c);
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
      if (columnDragHover && columnDragHover.from === c) {
        style.opacity = 0.6;
        style.transform = "scale(0.98)";
        if (!style.backgroundColor) style.backgroundColor = "rgba(59,130,246,0.1)";
      }
      const cellValue = getCellValue(r, c);
      const displayContent = displayValue(cellValue, col);
      const contentClass = mergeClasses(
        "w-full whitespace-pre-wrap break-words leading-snug",
        decorated?.bold && "font-semibold",
        decorated?.italic && "italic",
        decorated?.underline && "underline"
      );
      const contentStyle: React.CSSProperties = {
        textAlign: decorated?.align,
        userSelect: "none"
      };
      let contentNode: React.ReactNode = h("div", {
        className: contentClass,
        style: contentStyle
      }, displayContent);
      if (!isEditingCell && col.type === "rating") {
        const max = Math.max(1, col.config?.rating?.max ?? 5);
        const previewValue = ratingPreview && ratingPreview.r === r && ratingPreview.c === c ? ratingPreview.value : null;
        const currentValue = Number(cellValue ?? 0);
        const effectiveValue = previewValue ?? currentValue;
        const iconType = col.config?.rating?.icon ?? "star";
        const IconComponent = iconType === "heart" ? FaHeart : iconType === "circle" ? FaCircle : FaStar;
        const activeColor =
          iconType === "heart" ? "text-pink-500" :
          iconType === "circle" ? "text-teal-400" :
          "text-yellow-400";
        const inactiveColor = "text-zinc-300 dark:text-neutral-700";
        const isReadOnly = !!col.readOnly;
        const justifyContent =
          decorated?.align === "right" ? "flex-end" :
          decorated?.align === "center" ? "center" : "flex-start";
        const buttons = Array.from({ length: max }, (_unused, index) => {
          const value = index + 1;
          const isActive = effectiveValue >= value;
          const colorClass = isActive ? activeColor : inactiveColor;
          const sharedHandlers = isReadOnly ? {} : {
            onMouseEnter: () => setRatingPreview({ r, c, value }),
            onFocus: () => setRatingPreview({ r, c, value }),
            onMouseLeave: () => setRatingPreview((prev) => (prev && prev.r === r && prev.c === c ? null : prev)),
            onBlur: () => setRatingPreview((prev) => (prev && prev.r === r && prev.c === c ? null : prev)),
            onClick: () => setCellValue(r, c, value, { commit: true })
          };
          return h("button", {
            key: value,
            type: "button",
            className: mergeClasses(
              "inline-flex items-center justify-center transition-transform",
              !isReadOnly && "cursor-pointer hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
            ),
            title: `Set rating to ${value} of ${max}`,
            ...sharedHandlers
          },
            h(IconComponent, { className: mergeClasses("h-4 w-4", colorClass) })
          );
        });
        contentNode = h("div", {
          className: mergeClasses(
            "flex items-center gap-1",
            decorated?.bold && "font-semibold",
            decorated?.italic && "italic",
            decorated?.underline && "underline"
          ),
          style: { justifyContent },
          onMouseLeave: () => setRatingPreview((prev) => (prev && prev.r === r && prev.c === c ? null : prev))
        }, ...buttons);
      }
      if (!isEditingCell && groupLabel && c === firstBodyColumnIndex) {
        contentNode = h("div", { className: "flex flex-col gap-1" },
          h("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-neutral-400" }, groupLabel),
          contentNode
        );
      }
      const editorNode = isEditingCell ? renderCellEditor(r, c) : null;
      rowChildren.push(h("div", {
        key: colKey(col, c),
        className: mergeClasses(
          cx("cell", baseCellClass),
          "px-2 py-1 overflow-hidden transition-transform",
          columnDragHover && columnDragHover.from === c && "bg-blue-50/50 dark:bg-neutral-800/50",
          active && "ring-2 ring-blue-500"
        ),
        style,
        role: "gridcell",
        "data-r": r,
        "data-c": c,
        onMouseDown: (e: React.MouseEvent) => startDrag(r, c, e),
        onDoubleClick: () => beginEdit(r, c),
        onContextMenu: (e: React.MouseEvent) => handleCellContextMenu(e, r, c)
      }, editorNode ?? contentNode));
    });
    if (columnSpacerRight > 0) {
      rowChildren.push(h("div", { key: `row-${r}-right-spacer`, style: { flex: "0 0 auto", width: `${columnSpacerRight}px`, height: "100%" } }));
    }
    rowChildren.push(
      h("div", {
        key: `resizer-${r}`,
        className: mergeClasses(
          "absolute bottom-0 left-0 right-0 cursor-row-resize transition-all bg-transparent",
          isRowResizing || isRowEdgeActive ? "h-2.5" : "h-1"
        ),
        onMouseDown: (e: React.MouseEvent) => startRowResize(r, e),
        onMouseEnter: (e: React.MouseEvent) => {
          setRowResizeHover(r);
          updateRowGuidePosition(r, e.clientY, e.clientX, false);
        },
        onMouseMove: (e: React.MouseEvent) => updateRowGuidePosition(r, e.clientY, e.clientX, rowResizeGuide?.active ?? false),
        onMouseLeave: () => {
          if (!rowResizeGuide?.active) {
            setRowResizeHover((prev) => (prev === r ? null : prev));
            setRowResizeGuide((prev) => (prev && !prev.active ? null : prev));
          }
        }
      }),
      h("button", {
        key: `expand-${r}`,
        className: "absolute -left-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border bg-white dark:bg-neutral-900 flex items-center justify-center text-sm",
        onClick: () => setDetailsModal({ rowIndex: r }),
        title: "Expand details"
      }, "+")
    );
    return h("div", {
      key: rowKey(row, r),
      className: mergeClasses(
        cx("row", "flex relative"),
        "transition-transform",
        isDraggingRow && "ring-2 ring-blue-300/60 bg-blue-50/70 dark:bg-neutral-800/60"
      ),
      style: rowStyle,
      role: "row",
      onDragOver: (e: React.DragEvent) => onRowDragOver(r, e),
      onDrop: (e: React.DragEvent) => onRowDrop(r, e)
    }, ...rowChildren);
  }).filter(Boolean);

  const rowsContainer = h("div", {
    key: "rows-container",
    style: { paddingTop: `${rowSpacerTop}px`, paddingBottom: `${rowSpacerBottom}px` }
  }, ...rowElements);

  const addRowButton = h("div", { className: "flex items-center justify-center py-3", key: "add-row" },
    h("button", {
      type: "button",
      className: mergeClasses(cx("plusButton", ""), "rounded-full border px-3 py-1 text-sm bg-white dark:bg-neutral-900"),
      onClick: addRow,
      onDragOver: (e: React.DragEvent) => onRowDragOver(rows.length, e),
      onDrop: (e: React.DragEvent) => onRowDrop(rows.length, e)
    }, "+ Add row")
  );

  const loadMoreButton = hasMoreRows ? h("div", {
    key: "load-more",
    className: "flex items-center justify-center pb-4"
  },
    h("button", {
      type: "button",
      className: "rounded-full border px-4 py-1 text-sm bg-white dark:bg-neutral-900 disabled:opacity-50",
      disabled: isLoadMorePending || !onLoadMoreRows,
      onClick: handleLoadMoreRows
    }, isLoadMorePending ? "Loading…" : "Load more rows")
  ) : null;

  const body = h("div",
    {
      className: mergeClasses(cx("grid", "relative")),
      ref: gridRef,
      onMouseMove,
      onMouseUp: endDrag,
      style: { minWidth: `${Math.max(totalColumnWidth + ROW_NUMBER_COLUMN_WIDTH, ROW_NUMBER_COLUMN_WIDTH)}px` }
    },
    rowsContainer,
    columnPlaceholderBody,
    rowPlaceholderElement,
    selection && h("div", {
      className: mergeClasses(cx("selection", ""), "pointer-events-none absolute border-2 border-blue-500"),
      style: selectionBoxStyle(selection, colWidths, rowHeights, headerHeight)
    }),
    selection && h("div", {
      className: "absolute w-3 h-3 bg-blue-500 rounded-sm cursor-crosshair",
      style: selectionFillHandleStyle(selection, colWidths, rowHeights, headerHeight),
      onMouseDown: onFillMouseDown
    }),
    addRowButton,
    loadMoreButton
  );

  /* Context menu UI */
  const headerContextMenu = headerMenu.menu && (() => {
    const {
      columnIndex,
      x,
      y,
      anchorElement,
      anchorRect,
      align,
      side,
      offset
    } = headerMenu.menu;
    const column = columns[columnIndex];
    if (!column) return null;
    const optionClass = (disabled?: boolean) => mergeClasses(
      "flex items-center gap-2 rounded-lg px-3 py-1 text-sm transition-colors",
      disabled
        ? "opacity-40 cursor-not-allowed"
        : "hover:bg-blue-50 text-zinc-700 dark:text-zinc-200 dark:hover:bg-neutral-800"
    );
    const makeOption = (
      label: string,
      Icon: React.ComponentType<{ className?: string }>,
      handler: () => void | Promise<void>,
      disabled = false
    ) => h("button", {
      key: label,
      type: "button",
      className: optionClass(disabled),
      onClick: async () => {
        if (disabled) return;
        await handler();
        headerMenu.close();
      }
    },
      h(Icon, { className: "h-4 w-4 text-blue-500 dark:text-blue-400" }),
      h("span", { className: "flex-1 text-left" }, label)
    );

    const primaryOptions = [
      makeOption("Edit field", FaPencilAlt, () => setHeaderEditing(columnIndex)),
      makeOption("Duplicate field", FaClone, () => duplicateColumn(columnIndex)),
      makeOption("Insert left", FaArrowLeft, () => insertColumnAtIndex(columnIndex)),
      makeOption("Insert right", FaArrowRight, () => insertColumnAtIndex(columnIndex + 1)),
      makeOption("Copy field URL", FaLink, () => copyFieldUrlToClipboard(columnIndex)),
      makeOption("Edit field description", FaInfoCircle, () => promptColumnDescription(columnIndex)),
      makeOption("Edit field permissions", FaLock, () => promptColumnPermissions(columnIndex))
    ];

    const typeSection = [
      h("div", { key: "type-heading", className: "px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-neutral-500" }, "Change type"),
      ...ALL_TYPES.map((opt) =>
        h("button", {
          key: `type-${opt.value}`,
          type: "button",
          className: "flex items-center gap-2 px-3 py-1 text-sm rounded-lg hover:bg-blue-50 text-zinc-700 dark:text-zinc-200 dark:hover:bg-neutral-800",
          onClick: () => {
            changeColumnType(columnIndex, opt.value);
            headerMenu.close();
          }
        },
          renderColumnIcon(opt.value),
          h("span", { className: "flex-1 text-left" }, opt.label)
        )
      )
    ];

    const checkboxOptions = column.type === "checkbox"
      ? [
          makeOption("Sort [ ] -> [x]", FaSortAmountUp, () => sortCheckboxColumn(columnIndex, "uncheckedFirst")),
          makeOption("Sort [x] -> [ ]", FaSortAmountDown, () => sortCheckboxColumn(columnIndex, "checkedFirst"))
        ]
      : [];

    const advancedOptions = [
      makeOption("Filter by this field", FaFilter, () => {
        setSearchTerm(String(column.name ?? ""));
        setSearchOpen(true);
      }),
      makeOption("Group by this field", FaLayerGroup, () => console.info("Group by field not yet implemented.")),
      makeOption("Show dependencies", FaSlidersH, () => console.info("Field dependencies not yet implemented.")),
      makeOption("Hide field", FaEyeSlash, () => hideColumn(columnIndex)),
      makeOption("Delete field", FaTrash, () => requestRemoveColumns([columnIndex]))
    ];

    const hiddenSection = hiddenColumns.length
      ? [
          h("div", { key: "hidden-heading", className: "px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-neutral-500" }, "Hidden fields"),
          ...hiddenColumns.map((entry, hiddenIdx) =>
            makeOption(`Show ${String(entry.column.name)}`, FaEye, () => restoreHiddenColumn(hiddenIdx))
          )
        ]
      : [];

    const sections: React.ReactNode[] = [];
    const pushSection = (key: string, nodes: React.ReactNode[]) => {
      if (!nodes.length) return;
      if (sections.length) {
        sections.push(h("div", { key: `${key}-divider`, className: "border-t border-zinc-200 dark:border-neutral-700 my-1" }));
      }
      sections.push(...nodes.map((node, idx) =>
        React.isValidElement(node) && !node.key
          ? React.cloneElement(node, { key: `${key}-${idx}` })
          : node
      ));
    };

    pushSection("primary", primaryOptions);
    pushSection("types", typeSection);
    if (checkboxOptions.length) {
      pushSection("checkbox", checkboxOptions);
    }
    if (hiddenSection.length) {
      pushSection("hidden", hiddenSection);
    }
    pushSection("advanced", advancedOptions);

    return h(FloatingMenuSurface, {
      className: mergeClasses(
        cx("contextMenu", ""),
        "fixed z-50 min-w-[240px] rounded-xl border bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
      ),
      anchorElement,
      anchorRect,
      align,
      side,
      offset,
      point: { x, y },
      onMouseLeave: () => headerMenu.close()
    }, ...sections);
  })();

  const cellContextMenu = cellMenu.menu && (() => {
    const sel = cellMenu.menu!.selection;
    if (!sel) return null;
    const sample = getCellStyle(sel.r0, sel.c0) ?? {};
    const fillValue = typeof sample.background === "string" ? sample.background : "#ffffff";
    const textValue = typeof sample.color === "string" ? sample.color : "#000000";
    const alignment = sample.align ?? null;
    const isBold = !!sample.bold;
    const isItalic = !!sample.italic;
    const isUnderline = !!sample.underline;
    const canPasteFormat = !!formatClipboardRef.current;
    const toggleButtonClass = (active: boolean) => mergeClasses(
      "inline-flex h-7 w-7 items-center justify-center rounded border text-xs transition-colors",
      active
        ? "bg-blue-100 border-blue-300 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/40"
        : "border-zinc-200 hover:bg-zinc-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    );
    return h(FloatingMenuSurface, {
      className: "fixed z-50 rounded-lg border bg-white dark:bg-neutral-900 shadow-xl p-2 text-sm min-w-[220px]",
      point: { x: cellMenu.menu!.x, y: cellMenu.menu!.y },
      offset: 8,
      onMouseLeave: () => cellMenu.close()
    },
      h("div", { className: "flex flex-col gap-1" },
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await cutSelectionRange(sel); cellMenu.close(); } }, "Cut"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await copySelectionToClipboard(sel); cellMenu.close(); } }, "Copy"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: async () => { await pasteFromClipboard(sel); cellMenu.close(); } }, "Paste"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { clearSelectionCells(sel); cellMenu.close(); } }, "Delete"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { copySelectionFormatting(sel); cellMenu.close(); } }, "Copy format"),
        h("button", {
          className: mergeClasses("text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", !canPasteFormat && "opacity-40 cursor-not-allowed"),
          onClick: () => { if (canPasteFormat) { pasteSelectionFormatting(sel); cellMenu.close(); } },
          disabled: !canPasteFormat
        }, "Paste format"),
        h("div", { className: "border-t my-1" }),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertRowsAt(sel.r0, [createBlankRow()]); cellMenu.close(); } }, "Insert row above"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertRowsAt(sel.r1 + 1, [createBlankRow()]); cellMenu.close(); } }, "Insert row below"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertColumnAtIndex(sel.c0); cellMenu.close(); } }, "Insert column left"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { insertColumnAtIndex(sel.c1 + 1); cellMenu.close(); } }, "Insert column right"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { requestRemoveRows({ start: sel.r0, end: sel.r1 }); cellMenu.close(); } }, "Delete row"),
        h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800", onClick: () => { const indices = Array.from({ length: sel.c1 - sel.c0 + 1 }, (_v, i) => sel.c0 + i); requestRemoveColumns(indices); cellMenu.close(); } }, "Delete column")
      ),
      h("div", { className: "border-t my-2" }),
      h("div", { className: "px-3 py-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400" }, "Text"),
      h("div", { className: "flex items-center gap-1 px-3 pb-2" },
        h("button", { className: toggleButtonClass(isBold), title: "Bold", onClick: () => toggleSelectionTextStyle(sel, "bold") }, h(FaBold, { className: "h-4 w-4" })),
        h("button", { className: toggleButtonClass(isItalic), title: "Italic", onClick: () => toggleSelectionTextStyle(sel, "italic") }, h(FaItalic, { className: "h-4 w-4" })),
        h("button", { className: toggleButtonClass(isUnderline), title: "Underline", onClick: () => toggleSelectionTextStyle(sel, "underline") }, h(FaUnderline, { className: "h-4 w-4" }))
      ),
      h("div", { className: "flex items-center gap-1 px-3 pb-2" },
        h("button", { className: mergeClasses(toggleButtonClass((alignment ?? "left") === "left"), "h-8 w-8"), title: "Align left", onClick: () => setSelectionAlignment(sel, "left") }, h(FaAlignLeft, { className: "h-4 w-4" })),
        h("button", { className: mergeClasses(toggleButtonClass(alignment === "center"), "h-8 w-8"), title: "Align center", onClick: () => setSelectionAlignment(sel, "center") }, h(FaAlignCenter, { className: "h-4 w-4" })),
        h("button", { className: mergeClasses(toggleButtonClass(alignment === "right"), "h-8 w-8"), title: "Align right", onClick: () => setSelectionAlignment(sel, "right") }, h(FaAlignRight, { className: "h-4 w-4" }))
      ),
      h("div", { className: "border-t my-2" }),
      h("div", { className: "px-3 py-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400" }, "Colors & Fill"),
      h("div", { className: "flex items-center gap-2 px-3 pb-2" },
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
      h("button", { className: "text-left px-3 py-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 w-full", onClick: () => { clearStylesFromSelection(sel); cellMenu.close(); } }, "Clear formatting")
    );
  })();


  const primaryViews = availableViews.filter((view) => view.group === "primary");
  const secondaryViews = availableViews.filter((view) => view.group === "secondary");

  const renderViewButton = (view: (typeof availableViews)[number]) => {
    const isActive = activeView === view.instanceId;
    return h("button", {
      key: view.instanceId,
      type: "button",
      role: "menuitemradio",
      "aria-checked": isActive,
      className: mergeClasses(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800"
      ),
      onClick: () => {
        setActiveView(view.instanceId);
        setViewsDropdownOpen(false);
      },
      title: view.displayName,
      "aria-label": view.displayName
    },
      h(view.icon, { className: mergeClasses("h-4 w-4 shrink-0", view.colorClass) }),
      h("span", { className: "truncate" }, view.displayName)
    );
  };

  const viewsDropdownElement = viewsDropdownOpen ? h("div", {
    id: viewsDropdownId,
    ref: viewsDropdownRef,
    className: mergeClasses(
      "absolute right-0 z-40 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      viewsDropdownPlacement === "top"
        ? "bottom-full mb-2 origin-bottom-right"
        : "top-full mt-2 origin-top-right"
    ),
    role: "menu",
    "data-placement": viewsDropdownPlacement,
    "aria-label": "Table views"
  },
    h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Table views"),
    h("div", { className: "flex flex-col gap-1" },
      ...primaryViews.map(renderViewButton)
    ),
    secondaryViews.length ? h("div", { className: "my-2 h-px bg-zinc-200 dark:bg-neutral-800" }) : null,
    secondaryViews.length ? h("div", { className: "flex flex-col gap-1" }, ...secondaryViews.map(renderViewButton)) : null
  ) : null;

  const hideFieldsActive = fieldsMenuOpen || hiddenColumns.length > 0;
  const fieldsButtonLabel = hiddenColumns.length
    ? `${hiddenColumns.length} hidden field${hiddenColumns.length === 1 ? "" : "s"}`
    : "Hide fields";
  const filterButtonLabel = hasActiveFilters ? `Filtered (${activeFilters.length})` : "Filter";
  const sortButtonLabel = sortConfig ? "Sorted by 1 field" : "Sort";
  const groupButtonLabel = groupConfig ? "Grouped" : "Group";
  const colorButtonLabel = colorConfig ? "Color applied" : "Color";
  const colorableColumns = columns.filter((col) => col.type === "singleSelect" || col.type === "multipleSelect");

  type FieldVisibilityEntry = {
    key: string;
    label: string;
    column: ColumnSpec<T>;
    visible: boolean;
    order: number;
    hiddenIndex: number | null;
  };

  const visibleIndexByKey = React.useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach((col, idx) => map.set(String(col.key), idx));
    return map;
  }, [columns]);

  const fieldVisibilityEntries = React.useMemo<FieldVisibilityEntry[]>(() => {
    const visibleEntries = columns.map((col, idx) => ({
      key: String(col.key),
      label: String(col.name ?? `Field ${idx + 1}`),
      column: col,
      visible: true,
      order: idx,
      hiddenIndex: null
    }));
    const hiddenEntries = hiddenColumns.map((entry, idx) => ({
      key: String(entry.column.key),
      label: String(entry.column.name ?? `Field ${idx + 1}`),
      column: entry.column,
      visible: false,
      order: entry.index + (idx + 1) / 100,
      hiddenIndex: idx
    }));
    return [...visibleEntries, ...hiddenEntries].sort((a, b) => a.order - b.order);
  }, [columns, hiddenColumns]);

  const fieldsSearchNormalized = fieldsSearchTerm.trim().toLowerCase();
  const filteredFieldEntries = React.useMemo(() => {
    if (!fieldsSearchNormalized) return fieldVisibilityEntries;
    return fieldVisibilityEntries.filter((entry) =>
      entry.label.toLowerCase().includes(fieldsSearchNormalized)
    );
  }, [fieldVisibilityEntries, fieldsSearchNormalized]);

  const renderFieldLabel = (label: string) => {
    if (!fieldsSearchNormalized) return label;
    const lower = label.toLowerCase();
    const index = lower.indexOf(fieldsSearchNormalized);
    if (index === -1) return label;
    const before = label.slice(0, index);
    const match = label.slice(index, index + fieldsSearchNormalized.length);
    const after = label.slice(index + fieldsSearchNormalized.length);
    return [
      before ? h("span", { key: "before" }, before) : null,
      h("span", { key: "match", className: "text-blue-600 dark:text-blue-300" }, match),
      after ? h("span", { key: "after" }, after) : null
    ].filter(Boolean);
  };

  const fieldListItems = filteredFieldEntries.length
    ? filteredFieldEntries.map((entry) => {
        const disableToggle = entry.visible && columns.length <= 1;
        const title = disableToggle
          ? "At least one field must remain visible"
          : entry.visible
            ? "Hide field"
            : "Show field";
        const typeIcon = renderColumnIcon(entry.column.type);
        const labelContent = renderFieldLabel(entry.label);
        return h("button", {
          key: entry.key,
          type: "button",
          role: "switch",
          "aria-checked": entry.visible ? "true" : "false",
          className: mergeClasses(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
            entry.visible
              ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800"
              : "text-zinc-500 hover:bg-zinc-100/70 dark:text-neutral-400 dark:hover:bg-neutral-800/70",
            disableToggle && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent"
          ),
          onClick: () => {
            if (disableToggle) return;
            if (entry.visible) {
              const idx = visibleIndexByKey.get(entry.key);
              if (typeof idx === "number") {
                handleHideColumnClick(idx);
              }
            } else if (entry.hiddenIndex != null) {
              restoreHiddenColumn(entry.hiddenIndex);
            }
          },
          disabled: disableToggle,
          title
        },
          h("div", { className: "flex flex-1 items-center gap-2" },
            h("span", {
              className: mergeClasses(
                "h-2.5 w-2.5 rounded-full transition ring-2 ring-transparent",
                entry.visible
                  ? "bg-emerald-400 ring-emerald-300/70"
                  : "bg-zinc-500/40"
              )
            }),
            h("span", {
              className: "flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-neutral-900 dark:text-neutral-300"
            }, typeIcon ?? h("span", { className: "h-2 w-2 rounded-full bg-zinc-400/40" })),
            h("span", { className: "flex-1 truncate text-left" }, labelContent)
          ),
          h(FaGripVertical, { className: "h-3 w-3 text-zinc-400" })
        );
      })
    : [
        h("div", {
          key: "fields-empty",
          className: "px-3 py-6 text-center text-sm text-zinc-500 dark:text-neutral-400"
        }, fieldsSearchTerm ? "No fields match that search." : "No fields available.")
      ];

  const fieldsMenu = fieldsMenuOpen ? h("div", {
    ref: fieldsMenuRef,
    className: mergeClasses(
      "absolute left-0 z-40 w-80 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      fieldsMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left"
    ),
    role: "menu",
    "data-placement": fieldsMenuPlacement,
    "aria-label": "Field visibility"
  },
    h("div", { className: "pb-3 space-y-2" },
      h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Fields"),
      h("div", { className: "relative" },
        h(FaSearch, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" }),
        h("input", {
          ref: fieldsSearchInputRef,
          id: fieldsSearchInputId,
          type: "search",
          value: fieldsSearchTerm,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFieldsSearchTerm(e.target.value),
          placeholder: "Find a field",
          className: "w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
          "aria-label": "Find a field"
        })
      ),
      h("div", { className: "flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-neutral-400" },
        h("span", null, `${filteredFieldEntries.length} ${filteredFieldEntries.length === 1 ? "field" : "fields"}`),
        hiddenColumns.length
          ? h("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
              h(FaEyeSlash, { className: "h-3 w-3" }),
              `${hiddenColumns.length} hidden`
            )
          : h("span", { className: "text-emerald-500 dark:text-emerald-300" }, "All visible")
      )
    ),
    h("div", { className: "max-h-72 space-y-1 overflow-y-auto pr-1" },
      ...fieldListItems
    ),
    h("div", { className: "mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-neutral-800 dark:text-neutral-300" },
      h("button", {
        type: "button",
        className: "rounded-md px-2 py-1 text-xs font-semibold transition hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40",
        onClick: hideAllVisibleColumns,
        disabled: columns.length <= 1
      }, "Hide all"),
      h("button", {
        type: "button",
        className: "rounded-md px-2 py-1 text-xs font-semibold transition hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40",
        onClick: showAllHiddenColumns,
        disabled: hiddenColumns.length === 0
      }, "Show all")
    )
  ) : null;

  const filterMenu = filterMenuOpen ? h("div", {
    ref: filterMenuRef,
    className: mergeClasses(
      "absolute left-0 z-40 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      filterMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left"
    ),
    role: "menu",
    "data-placement": filterMenuPlacement,
    "aria-label": "Filter rows"
  },
    h("p", { className: "pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Filter rows"),
    h("label", { className: "mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" },
      "Field",
      h("select", {
        value: filterDraftColumn,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setFilterDraftColumn(e.target.value),
        className: "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      },
        ...columns.map((col, idx) =>
          h("option", { key: `filter-field-${idx}`, value: String(col.key ?? idx) }, String(col.name ?? `Field ${idx + 1}`))
        )
      )
    ),
    h("label", { className: "mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" },
      "Operator",
      h("select", {
        value: filterDraftOperator,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setFilterDraftOperator(e.target.value as "contains" | "equals"),
        className: "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      },
        h("option", { value: "contains" }, "Contains"),
        h("option", { value: "equals" }, "Equals")
      )
    ),
    h("label", { className: "mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" },
      "Value",
      h("input", {
        value: filterDraftValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFilterDraftValue(e.target.value),
        className: "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
        placeholder: "Enter value"
      })
    ),
    hasActiveFilters ? h("div", { className: "mt-2 space-y-1" },
      ...activeFilters.map((filter) => {
        const columnName = columns.find((col) => String(col.key) === filter.columnKey)?.name ?? filter.columnKey;
        const comparator = filter.operator === "equals" ? "=" : "contains";
        return h("div", {
          key: `active-filter-${filter.columnKey}`,
          className: "flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-neutral-800 dark:text-neutral-200"
        },
          h("span", null, `${columnName} ${comparator} "${filter.term}"`),
          h("button", {
            type: "button",
            className: "ml-2 text-xs text-zinc-400 hover:text-rose-500",
            onClick: () => handleFilterRemove(filter.columnKey)
          }, "×")
        );
      })
    ) : null,
    h("div", { className: "mt-3 flex items-center justify-between" },
      h("button", {
        type: "button",
        className: "rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-300",
        onClick: handleFilterApply
      }, "Apply"),
      hasActiveFilters ? h("button", {
        type: "button",
        className: "rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-500 transition hover:border-rose-500 hover:text-rose-500 dark:border-neutral-700 dark:text-neutral-300",
        onClick: clearFilters
      }, "Clear filters") : null
    )
  ) : null;

  const sortMenu = sortMenuOpen ? h("div", {
    ref: sortMenuRef,
    className: mergeClasses(
      "absolute left-0 z-40 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      sortMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left"
    ),
    role: "menu",
    "data-placement": sortMenuPlacement,
    "aria-label": "Sort rows"
  },
    h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Sort by"),
    h("div", { className: "space-y-1" },
      ...columns.map((col, idx) =>
        h("div", {
          key: `sort-${idx}`,
          className: "flex items-center justify-between rounded-lg px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800"
        },
          h("span", { className: "truncate" }, String(col.name ?? `Field ${idx + 1}`)),
          h("div", { className: "flex items-center gap-1" },
            h("button", {
              type: "button",
              className: mergeClasses(
                "rounded-md border px-2 py-1 text-xs",
                sortConfig?.columnKey === String(col.key) && sortConfig?.direction === "asc"
                  ? "border-blue-500 text-blue-600 dark:text-blue-300"
                  : "border-zinc-300 text-zinc-500 dark:border-neutral-700 dark:text-neutral-300"
              ),
              onClick: () => handleSortApply(String(col.key ?? idx), "asc")
            }, "A → Z"),
            h("button", {
              type: "button",
              className: mergeClasses(
                "rounded-md border px-2 py-1 text-xs",
                sortConfig?.columnKey === String(col.key) && sortConfig?.direction === "desc"
                  ? "border-blue-500 text-blue-600 dark:text-blue-300"
                  : "border-zinc-300 text-zinc-500 dark:border-neutral-700 dark:text-neutral-300"
              ),
              onClick: () => handleSortApply(String(col.key ?? idx), "desc")
            }, "Z → A")
          )
        )
      )
    ),
    sortConfig ? h("button", {
      type: "button",
      className: "mt-3 w-full rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-500 transition hover:border-rose-500 hover:text-rose-500 dark:border-neutral-700 dark:text-neutral-300",
      onClick: clearSort
    }, "Clear sort") : null
  ) : null;

  const groupMenu = groupMenuOpen ? h("div", {
    ref: groupMenuRef,
    className: mergeClasses(
      "absolute left-0 z-40 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      groupMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left"
    ),
    role: "menu",
    "data-placement": groupMenuPlacement,
    "aria-label": "Group rows"
  },
    h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Group by"),
    h("div", { className: "space-y-1" },
      ...columns.map((col, idx) =>
        h("button", {
          key: `group-${idx}`,
          type: "button",
          className: mergeClasses(
            "w-full rounded-lg px-3 py-1 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800",
            groupConfig?.columnKey === String(col.key ?? idx) && "border border-blue-500 text-blue-600 bg-blue-500/10 dark:text-blue-300"
          ),
          onClick: () => handleGroupApply(String(col.key ?? idx))
        }, String(col.name ?? `Field ${idx + 1}`))
      )
    ),
    groupConfig ? h("button", {
      type: "button",
      className: "mt-3 w-full rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-500 transition hover:border-rose-500 hover:text-rose-500 dark:border-neutral-700 dark:text-neutral-300",
      onClick: clearGroup
    }, "Remove grouping") : null
  ) : null;

  const colorMenu = colorMenuOpen ? h("div", {
    ref: colorMenuRef,
    className: mergeClasses(
      "absolute left-0 z-40 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      colorMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-2 origin-top-left"
    ),
    role: "menu",
    "data-placement": colorMenuPlacement,
    "aria-label": "Color rows"
  },
    h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Color by field"),
    colorableColumns.length
      ? h("div", { className: "space-y-1" },
        ...colorableColumns.map((col, idx) =>
          h("button", {
            key: `color-${idx}`,
            type: "button",
            className: mergeClasses(
              "w-full rounded-lg px-3 py-1 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800",
              colorConfig?.columnKey === String(col.key ?? idx) && "border border-blue-500 text-blue-600 bg-blue-500/10 dark:text-blue-300"
            ),
            onClick: () => handleColorApply(String(col.key ?? idx))
          }, String(col.name ?? `Field ${idx + 1}`))
        )
      )
      : h("p", { className: "rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:bg-neutral-900 dark:text-neutral-400" }, "No select fields available"),
    colorConfig ? h("button", {
      type: "button",
      className: "mt-3 w-full rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-500 transition hover:border-rose-500 hover:text-rose-500 dark:border-neutral-700 dark:text-neutral-300",
      onClick: clearColor
    }, "Clear color") : null
  ) : null;

  const rowHeightMenu = rowHeightMenuOpen ? h("div", {
    ref: rowHeightMenuRef,
    className: mergeClasses(
      "absolute right-0 z-40 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-950",
      rowHeightMenuPlacement === "top" ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"
    ),
    role: "menu",
    "data-placement": rowHeightMenuPlacement,
    "aria-label": "Row height"
  },
    h("p", { className: "px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-neutral-300" }, "Select a row height"),
    h("div", { className: "space-y-1" },
      ...rowHeightOptions.map((option) =>
        h("button", {
          key: option.id,
          type: "button",
          className: mergeClasses(
            "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-neutral-800",
            rowHeightPreset === option.id && "border border-blue-500 text-blue-600 bg-blue-500/10 dark:text-blue-300"
          ),
          onClick: () => handleRowHeightSelect(option.id)
        },
          h("span", { className: "font-medium" }, option.label),
          h("span", { className: "text-xs text-zinc-500 dark:text-neutral-400" }, option.description)
        )
      )
    ),
    h("div", { className: "mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-neutral-800 dark:text-neutral-300" },
      h("span", null, "Wrap headers"),
      h("button", {
        type: "button",
        className: mergeClasses(
          "rounded-md border px-2 py-1 text-xs transition",
          wrapHeaders ? "border-blue-500 text-blue-600 dark:text-blue-300" : "border-zinc-300 text-zinc-500 dark:border-neutral-700 dark:text-neutral-300"
        ),
        onClick: toggleWrapHeaders
      }, wrapHeaders ? "On" : "Off")
    )
  ) : null;

  /* Toolbar (view controls, duplicate/delete rows, search) */
  const toolbar = h("div", {
    className: mergeClasses(cx("toolbar",""), "flex flex-wrap items-center gap-2 py-2")
  },
    h("div", { className: "flex flex-wrap items-center gap-2" },
      h("div", { className: "relative" },
        h("button", {
          ref: fieldsButtonRef,
          type: "button",
          className: menuButtonClass(hideFieldsActive),
          onClick: toggleFieldsMenu,
          "aria-haspopup": "menu",
          "aria-expanded": fieldsMenuOpen ? "true" : "false"
        },
          h(FaEyeSlash, { className: "h-3.5 w-3.5" }),
          h("span", null, fieldsButtonLabel)
        ),
        fieldsMenu
      ),
      h("div", { className: "relative" },
        h("button", {
          ref: filterButtonRef,
          type: "button",
          className: menuButtonClass(filterMenuOpen || hasActiveFilters),
          onClick: toggleFilterMenu,
          "aria-haspopup": "menu",
          "aria-expanded": filterMenuOpen ? "true" : "false"
        },
          h(FaFilter, { className: "h-3.5 w-3.5" }),
          h("span", null, filterButtonLabel)
        ),
        filterMenu
      ),
      h("div", { className: "relative" },
        h("button", {
          ref: groupButtonRef,
          type: "button",
          className: menuButtonClass(groupMenuOpen || !!groupConfig),
          onClick: toggleGroupMenu,
          "aria-haspopup": "menu",
          "aria-expanded": groupMenuOpen ? "true" : "false"
        },
          h(FaLayerGroup, { className: "h-3.5 w-3.5" }),
          h("span", null, groupButtonLabel)
        ),
        groupMenu
      ),
      h("div", { className: "relative" },
        h("button", {
          ref: sortButtonRef,
          type: "button",
          className: menuButtonClass(sortMenuOpen || !!sortConfig),
          onClick: toggleSortMenu,
          "aria-haspopup": "menu",
          "aria-expanded": sortMenuOpen ? "true" : "false"
        },
          h(FaSortAmountDown, { className: "h-3.5 w-3.5" }),
          h("span", null, sortButtonLabel)
        ),
        sortMenu
      ),
      h("div", { className: "relative" },
        h("button", {
          ref: colorButtonRef,
          type: "button",
          className: menuButtonClass(colorMenuOpen || !!colorConfig),
          onClick: toggleColorMenu,
          "aria-haspopup": "menu",
          "aria-expanded": colorMenuOpen ? "true" : "false"
        },
          h(FaPalette, { className: "h-3.5 w-3.5" }),
          h("span", null, colorButtonLabel)
        ),
        colorMenu
      ),
      h("div", { className: "relative" },
        h("button", {
          ref: rowHeightButtonRef,
          type: "button",
          className: menuButtonClass(rowHeightButtonActive),
          onClick: toggleRowHeightMenu,
          "aria-haspopup": "menu",
          "aria-expanded": rowHeightMenuOpen ? "true" : "false"
        },
          h(FaTextHeight, { className: "h-3.5 w-3.5" }),
          h("span", null,
            "Row height:",
            h("span", { className: "ml-1 font-semibold" }, rowHeightLabel)
          )
        ),
        rowHeightMenu
      )
    ),
    h("div", { className: "ml-auto flex flex-wrap items-center gap-2" },
      h("button", {
        className: "rounded-full border px-3 py-1 text-sm disabled:opacity-40",
        onClick: () => undo(),
        disabled: !canUndo
      }, "Undo"),
      h("button", {
        className: "rounded-full border px-3 py-1 text-sm disabled:opacity-40",
        onClick: () => redo(),
        disabled: !canRedo
      }, "Redo"),
      h("button", {
        className: "rounded-full border px-3 py-1 text-sm",
        onClick: duplicateSelectedRows
      }, "Duplicate rows"),
      h("button", {
        className: "rounded-full border px-3 py-1 text-sm",
        onClick: deleteSelectedRows
      }, "Delete rows"),
      h("button", {
        className: "rounded-full border px-3 py-1 text-sm",
        onClick: () => setSearchOpen((v) => !v)
      }, "Search"),
      h("div", { className: "relative" },
        h("button", {
          ref: viewsTriggerRef,
          type: "button",
          className: "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition hover:bg-zinc-100 dark:hover:bg-neutral-800",
          onClick: () => setViewsDropdownOpen((open) => !open),
          "aria-haspopup": "menu",
          "aria-expanded": viewsDropdownOpen ? "true" : "false",
          "aria-controls": viewsDropdownOpen ? viewsDropdownId : undefined
        },
          h("span", { className: "inline-flex items-center gap-2" },
            h(ActiveViewIcon, { className: "h-3.5 w-3.5" }),
            h("span", { className: "font-semibold" }, `${activeViewLabel}`)
          ),
          h(FaChevronDown, { className: mergeClasses("h-3 w-3 transition-transform", viewsDropdownOpen && "rotate-180") })
        ),
        viewsDropdownElement
      )
    )
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

  const tableContent = h("div", { className: "relative overflow-auto rounded-xl border", ref: tableContainerRef, onScroll: handleScroll },
    header,
    body,
    columnResizeGuideLine,
    rowResizeGuideLine
  );

  const confirmModalElement = confirmAction ? h("div", {
    className: "fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-6",
    onClick: cancelDeletion,
    role: "alertdialog",
    "aria-modal": "true"
  },
    h("div", {
      className: "relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl dark:border-red-900/70 dark:bg-neutral-950",
      onClick: (ev: React.MouseEvent) => ev.stopPropagation()
    },
      h("h2", { className: "text-lg font-semibold text-red-600 dark:text-red-300" }, confirmAction.type === "deleteRows" ? "Delete rows?" : "Delete fields?"),
      (() => {
        if (confirmAction.type === "deleteRows") {
          const { count } = confirmAction.range;
          return h("p", { className: "mt-3 text-sm text-zinc-600 dark:text-neutral-300" },
            count === 1 ? "Are you sure you want to delete this row? This action cannot be undone."
              : `Are you sure you want to delete ${count} rows? This action cannot be undone.`
          );
        }
        const names = confirmAction.columns.map((col) => String(col?.name ?? "Untitled")).join(", ");
        return h("p", { className: "mt-3 text-sm text-zinc-600 dark:text-neutral-300" },
          confirmAction.columns.length === 1
            ? `Delete the field "${names}"? This will remove its values from all rows.`
            : `Delete ${confirmAction.columns.length} fields (${names})? This will remove their values from all rows.`
        );
      })(),
      h("div", { className: "mt-5 flex justify-end gap-2" },
        h("button", {
          type: "button",
          className: "rounded-full border px-4 py-1 text-sm",
          onClick: cancelDeletion
        }, "Cancel"),
        h("button", {
          type: "button",
          className: "rounded-full bg-red-600 px-4 py-1 text-sm font-semibold text-white hover:bg-red-700",
          onClick: confirmDeletion
        }, confirmAction.type === "deleteRows"
          ? (confirmAction.range.count === 1 ? "Delete row" : `Delete ${confirmAction.range.count} rows`)
          : (confirmAction.columns.length === 1 ? "Delete field" : `Delete ${confirmAction.columns.length} fields`))
      )
    )
  ) : null;

  const activeModalRow = detailsModal ? rows[detailsModal.rowIndex] : null;
  const modalTitle = detailsModal && activeModalRow
    ? String((activeModalRow as any)?.title ?? `Row ${detailsModal.rowIndex + 1}`)
    : "";
  const modalDetailsContent = detailsModal && renderDetails && activeModalRow
    ? renderDetails(activeModalRow as T, detailsModal.rowIndex)
    : detailsModal
      ? h("div", null, "No details renderer provided.")
      : null;

  const detailsModalElement = detailsModal && activeModalRow ? h("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6",
    onClick: () => setDetailsModal(null),
    role: "dialog",
    "aria-modal": "true"
  },
    h("div", {
      className: "relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-blue-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950",
      onClick: (ev: React.MouseEvent) => ev.stopPropagation()
    },
      h("div", { className: "mb-4 flex items-center justify-between gap-2" },
        h("h2", { className: "text-lg font-semibold text-blue-600 dark:text-blue-300" }, `Details - ${modalTitle}`),
        h("button", {
          className: "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm hover:bg-blue-50 dark:bg-neutral-900 dark:hover:bg-neutral-800",
          onClick: () => setDetailsModal(null),
          title: "Close details",
          type: "button"
        }, "x")
      ),
      h("div", { className: "prose max-w-none text-sm dark:prose-invert" }, modalDetailsContent ?? h("div", null, "No details available."))
    )
  ) : null;

  /* Container */
  const mainContent = h("div",
    { className: mergeClasses(cx("container","rounded-2xl border p-2 bg-white dark:bg-neutral-950/80 flex-1")) },
    toolbar,
    searchBox,
    tableContent
  );

  return h("div",
    { className: "flex gap-4 items-start" },
    mainContent,
    headerContextMenu,
    confirmModalElement,
    cellContextMenu,
    detailsModalElement
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
  const left = ROW_NUMBER_COLUMN_WIDTH + sum(colW, 0, c0);
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

function lowerBound(arr: number[], value: number) {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function visibleRangeFromOffsets(offsets: number[], start: number, end: number) {
  const count = Math.max(0, offsets.length - 1);
  if (count === 0) return { start: 0, end: 0 };
  const total = offsets[count];
  const clampedStart = Math.max(0, Math.min(start, total));
  const clampedEnd = Math.max(clampedStart, Math.min(end, total));
  const startIndex = Math.max(0, Math.min(count - 1, lowerBound(offsets, clampedStart) - 1));
  let endIndex = lowerBound(offsets, clampedEnd);
  endIndex = Math.max(startIndex + 1, Math.min(count, endIndex + 1));
  return { start: startIndex, end: endIndex };
}

function uniqueColumnKey(cols: ColumnSpec[], base: string) {
  let i = 1;
  let k = base;
  const keys = new Set(cols.map((c) => String(c.key)));
  while (keys.has(k)) { i += 1; k = `${base}_${i}`; }
  return k;
}









