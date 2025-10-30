import { useEffect } from 'react';

/** Simple perf marker to time effects/rebuilds and print one structured log. */
export function usePerfMarks(label: string, deps: unknown[]) {
  useEffect(() => {
    const mark = `${label}:${Date.now()}`;
    performance.mark(mark);
    return () => {
      performance.measure(label, mark);
      const e = performance.getEntriesByName(label).slice(-1)[0];
      if (e) {
        // eslint-disable-next-line no-console
        console.log('[Refactor]', JSON.stringify({ t: new Date().toISOString(), event: 'perf', label, dur: Math.round(e.duration) }));
      }
      performance.clearMarks(mark);
      performance.clearMeasures(label);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
