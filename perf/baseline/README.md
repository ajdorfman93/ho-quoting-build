# Performance Baselines

This directory stores automated performance captures produced by `npm run perf:baseline`.

- `latest.json` mirrors the most recent capture.
- Historical captures are stored as `baseline-YYYYMMDD-HHMMSS.json`.

## Current Targets

- Idle FPS >= 55; synthetic load FPS >= 30.
- Time to Interactive <= 3000 ms for `/` and `/airtable`.
- Total Blocking Time <= 150 ms; Largest Contentful Paint <= 3000 ms.
- No sustained JS heap growth (>5 MB) after 2 s idle.

These limit lines codify the Phase 0 SLAs from `runbook.md`.

## 2025-10-31 Baseline Snapshot

| Route | TTI (ms) | TBT (ms) | LCP (ms) | Idle FPS | Synthetic FPS | Heap Delta (bytes) | Perf Score |
| ----- | -------: | -------: | -------: | -------: | ------------: | -------------: | ---------: |
| `/` | 2995 | 124 | 2865 | 60.7 | 34.0 | 0 | 0.94 |
| `/airtable` | 2998 | 128 | 2862 | 60.7 | 34.0 | -149,528 | 0.85 |

**Notes**

- Synthetic FPS uses an intentional 30 ms CPU spike per frame to emulate fast data churn. It provides a stable comparison across runs, not a real-world workload.
- Chrome's `Performance.getMetrics` `Frames` counter remains low because the table view spends most of the sample window in steady state. Use the FPS probes above instead.
- `latest.json` includes the full Lighthouse reports and runtime metrics for downstream analysis or regression gates.
