/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from "fs/promises";
import path from "path";
import { ColumnSpec, ColumnType, SelectOption } from "@/utils/tableUtils";
import type { TableMetadata } from "@/utils/schema";
import type { TableRow as TableServiceRow } from "./tableService";

type TableServiceModule = typeof import("./tableService");

let tableServiceModulePromise: Promise<TableServiceModule> | null = null;

async function loadTableServiceModule(): Promise<TableServiceModule | null> {
  if (tableServiceModulePromise) {
    try {
      return await tableServiceModulePromise;
    } catch {
      return null;
    }
  }
  tableServiceModulePromise = import("./tableService");
  try {
    return await tableServiceModulePromise;
  } catch {
    tableServiceModulePromise = null;
    return null;
  }
}

const DATA_DIR = path.join(process.cwd(), "airtable", "json");
const AUTOMATIONS_DIR = path.join(process.cwd(), "airtable", "js");

const RECORD_ID_REGEX = /^rec[0-9A-Za-z]{14}$/;
const PERCENT_REGEX = /%$/;
const SEPARATOR_REGEX = /[,;|]/;
const DATABASE_ROW_BATCH_SIZE = 500;

type GenericRow = Record<string, any>;

export interface FieldRelationship {
  fieldName: string;
  fieldKey: string;
  targetTable?: string;
  type: "link" | "lookup" | "computed";
  confidence: number;
  description: string;
}

export interface AirtableFieldMeta {
  originalName: string;
  key: string;
  type: ColumnType;
  config?: ColumnSpec<GenericRow>["config"];
  readOnly?: boolean;
  width?: number;
  sampleValues: string[];
  nonEmptyCount: number;
  emptyCount: number;
  uniqueValueCount: number;
  notes: string[];
  formattingRules: string[];
  relationship?: FieldRelationship;
  isPrimaryId?: boolean;
}

export interface AirtableTableDefinition {
  name: string;
  slug: string;
  fileName: string;
  viewName?: string | null;
  columns: ColumnSpec<GenericRow>[];
  rows: GenericRow[];
  fieldMeta: AirtableFieldMeta[];
  relationships: FieldRelationship[];
  summary: {
    rowCount: number;
    fieldCount: number;
    linkedFieldCount: number;
    selectFieldCount: number;
    lastAnalyzed: string;
    primaryIdField?: string;
  };
}

export interface AirtableAutomation {
  name: string;
  fileName: string;
  trigger?: string;
  description?: string;
  tablesInvolved: string[];
  actions: string[];
  rawComment?: string;
  scriptSummary: string;
}

export interface AirtableProject {
  tables: AirtableTableDefinition[];
  automations: AirtableAutomation[];
  lastGenerated: string;
}

const PROJECT_CACHE_TTL = 5 * 60 * 1000;

type ProjectCacheEntry = { project: AirtableProject; fetchedAt: number };

const projectCache = new Map<string, ProjectCacheEntry>();
const pendingProjects = new Map<string, Promise<AirtableProject>>();
let tableDefinitionIndex: Map<string, AirtableTableDefinition> | null = null;

function getProjectCacheKey(options?: { includeDatabaseTables?: boolean }) {
  return options?.includeDatabaseTables === false ? "files-only" : "with-database";
}

function updateTableDefinitionIndex(project: AirtableProject) {
  tableDefinitionIndex = new Map(
    project.tables.map((table) => [table.fileName.toLowerCase(), table])
  );
}

interface RawTable {
  name: string;
  slug: string;
  fileName: string;
  viewName?: string | null;
  records: GenericRow[];
}

interface FieldInferenceResult {
  meta: AirtableFieldMeta;
  column: ColumnSpec<GenericRow>;
}

const SELECT_COLORS = [
  "#0E7AFE",
  "#E83A3A",
  "#7A5BFF",
  "#FF8A00",
  "#00A985",
  "#C23FFF",
  "#FFB400",
  "#0081F2",
  "#F857A6",
  "#3ECF8E"
];

