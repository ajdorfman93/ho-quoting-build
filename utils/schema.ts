import { randomUUID } from "crypto";

export type TableMetadata = {
  table_name: string;
  display_name: string;
  source_file: string | null;
  created_at: string;
  updated_at: string;
};

export type ColumnTypeSettings = {
  table_name: string;
  column_name: string;
  column_type: string;
  settings: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type ColumnMetadata = {
  table_name: string;
  column_name: string;
  display_name: string;
  data_type: string;
  config: Record<string, unknown>;
  position: number;
  is_nullable: boolean;
  width: number;
  created_at?: string;
  updated_at?: string;
  type_settings?: ColumnTypeSettings | null;
};

const NON_ALPHANUMERIC = /[^a-z0-9]+/gi;
const LEADING_TRAILING_UNDERSCORE = /^_+|_+$/g;

export function toSlug(name: string, prefix = "tbl"): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "_")
    .replace(LEADING_TRAILING_UNDERSCORE, "");

  if (!normalized) {
    const fallback = randomUUID().replace(/-/g, "");
    return `${prefix}_${fallback}`;
  }

  return /^[a-z_]/.test(normalized) ? normalized : `${prefix}_${normalized}`;
}

export function toColumnKey(name: string, existing: Set<string>): string {
  const slug = toSlug(name, "col").replace(/^col_/, "");
  const base = slug ? `col_${slug}` : `col_${randomUUID().slice(0, 8)}`;

  if (!existing.has(base)) {
    return base;
  }

  let index = 2;
  let candidate = `${base}_${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }
  return candidate;
}

export function orderColumnsByInput<T>(
  originalOrder: string[],
  columns: Record<string, T>
): Array<[string, T]> {
  const ordered: Array<[string, T]> = [];
  const remaining = new Set(Object.keys(columns));

  for (const rawName of originalOrder) {
    const slug = toSlug(rawName, "col");
    if (remaining.has(slug)) {
      ordered.push([slug, columns[slug]]);
      remaining.delete(slug);
    }
  }

  for (const key of remaining) {
    ordered.push([key, columns[key]]);
  }

  return ordered;
}
