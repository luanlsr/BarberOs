import type { WorkerJob } from '@barberos/contracts';

export type WorkerMetricUnit = 'count' | 'milliseconds';

export type WorkerMetricPoint = {
  timestamp: string;
  service: 'worker';
  name: string;
  value: number;
  unit: WorkerMetricUnit;
  tags?: Record<string, string>;
};

export type WorkerMetricInput = {
  name: string;
  value?: number;
  unit?: WorkerMetricUnit;
  job?: WorkerJob;
  tags?: Record<string, string | number | boolean | undefined>;
};

export type WorkerMetricsSink = {
  record(point: WorkerMetricPoint): void;
};

export class WorkerMetrics {
  constructor(
    private readonly sink: WorkerMetricsSink = consoleWorkerMetricsSink,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  count(input: Omit<WorkerMetricInput, 'unit'>) {
    this.record({ ...input, unit: 'count', value: input.value ?? 1 });
  }

  timing(input: Omit<WorkerMetricInput, 'unit'>) {
    this.record({ ...input, unit: 'milliseconds' });
  }

  record(input: WorkerMetricInput) {
    this.sink.record(createWorkerMetricPoint(input, this.clock()));
  }
}

export function createWorkerMetricPoint(
  input: WorkerMetricInput,
  now: Date = new Date(),
): WorkerMetricPoint {
  return {
    timestamp: now.toISOString(),
    service: 'worker',
    name: input.name,
    value: input.value ?? 1,
    unit: input.unit ?? 'count',
    tags: sanitizeMetricTags({
      ...(input.job
        ? {
            jobType: input.job.type,
            tenantId: input.job.tenantId,
            branchId: input.job.branchId,
            attemptCount: input.job.attemptCount,
          }
        : {}),
      ...input.tags,
    }),
  };
}

export const consoleWorkerMetricsSink: WorkerMetricsSink = {
  record(point) {
    console.log(JSON.stringify({ kind: 'metric', ...point }));
  },
};

function sanitizeMetricTags(tags: WorkerMetricInput['tags']) {
  const sanitized = Object.fromEntries(
    Object.entries(tags ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value).slice(0, 120)]),
  );
  return Object.keys(sanitized).length ? sanitized : undefined;
}