async function generateAirtableProject(options?: {
  includeDatabaseTables?: boolean;
}): Promise<AirtableProject> {
  const includeDatabaseTables = options?.includeDatabaseTables !== false;

  const [fileTables, databaseTables, automations] = await Promise.all([
    readRawTables(),
    includeDatabaseTables ? readDatabaseTables() : Promise.resolve<RawTable[]>([]),
    readAutomations()
  ]);

  const rawTables = mergeRawTables(fileTables, databaseTables);
  const recordIdIndex = buildRecordIdIndex(rawTables);
  const tables = rawTables.map((table) => buildTableDefinition(table, recordIdIndex));

  return {
    tables,
    automations,
    lastGenerated: new Date().toISOString()
  };
}

export async function loadAirtableProject(options?: {
  force?: boolean;
  includeDatabaseTables?: boolean;
}): Promise<AirtableProject> {
  const cacheKey = getProjectCacheKey(options);
  const now = Date.now();

  if (!options?.force) {
    const cached = projectCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < PROJECT_CACHE_TTL) {
      return cached.project;
    }
    const pending = pendingProjects.get(cacheKey);
    if (pending) {
      return pending;
    }
  } else {
    projectCache.delete(cacheKey);
    pendingProjects.delete(cacheKey);
  }

  const loader = generateAirtableProject({
    includeDatabaseTables: options?.includeDatabaseTables,
  })
    .then((project) => {
      projectCache.set(cacheKey, { project, fetchedAt: Date.now() });
      updateTableDefinitionIndex(project);
      pendingProjects.delete(cacheKey);
      return project;
    })
    .catch((error) => {
      pendingProjects.delete(cacheKey);
      throw error;
    });

  if (!options?.force) {
    pendingProjects.set(cacheKey, loader);
  }

  return loader;
}

export async function findAirtableTableBySource(sourceFile: string): Promise<AirtableTableDefinition | null> {
  const baseName = path.basename(sourceFile).toLowerCase();

  if (!tableDefinitionIndex) {
    await loadAirtableProject({ includeDatabaseTables: false });
  }

  const cachedMatch = tableDefinitionIndex?.get(baseName);
  if (cachedMatch) return cachedMatch;

  const project = await loadAirtableProject({
    force: true,
    includeDatabaseTables: false,
  });
  updateTableDefinitionIndex(project);
  return tableDefinitionIndex?.get(baseName) ?? null;
}

async function readRawTables(): Promise<RawTable[]> {
  const entries = await safeReadDir(DATA_DIR);
  const jsonFiles = entries.filter((name) => name.toLowerCase().endsWith(".json")).sort();
  const tables: RawTable[] = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(DATA_DIR, fileName);
    const content = await fs.readFile(filePath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const { tableName, viewName } = parseTableAndView(fileName);
    tables.push({
      name: tableName,
      slug: slugify(tableName),
      fileName,
      viewName,
      records: parsed as GenericRow[]
    });
  }

  return tables;
}

async function readDatabaseTables(): Promise<RawTable[]> {
  const tableService = await loadTableServiceModule();
  if (!tableService) return [];

  let metadata: TableMetadata[] = [];
  try {
    metadata = await tableService.listTables();
  } catch {
    return [];
  }

  const tables: RawTable[] = [];
  for (const entry of metadata) {
    const table = await buildRawTableFromDatabase(entry, tableService.getTableData);
    if (table) tables.push(table);
  }
  return tables;
}

function mergeRawTables(fileTables: RawTable[], databaseTables: RawTable[]): RawTable[] {
  const combined = new Map<string, RawTable>();
  for (const table of fileTables) {
    combined.set(table.slug, table);
  }
  for (const table of databaseTables) {
    combined.set(table.slug, table);
  }
  return Array.from(combined.values());
}

