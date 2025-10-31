# Performance Runbook — Data-Heavy React App

A phased, do-this-next guide to speed up slow pages that handle fast-moving or massive datasets.

---

## Table of Contents

* [Phase 0 — Baseline & Guardrails](#phase-0--baseline--guardrails)
* [Phase 1 — Buffer & Throttle Data Flow](#phase-1--buffer--throttle-data-flow)
* [Phase 2 — Virtualize or Paginate Large Views](#phase-2--virtualize-or-paginate-large-views)
* [Phase 3 — Fit Data Structures to Access Patterns](#phase-3--fit-data-structures-to-access-patterns)
* [Phase 4 — Leverage React (then Limit It)](#phase-4--leverage-react-then-limit-it)
* [Phase 5 — Break Out of React for Hotspots](#phase-5--break-out-of-react-for-hotspots)
* [Phase 6 — Selective Immutable Heavy Data](#phase-6--selective-immutable-heavy-data)
* [Phase 7 — State & Cache Management](#phase-7--state--cache-management)
* [Phase 8 — Cleanup, Tests, Regression Gates](#phase-8--cleanup-tests-regression-gates)
* [Implementation Checklist](#implementation-checklist)
* [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Phase 0 - Baseline & Guardrails

**Goal:** Know precisely what's slow and lock in targets.

* [x] **Measure**: TTI, CPU per commit, JS heap growth, FPS during data spikes. -> Baseline captured via npm run perf:baseline (perf/baseline/latest.json, 2025-10-31).
* [x] **Serve assets correctly**: minify, gzip/brotli, long-term cache headers. Configured in next.config.ts (compression, immutable static caching, API no-store).
  *Note*: Beyond a stable vendor chunk split, code-splitting isn't the main win--proper serving & caching are.
* [x] **Set SLAs**: Documented alongside the baseline snapshot in perf/baseline/README.md.

  * Idle >= **55 FPS**
  * Under load >= **30 FPS**
  * GC pause <= **100 ms**
  * TTI <= **3 s**

---

## Phase 1 — Buffer & Throttle Data Flow

**Goal:** Show smooth, human-rate updates (not the firehose).

* [ ] **Batch & flush** at 10–20 Hz (start at 50–100 ms).
* [ ] **Backpressure-aware stream** (RxJS is great—use responsibly).

```ts
// Example: buffer → compact → throttle → apply
stream$
  .bufferTime(50)                         // batch ~20Hz
  .filter(batch => batch.length > 0)
  .map(compactAndDiff)                    // strip dupes, compute deltas
  .throttleTime(50, undefined, { trailing: true })
  .subscribe(applyBatch);
```

* [ ] **Hygiene**: no nested subscriptions, bounded concurrency, unsubscribe on unmount. Add leak tests.

---

## Phase 2 — Virtualize or Paginate Large Views

**Goal:** Render only what’s visible.

* [ ] Use a **virtualized grid** (Ag Grid, MUI DataGrid) for row+column virtualization.
* [ ] For lists: **react-window** / **react-virtualized**.
* [ ] Long static sections: `content-visibility: auto`.
* [ ] **Charts** with many points: prefer **Canvas/WebGL** renderers.

---

## Phase 3 — Fit Data Structures to Access Patterns

**Goal:** O(1) hot paths; cheap sorted views.

* [ ] Entities in `Map<string, Entity>`; membership via `Set<string>`.
* [ ] Keep **sorted/filtered views derived**, updated using O(n log n) insertions.
* [ ] Prefer plain objects unless class shapes prevent hidden-class churn. Use sets/maps when appropriate (don’t over-optimize—just be correct).

---

## Phase 4 — Leverage React (then Limit It)

**Goal:** Keep React snappy; avoid prop thrash.

* [ ] `React.memo` where props are stable & pure.
* [ ] Use **transitions** (`startTransition`) for non-urgent updates.
* [ ] Stabilize props: `useCallback`/`useMemo` for fns/arrays/objects.
* [ ] Cap React-driven updates to **tens per second**; beyond that, consider Phase 5.

---

## Phase 5 — Break Out of React for Hotspots

**Goal:** Bypass reconciliation where it’s the bottleneck.

* [ ] Use **Ag Grid with transaction updates** (imperative deltas) instead of pushing full `rowData`.
* [ ] Keep a **thin adapter**: React for config; imperative API for data ops.
* [ ] Document brittleness and add adapter integration tests.

---

## Phase 6 — Selective Immutable Heavy Data

**Goal:** Faster merges on huge datasets via structural sharing.

* [ ] Consider **Immutable.js** for **raw, top-level** heavy data (100k+ items).
* [ ] **Never** call `toJS()` / `toArray()` in render paths.
* [ ] Lists/derived views remain **plain arrays** for sort/filter/iterate.

---

## Phase 7 — State & Cache Management

**Goal:** Granular subscriptions + deduped server state.

* [ ] Introduce a **cache manager** (e.g., React Query) to dedupe fetches & normalize server state.
* [ ] Choose a **state manager** with fine-grained updates:

  * **Zedux** (preferred): granular subscriptions, memo control, good for heavy derivations.
  * **Jotai**: simple, similar architecture, ~2–3× slower than Zedux but still solid.
  * **Avoid** heavy pipelines on **Redux + Reselect** (selector limits under load).
* [ ] Partition state: server cache vs. client UI state; memoize derived views close to consumers.

---

## Phase 8 — Cleanup, Tests, Regression Gates

**Goal:** Keep the wins.

* [ ] **Perf tests** for burst inserts, rapid edits, scroll storms.
* [ ] **Leak checks**: ensure subscriptions/timeouts/observers are cleaned.
* [ ] **Regression gates** in CI: fail if metrics exceed thresholds (FPS, TTI, heap, GC).

---

## Implementation Checklist

* [ ] Asset pipeline: minify, gzip/brotli, caching headers; vendor chunk stable.
* [ ] Data streams buffered to 50–100 ms; no unbounded RxJS ops; leaks fixed.
* [ ] All large lists/grids **virtualized**; heavy charts on **Canvas/WebGL**.
* [ ] Hot paths use **Map/Set**; sorted/filtered views are **derived**.
* [ ] `React.memo` + **transitions**; prop stability via `useCallback`/`useMemo`.
* [ ] Critical grids updated via **imperative transactions** (not full re-renders).
* [ ] **Immutable** only for raw heavy data; no `toJS` in render.
* [ ] **React Query** (or similar) for server cache; **Zedux/Jotai** for granular UI state.
* [ ] Perf & leak tests in CI; thresholds enforced.

---

## Anti-Patterns to Avoid

* ❌ Chasing deep code-splits instead of fixing asset serving & caching.
* ❌ Unbounded RxJS pipelines (`mergeMap` without limits, no teardown).
* ❌ Thousands of React updates per second.
* ❌ Converting Immutable structures inside render paths.
* ❌ Global Redux selectors doing massive derivations each tick.

---

### Notes

* Code-splitting beyond stable vendor chunks yields diminishing returns compared to correct asset serving, minification, compression, and caching.
* Use the smallest tool that solves the problem; measure before and after every phase.
