"use client";

import * as React from "react";
import {
  renderInteractiveTable,
  type ColumnSpec,
  type InteractiveTableProps,
} from "@/utils/tableUtils";

type Row = {
  id: string;
  title: string;
  status: { id: string; label: string } | null;
  assignee: string | null;
  start: string | null;
  budget: number;
  progress: number;
  priority: number;
  done: boolean;
};

export interface InteractiveGridState<T extends Record<string, unknown>> {
  rows: T[];
  columns: ColumnSpec<T>[];
}

export interface InteractiveGridProps<T extends Record<string, unknown>> {
  initialRows: T[];
  initialColumns: ColumnSpec<T>[];
  users?: Array<{ id: string; name: string; email?: string; avatarUrl?: string }>;
  renderDetails?: (row: T, rowIndex: number) => React.ReactNode;
  classNames?: InteractiveTableProps<T>["classNames"];
  onStateChange?: (next: InteractiveGridState<T>) => void;
  hasMoreRows?: boolean;
  loadingMoreRows?: boolean;
  onLoadMoreRows?: () => void | Promise<void>;
  virtualizationOverscan?: number;
}

export function InteractiveGrid<T extends Record<string, unknown>>({
  initialRows,
  initialColumns,
  users,
  renderDetails,
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

export default function InteractiveGridDemo() {
  const initialRows: Row[] = [
    {
      id: "1",
      title: "Design pass",
      status: { id: "in_progress", label: "In Progress" },
      assignee: "user_1",
      start: "2025-10-01",
      budget: 125000,
      progress: 45,
      priority: 3,
      done: false,
    },
    {
      id: "2",
      title: "QA cycle",
      status: { id: "backlog", label: "Backlog" },
      assignee: "user_2",
      start: "2025-10-05",
      budget: 30000,
      progress: 15,
      priority: 2,
      done: false,
    },
  ];

  const initialColumns: ColumnSpec<Row>[] = [
    { key: "title", name: "Title", type: "singleLineText", width: 220 },
    {
      key: "status",
      name: "Status",
      type: "singleSelect",
      width: 160,
      config: {
        singleSelect: {
          options: [
            { id: "backlog", label: "Backlog" },
            { id: "in_progress", label: "In Progress" },
            { id: "done", label: "Done" },
          ],
        },
      },
    },
    { key: "assignee", name: "Assignee", type: "user", width: 160 },
    { key: "start", name: "Start Date", type: "date", width: 140 },
    {
      key: "budget",
      name: "Budget",
      type: "currency",
      width: 140,
      config: { currency: { currency: "USD" } },
    },
    {
      key: "progress",
      name: "Progress %",
      type: "percent",
      width: 120,
      config: { percent: { decimals: 0 } },
    },
    {
      key: "priority",
      name: "Priority",
      type: "rating",
      width: 140,
      config: { rating: { max: 5, icon: "star" } },
    },
    { key: "done", name: "Done?", type: "checkbox", width: 110 },
    {
      key: "dailyBudget",
      name: "Budget / Day",
      type: "formula",
      width: 160,
      formula: (row) => Math.round((row as Row).budget / 30),
      readOnly: true,
    },
  ];

  return (
    <InteractiveGrid<Row>
      initialRows={initialRows}
      initialColumns={initialColumns}
      users={[
        { id: "user_1", name: "Alec Dorfman" },
        { id: "user_2", name: "Sam Chen" },
      ]}
      renderDetails={(row) => (
        <div>
          Extra details for <b>{(row as Row).title}</b>
        </div>
      )}
    />
  );
}