async function buildRawTableFromDatabase(
  entry: TableMetadata,
  getTableDataFn: TableServiceModule["getTableData"]
): Promise<RawTable | null> {
  const tableName = entry.table_name;
  if (!tableName) return null;

  let offset = 0;
  let totalRows = 0;
  let columns: ColumnSpec<TableServiceRow>[] | null = null;
  const records: GenericRow[] = [];

  try {
    do {
      const {
        columns: chunkColumns,
        rows,
        totalRows: reportedTotal
      } = await getTableDataFn(tableName, {
        limit: DATABASE_ROW_BATCH_SIZE,
        offset
      });

      if (!columns || !columns.length) {
        columns = chunkColumns;
      }

      const columnsToUse = columns ?? chunkColumns;
      if (!columnsToUse || !columnsToUse.length) {
        totalRows = reportedTotal;
        break;
      }

      for (const row of rows) {
        const record: GenericRow = {};
        for (const column of columnsToUse) {
          const key = String(column.key);
          const label = typeof column.name === "string" ? column.name : String(column.name);
          record[label] = (row as Record<string, unknown>)[key];
        }
        records.push(record);
      }

      offset += rows.length;
      totalRows = reportedTotal;
    } while (offset < totalRows);
  } catch {
    return null;
  }

  const sourceFile = entry.source_file ? path.basename(entry.source_file) : `${entry.display_name}.json`;
  const { tableName: parsedName, viewName } = parseTableAndView(sourceFile);

  return {
    name: parsedName,
    slug: slugify(parsedName),
    fileName: sourceFile,
    viewName,
    records
  };
}

function parseTableAndView(fileName: string): { tableName: string; viewName: string | null } {
  const base = fileName.replace(/\.json$/i, "");
  const parts = base.split("-");
  if (parts.length >= 2 && parts[parts.length - 1].toLowerCase().includes("view")) {
    const viewName = titleCase(parts.pop() ?? "");
    const tableName = titleCase(parts.join(" "));
    return { tableName, viewName };
  }
  return {
    tableName: titleCase(base.replace(/[_-]+/g, " ")),
    viewName: null
  };
}

async function readAutomations(): Promise<AirtableAutomation[]> {
  const entries = await safeReadDir(AUTOMATIONS_DIR);
  const jsFiles = entries.filter((name) => name.toLowerCase().endsWith(".js")).sort();
  const automations: AirtableAutomation[] = [];

  for (const fileName of jsFiles) {
    const filePath = path.join(AUTOMATIONS_DIR, fileName);
    const content = await fs.readFile(filePath, "utf-8");
    automations.push(parseAutomationFile(fileName, content));
  }

  return automations;
}

