export function createPagePerformanceLogger(route: string) {
  const enabled = process.env.NODE_ENV !== 'production';
  const start = performance.now();
  let previous = start;

  return function logPagePhase(phase: string, data: Record<string, unknown> = {}) {
    if (!enabled) return;

    const now = performance.now();
    console.info('[BarberOS page]', {
      route,
      phase,
      phaseMs: Math.round(now - previous),
      totalMs: Math.round(now - start),
      ...data,
    });
    previous = now;
  };
}
