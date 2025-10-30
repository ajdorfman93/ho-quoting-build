export type LogNs = 'Resizing'|'Transforming'|'SurfaceColorDebug'|'DoorBuilder'|'Refactor';

let enabled = true;
let sample = 1;

export const setLogEnabled = (v:boolean) => { enabled = v; };
export const setLogSample  = (p:number) => { sample = Math.max(0, Math.min(1, p)); };

/** Structured, low-noise logging that preserves your existing namespaces. */
export function log(ns: LogNs, event: string, data: Record<string, unknown> = {}) {
  if (!enabled || Math.random() > sample) return;
  const payload = { t: new Date().toISOString(), event, ...data };
  // eslint-disable-next-line no-console
  console.log(`[${ns}]`, JSON.stringify(payload));
}