function parseAutomationFile(fileName: string, content: string): AirtableAutomation {
  const displayName = titleCase(fileName.replace(/\.js$/i, "").replace(/[_-]+/g, " "));
  const commentLines: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("//")) {
      if (commentLines.length === 0 && trimmed.length === 0) continue;
      break;
    }
    commentLines.push(trimmed.replace(/^\/\/\s?/, ""));
  }
  const rawComment = commentLines.join("\n").trim() || undefined;
  const triggerLine = commentLines.find((line) => line.toLowerCase().includes("trigger"));
  const actionLines = commentLines.filter((line) => line.toLowerCase().includes("action") || line.toLowerCase().includes("update") || line.toLowerCase().includes("create"));

  const tablesInvolved = Array.from(
    new Set(
      [...content.matchAll(/base\.getTable\(\s*["'`](.+?)["'`]\s*\)/g)].map((match) => match[1])
    )
  );

  const scriptSummary = buildScriptSummary(content);

  return {
    name: displayName,
    fileName,
    trigger: triggerLine,
    description: rawComment,
    tablesInvolved,
    actions: actionLines,
    rawComment,
    scriptSummary
  };
}

function buildScriptSummary(content: string): string {
  const actions: string[] = [];
  if (content.includes("createRecordAsync")) actions.push("creates linked records");
  if (content.includes("updateRecordAsync")) actions.push("updates related records");
  if (content.includes("deleteRecordAsync")) actions.push("removes records");
  if (content.includes("selectRecordsAsync")) actions.push("reads source tables");
  if (content.includes("filter(") || content.includes(".filter(")) actions.push("filters collections");
  if (content.includes("for (") || content.includes(".forEach(")) actions.push("iterates across match sets");
  if (content.includes("await")) actions.push("runs asynchronous Airtable API calls");

  return actions.length ? `Script ${actions.join(", ").replace(/, ([^,]*)$/, ", and $1")}.` : "Script reads and processes Airtable tables.";
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function buildRecordIdIndex(tables: RawTable[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const table of tables) {
    for (const record of table.records) {
      for (const value of Object.values(record)) {
        if (typeof value === "string" && RECORD_ID_REGEX.test(value)) {
          if (!index.has(value)) index.set(value, table.name);
        }
      }
    }
  }
  return index;
}

function buildTableDefinition(table: RawTable, recordIdIndex: Map<string, string>): AirtableTableDefinition {
  const fieldOrder = inferFieldOrder(table.records);
  const keyRegistry = new Set<string>();

  const primaryIdField = detectPrimaryIdField(table, recordIdIndex);

  const fieldResults = fieldOrder.map((fieldName) =>
    inferField({
      fieldName,
      records: table.records,
      recordIdIndex,
      keyRegistry,
      isPrimaryId: primaryIdField === fieldName
    })
  );

  const columns = fieldResults.map((result) => result.column);
  const fieldMeta = fieldResults.map((result) => result.meta);

  const rows = table.records.map((record, idx) => {
    const row: GenericRow = {};
    row.id = resolveRowId(record, table.slug, idx, primaryIdField);
    for (const { meta } of fieldResults) {
      row[meta.key] = normalizeCellValue(record[meta.originalName], meta);
    }
    return row;
  });

  const relationships = fieldMeta
    .map((meta) => meta.relationship)
    .filter((rel): rel is FieldRelationship => Boolean(rel));

  return {
    name: table.name,
    slug: table.slug,
    fileName: table.fileName,
    viewName: table.viewName,
    columns,
    rows,
    fieldMeta,
    relationships,
    summary: {
      rowCount: rows.length,
      fieldCount: columns.length,
      linkedFieldCount: relationships.length,
      selectFieldCount: fieldMeta.filter((meta) => meta.type === "singleSelect" || meta.type === "multipleSelect").length,
      lastAnalyzed: new Date().toISOString(),
      primaryIdField: primaryIdField ?? undefined
    }
  };
}

function inferFieldOrder(records: GenericRow[]): string[] {
  const order = new Map<string, number>();
  records.slice(0, 50).forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!order.has(key)) order.set(key, order.size);
    });
  });
  return [...order.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key);
}

function detectPrimaryIdField(table: RawTable, recordIdIndex: Map<string, string>): string | null {
  const candidateScores = new Map<string, number>();
  for (const record of table.records) {
    for (const [field, value] of Object.entries(record)) {
      if (typeof value === "string" && RECORD_ID_REGEX.test(value)) {
        const score = candidateScores.get(field) ?? 0;
        candidateScores.set(field, score + 1);
        if (!recordIdIndex.has(value)) recordIdIndex.set(value, table.name);
      } else if (typeof value === "string" && field.toLowerCase().includes("record id")) {
        const score = candidateScores.get(field) ?? 0;
        candidateScores.set(field, score + 0.5);
      }
    }
  }

  let bestField: string | null = null;
  let bestScore = 0;
  const threshold = Math.max(1, Math.floor(table.records.length * 0.6));
  for (const [field, score] of candidateScores) {
    if (score >= threshold && score >= bestScore) {
      bestScore = score;
      bestField = field;
    }
  }
  return bestField;
}

