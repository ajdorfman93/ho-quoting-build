"use client";

import InteractiveGridDemo from "./components/InteractiveGridDemo";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:px-10 lg:px-16">
        <header className="space-y-4">
          <div className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-neutral-700 dark:text-zinc-300">
            Advanced team intelligence
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Interactive talent table with master-detail insights
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Explore the full feature surface of our interactive grid: inline editing,
            column management, master-detail expansion, and spreadsheet-grade
            shortcuts—tailored for rich talent operations.
          </p>
        </header>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-950/80">
          <InteractiveGridDemo />
        </div>
      </section>
    </main>
  );
}
