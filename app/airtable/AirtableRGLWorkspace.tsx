"use client";

import * as React from "react";
import InteractiveGridDemo from "../components/InteractiveGridDemo";
import projectTags from "@/config/projectTags.json";
import { renderBasicReactGridTable } from "@/utils/reactGridTable";

export default function AirtableRGLWorkspace() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070d26] via-[#0f1a3a] to-[#070c1d] text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-10 lg:px-16">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Experimental grid surface
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            React Grid Layout prototype for Airtable-tagged tables
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            This view renders the Neon-backed data set with a fresh table shell powered by{" "}
            <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-emerald-300">react-grid-layout</code>.
            Drag headers to reorder columns, drag row numbers to reorder rows, and use the resize handles to adjust
            dimensions. The original table util remains untouched for easy side-by-side testing.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-6 rounded-2xl border border-slate-700/60 bg-[#0c172e]/80 p-5 shadow-[0_22px_60px_rgba(1,5,22,0.45)]">
            <nav className="space-y-3 text-sm text-slate-300">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Prototype Workspace
              </h2>
              <ul className="space-y-2">
                <li className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                  <span>Grid layout demo</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Preview
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-500">
                  <span>Automations</span>
                  <span className="text-[10px] uppercase tracking-wide">Compatible</span>
                </li>
                <li className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-500">
                  <span>Legacy grid</span>
                  <span className="text-[10px] uppercase tracking-wide">/airtable</span>
                </li>
              </ul>
            </nav>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 text-xs text-slate-400">
              Need feature parity? Use the reference map exported from <code>utils/reactGridTable.tsx</code> to locate
              the corresponding logic inside <code>utils/tableUtils.ts</code>. The two surfaces hit the same
              Neon-backed APIs so you can copy features incrementally.
            </div>
          </aside>
          <div className="rounded-3xl border border-slate-700/60 bg-[#0c172e]/80 p-6 shadow-[0_26px_70px_rgba(1,5,22,0.55)]">
            <InteractiveGridDemo
              projectTag={projectTags.airtable}
              tableSelectorVariant="tabs"
              renderTable={renderBasicReactGridTable}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