function inferField(params: {
  fieldName: string;
  records: GenericRow[];
  recordIdIndex: Map<string, string>;
  keyRegistry: Set<string>;
  isPrimaryId: boolean;
}): FieldInferenceResult {
  const { fieldName, records, recordIdIndex, keyRegistry, isPrimaryId } = params;
  const values = records.map((record) => record[fieldName]).filter((value) => value !== null && value !== undefined && value !== "");
  const stringValues = values
    .map((value) => (typeof value === "string" ? value.trim() : String(value)))
    .filter((value) => value.length > 0);

  const nonEmptyCount = values.length;
  const emptyCount = records.length - nonEmptyCount;
  const uniqueStrings = new Set(stringValues.map((value) => normalizeWhitespace(value)));
  const uniqueValueCount = uniqueStrings.size;
  const sampleValues = stringValues.slice(0, 5);
  const avgLength =
    stringValues.reduce((sum, value) => sum + value.length, 0) / Math.max(1, stringValues.length);

  const lowerField = fieldName.toLowerCase();
  const notes: string[] = [];
  const formattingRules: string[] = [];

  let type: ColumnType = "singleLineText";
  let readOnly = false;
  let config: ColumnSpec<GenericRow>["config"] | undefined;
  let width = 180;
  let relationship: FieldRelationship | undefined;

  const selectOptions: SelectOption[] = [];

  const boolMappings = stringValues.map((value) => evaluateBoolean(value)).filter((value) => value !== null);
  const percentMatches = stringValues.filter((value) => PERCENT_REGEX.test(value) || lowerField.includes("percent") || lowerField.includes("%") || lowerField.includes("markup"));
  const currencyMatches = stringValues.filter((value) => /^\s*[$€£]/.test(value) || lowerField.includes("price") || lowerField.includes("cost") || lowerField.includes("amount") || lowerField.includes("total"));

  const numericParsed = stringValues.map((value) => parseNumber(value)).filter((value) => Number.isFinite(value));
  const numericRatio = stringValues.length ? numericParsed.length / stringValues.length : 0;

  const linkCandidates = stringValues.filter((value) => RECORD_ID_REGEX.test(value));
  const linkRatio = stringValues.length ? linkCandidates.length / stringValues.length : 0;

  const multiValueSplits = stringValues.map((value) => splitMultiValue(value)).filter((parts) => parts.length > 1);

  if (nonEmptyCount === 0) {
    type = "singleLineText";
    notes.push("No sample data detected; defaulting to single line text.");
  } else if (boolMappings.length === stringValues.length) {
    type = "checkbox";
    width = 110;
    notes.push("All values map cleanly to boolean semantics.");
  } else if (linkRatio >= 0.6 || (linkCandidates.length && lowerField.includes("record"))) {
    type = "linkToRecord";
    readOnly = true;
    width = 220;
    const targetTable = detectLinkTarget(linkCandidates, recordIdIndex);
    relationship = {
      fieldName,
      fieldKey: "",
      targetTable,
      type: "link",
      confidence: linkRatio,
      description: targetTable
        ? `Values match Airtable record IDs from the ${targetTable} table.`
        : "Values match Airtable record ID format."
    };
    notes.push("Detected Airtable record IDs; treated as linked record field.");
  } else if (detectDateConfidence(stringValues) > 0.6 || lowerField.includes("date")) {
    type = "date";
    width = 180;
    notes.push("Values parse as dates.");
  } else if (stringValues.every((value) => value.includes("@")) || lowerField.includes("email")) {
    type = "email";
    width = 220;
    notes.push("All values contain '@'; treated as email field.");
  } else if (stringValues.every((value) => /\d/.test(value) && value.length >= 7 && /^[\d\s().+-]+$/.test(value)) || lowerField.includes("phone")) {
    type = "phone";
    width = 170;
    notes.push("Detected phone number patterns.");
  } else if (stringValues.every((value) => value.includes("http://") || value.includes("https://")) || lowerField.includes("url")) {
    type = "url";
    width = 240;
    formattingRules.push("Ensure values include protocol (https://).");
  } else if (percentMatches.length >= Math.max(1, Math.floor(stringValues.length * 0.6))) {
    type = "percent";
    width = 140;
    config = { percent: { decimals: detectDecimalPlaces(stringValues) } };
    formattingRules.push("Store percent values as whole numbers (e.g., 45 for 45%).");
    notes.push("Percent indicators detected in values or field name.");
  } else if (currencyMatches.length >= Math.max(1, Math.floor(stringValues.length * 0.6))) {
    type = "currency";
    width = 160;
    config = { currency: { currency: "USD", decimals: detectDecimalPlaces(stringValues) } };
    formattingRules.push("Currency formatted as USD by default.");
    notes.push("Currency symbols or price naming detected.");
  } else if (numericRatio >= 0.8) {
    type = "number";
    width = 140;
    config = { number: { decimals: detectDecimalPlaces(stringValues) } };
    notes.push("Majority of values parse cleanly as numbers.");
  } else if (multiValueSplits.length && averageSplitCount(multiValueSplits) > 1.2) {
    type = "multipleSelect";
    width = 220;
    const flatOptions = multiValueSplits.flat().map((value) => sanitizeOptionValue(value));
    const uniqueOptions = Array.from(new Set(flatOptions)).slice(0, 60);
    selectOptions.push(...uniqueOptions.map((label, idx) => createSelectOption(label, idx)));
    config = { multipleSelect: { options: selectOptions } };
    formattingRules.push("Values normalized from comma or delimiter separated text.");
    notes.push("Detected multi-value entries; modeled as multiple select.");
  } else if (uniqueValueCount > 1 && uniqueValueCount <= 15 && avgLength < 45) {
    type = "singleSelect";
    width = 200;
    const options = Array.from(uniqueStrings)
      .slice(0, 60)
      .map((label, idx) => createSelectOption(label, idx));
    selectOptions.push(...options);
    config = { singleSelect: { options } };
    notes.push("Limited discrete value set detected; treated as single select.");
  } else if (avgLength > 120 || lowerField.includes("description") || lowerField.includes("notes") || lowerField.includes("comment")) {
    type = "longText";
    width = 320;
    notes.push("Average text length suggests long text field.");
  }

  if (!config && (type === "singleSelect" || type === "multipleSelect")) {
    const options = Array.from(uniqueStrings)
      .slice(0, 60)
      .map((label, idx) => createSelectOption(label, idx));
    if (type === "singleSelect") config = { singleSelect: { options } };
    if (type === "multipleSelect") config = { multipleSelect: { options } };
  }

  if (relationship) {
    relationship.fieldKey = createFieldKey(fieldName, keyRegistry);
  }

  if (!relationship && (lowerField.includes("composite key") || lowerField.includes("auto number") || lowerField.includes("calculation"))) {
    relationship = {
      fieldName,
      fieldKey: createFieldKey(fieldName, keyRegistry),
      type: "computed",
      confidence: 0.5,
      description: "Field likely generated via Airtable formula or automation."
    };
    readOnly = true;
    type = type === "singleLineText" ? "formula" : type;
    notes.push("Field name suggests computed value.");
  }

  if (isPrimaryId) {
    notes.push("Designated as primary record identifier.");
    readOnly = true;
  }

  const key = relationship?.fieldKey ?? createFieldKey(fieldName, keyRegistry);

  const meta: AirtableFieldMeta = {
    originalName: fieldName,
    key,
    type,
    config,
    readOnly,
    width,
    sampleValues,
    nonEmptyCount,
    emptyCount,
    uniqueValueCount,
    notes,
    formattingRules,
    relationship,
    isPrimaryId
  };

  const column: ColumnSpec<GenericRow> = {
    key,
    name: fieldName,
    type,
    config,
    width,
    readOnly
  };

  return { meta, column };
}

