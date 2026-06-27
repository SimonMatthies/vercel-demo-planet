const moduleLoadedAt = performance.now();

let requestCount = 0;
let firstRequestAt: number | null = null;

export function recordRequest() {
  requestCount += 1;
  if (firstRequestAt === null) {
    firstRequestAt = performance.now();
  }
}

export function getRuntimeMetrics() {
  const now = performance.now();
  const isFirstRequestOnInstance = requestCount === 1;

  return {
    moduleLoadedAtMs: Math.round(moduleLoadedAt),
    instanceAgeMs: firstRequestAt === null ? 0 : Math.round(now - firstRequestAt),
    requestCountOnInstance: requestCount,
    isColdStart: isFirstRequestOnInstance,
    fluidCompute: true,
  };
}

export async function measure<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  return {
    result,
    durationMs: Math.round((performance.now() - start) * 100) / 100,
  };
}
