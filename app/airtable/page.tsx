import InteractiveGridDemo from "../components/InteractiveGridDemo";

export const dynamic = "force-dynamic";

export default function AirtablePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050d20] via-[#0b182f] to-[#060b18] text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-10 lg:px-16">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live Neon workspace
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            Edit every Neon table with Airtable-inspired ergonomics
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            The Airtable workspace route now points directly at the Neon database. Switch tables,
            adjust schemas, and sync records�?"all through the same interactive grid that powers the
            main experience.
          </p>
        </header>
        <div className="rounded-3xl border border-slate-700/60 bg-[#0c172e]/80 p-6 shadow-[0_26px_70px_rgba(1,5,22,0.55)]">
          <InteractiveGridDemo />
        </div>
      </section>
    </main>
  );
}