function normalizeCellValue(value: unknown, meta: AirtableFieldMeta): unknown {
  if (value === null || value === undefined) return "";

  switch (meta.type) {
    case "checkbox": {
      const evaluated = typeof value === "boolean" ? value : evaluateBoolean(String(value));
      if (evaluated !== null) return evaluated;
      if (typeof value === "number") return value !== 0;
      return false;
    }
    case "percent": {
      if (typeof value === "number") return value;
      const numeric = parseNumber(String(value).replace(PERCENT_REGEX, ""));
      return Number.isFinite(numeric) ? numeric : 0;
    }
    case "number":
    case "currency": {
      if (typeof value === "number") return value;
      const numeric = parseNumber(String(value));
      return Number.isFinite(numeric) ? numeric : value;
    }
    case "date": {
      if (typeof value === "string") {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
      }
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }
    case "multipleSelect": {
      if (Array.isArray(value)) {
        return value.map((entry, idx) => {
          const label = String(entry).trim();
          return findSelectOption(label, meta.config?.multipleSelect?.options) ?? createSelectOption(label, idx);
        });
      }
      const parts = splitMultiValue(String(value));
      return parts.map((entry, idx) => {
        const label = entry.trim();
        return findSelectOption(label, meta.config?.multipleSelect?.options) ?? createSelectOption(label, idx);
      });
    }
    case "singleSelect": {
      if (typeof value === "object" && value !== null && "label" in (value as any)) {
        return value;
      }
      const label = String(value).trim();
      if (!label) return null;
      return findSelectOption(label, meta.config?.singleSelect?.options) ?? createSelectOption(label, 0);
    }
    default:
      return value;
  }
}

