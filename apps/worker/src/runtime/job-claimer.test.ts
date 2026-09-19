import type { WorkerJob } from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  WorkerJobClaimer,
  type DurableJobClaimInput,
  type DurableJobClaimStore,
} from './job-claimer';
import { InMemoryLeaseLockStore } from './lease-lock-store';

describe('WorkerJobClaimer', () => {
  it('allows only one concurrent worker to claim the same available job', async () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const store = new InMemoryDurableJobStore([makeJob({ id: 'job-1', runAt: now.toISOString() })]);
    const locks = new InMemoryLeaseLockStore();

    const [first, second] = await Promise.all([
      new WorkerJobClaimer(store, locks).claim({
        workerId: 'worker-a',
        limit: 1,
        leaseTtlMs: 30_000,
        now,
      }),
      new WorkerJobClaimer(store, locks).claim({
        workerId: 'worker-b',
        limit: 1,
        leaseTtlMs: 30_000,
        now,
      }),
    ]);

    const claimed = [...first, ...second];
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('job-1');
    expect(store.find('job-1')?.lockedBy).toBe(claimed[0]?.lockedBy);
    expect(store.find('job-1')?.status).toBe('CLAIMED');
  });

  it('reclaims a job when the durable lease is expired', async () => {
    const firstClaimAt = new Date('2026-09-19T12:00:00.000Z');
    const reclaimAt = new Date('2026-09-19T12:01:01.000Z');
    const store = new InMemoryDurableJobStore([
      makeJob({ id: 'job-1', runAt: firstClaimAt.toISOString() }),
    ]);
    const locks = new InMemoryLeaseLockStore();

    const first = await new WorkerJobClaimer(store, locks).claim({
      workerId: 'worker-a',
      limit: 1,
      leaseTtlMs: 30_000,
      now: firstClaimAt,
    });
    expect(first).toHaveLength(1);

    const second = await new WorkerJobClaimer(store, locks).claim({
      workerId: 'worker-b',
      limit: 1,
      leaseTtlMs: 30_000,
      now: reclaimAt,
    });

    expect(second).toHaveLength(1);
    expect(second[0]?.lockedBy).toBe('worker-b');
    expect(second[0]?.lockedUntil).toBe('2026-09-19T12:01:31.000Z');
  });
});

class InMemoryDurableJobStore implements DurableJobClaimStore {
  private readonly jobs = new Map<string, WorkerJob>();

  constructor(jobs: WorkerJob[]) {
    for (const job of jobs) this.jobs.set(job.id, job);
  }

  find(id: string) {
    return this.jobs.get(id);
  }

  async claimAvailableJobs(input: DurableJobClaimInput) {
    const now = input.now ?? new Date();
    const claimed: WorkerJob[] = [];

    for (const job of [...this.jobs.values()].sort((a, b) => b.priority - a.priority)) {
      if (claimed.length >= input.limit) break;
      if (!isClaimable(job, now)) continue;

      const locked = {
        ...job,
        status: 'CLAIMED' as const,
        lockedBy: input.workerId,
        lockedUntil: new Date(now.getTime() + input.leaseTtlMs).toISOString(),
        updatedAt: now.toISOString(),
      };
      this.jobs.set(job.id, locked);
      claimed.push(locked);
    }

    return claimed;
  }
}

function isClaimable(job: WorkerJob, now: Date) {
  if (new Date(job.runAt) > now) return false;
  if (job.status === 'PENDING' || job.status === 'RETRY_SCHEDULED') return true;
  if (!job.lockedUntil) return false;
  return ['CLAIMED', 'RUNNING'].includes(job.status) && new Date(job.lockedUntil) <= now;
}

function makeJob(input: { id: string; runAt: string }): WorkerJob {
  return {
    id: input.id,
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'APPOINTMENT_REMINDER',
    status: 'PENDING',
    schemaVersion: 1,
    sourceType: 'APPOINTMENT',
    sourceId: 'appointment-1',
    payload: {},
    idempotencyKey: `appointment-1:reminder:${input.id}`,
    correlationId: `correlation-${input.id}`,
    priority: 50,
    attemptCount: 0,
    maxAttempts: 5,
    runAt: input.runAt,
    createdAt: input.runAt,
    updatedAt: input.runAt,
  };
}
