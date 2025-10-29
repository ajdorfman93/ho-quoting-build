"use client";

import * as React from "react";
import { renderInteractiveTable, type ColumnSpec } from "@/utils/tableUtils"; // <-- update path if needed

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

export default function InteractiveGridDemo() {
  const [state, setState] = React.useState<{
    rows: Row[];
    columns: ColumnSpec<Row>[];
  }>(() => ({
    rows: [
      { id: "1", title: "Design pass", status: { id: "in_progress", label: "In Progress" }, assignee: "user_1", start: "2025-10-01", budget: 125000, progress: 45, priority: 3, done: false },
      { id: "2", title: "QA cycle",    status: { id: "backlog",     label: "Backlog"     }, assignee: "user_2", start: "2025-10-05", budget: 30000,  progress: 15, priority: 2, done: false },
    ],
    columns: [
      { key: "title", name: "Title", type: "singleLineText", width: 220 },
      { key: "status", name: "Status", type: "singleSelect", width: 160, config: { singleSelect: { options: [{ id: "backlog", label: "Backlog" }, { id: "in_progress", label: "In Progress" }, { id: "done", label: "Done" }] } } },
      { key: "assignee", name: "Assignee", type: "user", width: 160 },
      { key: "start", name: "Start Date", type: "date", width: 140 },
      { key: "budget", name: "Budget", type: "currency", width: 140, config: { currency: { currency: "USD" } } },
      { key: "progress", name: "Progress %", type: "percent", width: 120, config: { percent: { decimals: 0 } } },
      { key: "priority", name: "Priority", type: "rating", width: 140, config: { rating: { max: 5, icon: "star" } } },
      { key: "done", name: "Done?", type: "checkbox", width: 110 },
      { key: "dailyBudget", name: "Budget / Day", type: "formula", width: 160, formula: (row) => Math.round((row as Row).budget / 30), readOnly: true },
    ] as ColumnSpec<Row>[],
  }));

  return renderInteractiveTable<Row>({
    rows: state.rows,
    columns: state.columns,
    onChange: setState,
    users: [
      { id: "user_1", name: "Alec Dorfman" },
      { id: "user_2", name: "Sam Chen" },
    ],
    renderDetails: (row) => <div>Extra details for <b>{(row as Row).title}</b></div>,
  });
}