function splitMultiValue(value: string): string[] {
  if (!value) return [];
  let normalized = value.trim();
  normalized = normalized.replace(/^"+|"+$/g, "");
  normalized = normalized.replace(/""/g, '"');
  if (normalized.includes("\",\"")) {
    return normalized
      .split(/"\s*,\s*"/)
      .map((part) => part.replace(/^"+|"+$/g, "").trim())
      .filter(Boolean);
  }
  if (normalized.includes("\n")) {
    return normalized
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return normalized
    .split(SEPARATOR_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveRowId(record: GenericRow, slug: string, index: number, primaryField: string | null): string {
  if (primaryField && typeof record[primaryField] === "string" && record[primaryField]) {
    return String(record[primaryField]);
  }
  for (const value of Object.values(record)) {
    if (typeof value === "string" && RECORD_ID_REGEX.test(value)) return value;
  }
  return `${slug}-${index + 1}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function evaluateBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1", "checked", "show"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "unchecked", "hide"].includes(normalized)) return false;
  return null;
}

function parseNumber(value: string): number {
  const sanitized = value.replace(/[^0-9.\-]/g, "");
  if (!sanitized) return NaN;
  const numeric = Number.parseFloat(sanitized);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function detectLinkTarget(values: string[], index: Map<string, string>): string | undefined {
  const tally = new Map<string, number>();
  for (const value of values) {
    const table = index.get(value);
    if (table) tally.set(table, (tally.get(table) ?? 0) + 1);
  }
  let top: string | undefined;
  let best = 0;
  for (const [tableName, score] of tally) {
    if (score > best) {
      best = score;
      top = tableName;
    }
  }
  return top;
}

function detectDecimalPlaces(values: string[]): number {
  const decimals = values
    .map((value) => {
      const match = value.match(/\.([0-9]+)/);
      return match ? match[1].length : 0;
    })
    .filter((count) => count > 0);
  if (!decimals.length) return 0;
  return Math.max(0, Math.min(4, Math.max(...decimals)));
}

function detectDateConfidence(values: string[]): number {
  if (!values.length) return 0;
  const valid = values.filter((value) => Number.isFinite(Date.parse(value))).length;
  return valid / values.length;
}

function averageSplitCount(collection: string[][]): number {
  if (!collection.length) return 0;
  const total = collection.reduce((sum, parts) => sum + parts.length, 0);
  return total / collection.length;
}

function createFieldKey(fieldName: string, registry: Set<string>): string {
  let candidate = fieldName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (!candidate) candidate = "field";
  candidate = candidate.replace(/^_+|_+$/g, "");
  if (/^\d/.test(candidate)) candidate = `f_${candidate}`;
  let key = candidate;
  let suffix = 1;
  while (registry.has(key) || !key) {
    key = `${candidate || "field"}_${suffix}`;
    suffix += 1;
  }
  registry.add(key);
  return key;
}

function createSelectOption(label: string, index: number): SelectOption {
  const trimmed = label.trim();
  const id = trimmed || `option_${index}`;
  const color = SELECT_COLORS[index % SELECT_COLORS.length];
  return { id, label: trimmed || id, color };
}

function sanitizeOptionValue(value: string): string {
  return value.replace(/^"+|"+$/g, "").trim();
}

function findSelectOption(label: string, options: SelectOption[] | undefined) {
  if (!options || !label) return undefined;
  const lower = label.toLowerCase();
  return options.find(
    (option) =>
      option.label.toLowerCase() === lower ||
      (option.id && option.id.toLowerCase() === lower)
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
