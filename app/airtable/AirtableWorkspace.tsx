"use client";

import * as React from "react";
import InteractiveGridDemo from "../components/InteractiveGridDemo";
import projectTags from "@/config/projectTags.json";

export default function AirtableWorkspace() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050d20] via-[#0b182f] to-[#060b18] text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-10 lg:px-16">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live Neon workspace
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            Airtable workspace styling, Neon-backed data engine
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            This workspace keeps the Airtable-inspired chrome while delegating all grid behaviour to
            the shared Neon-connected table component. Column edits, field type changes, and row
            sync stay perfectly in step with the main app.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-6 rounded-2xl border border-slate-700/60 bg-[#0c172e]/80 p-5 shadow-[0_22px_60px_rgba(1,5,22,0.45)]">
            <nav className="space-y-3 text-sm text-slate-300">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Workspace
              </h2>
              <ul className="space-y-2">
                <li className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/40 px-3 py-2 text-slate-100">
                  <span>Data tables</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    Live
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-500">
                  <span>Automations</span>
                  <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
                </li>
                <li className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-500">
                  <span>Interfaces</span>
                  <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
                </li>
                <li className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-500">
                  <span>Forms</span>
                  <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
                </li>
              </ul>
            </nav>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 text-xs text-slate-400">
              All schema and record operations route through the same `/api/tables/*` suite backed by
              Neon. This panel is purely visual chrome--no divergent data paths.
            </div>
          </aside>
          <div className="rounded-3xl border border-slate-700/60 bg-[#0c172e]/80 p-6 shadow-[0_26px_70px_rgba(1,5,22,0.55)]">
            <InteractiveGridDemo
              projectTag={projectTags.airtable}
              tableSelectorVariant="tabs"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

