import type { WorkerJob } from '@barberos/contracts';

import type { LeaseLockStore } from './lease-lock-store';

export type DurableJobClaimInput = {
  workerId: string;
  limit: number;
  leaseTtlMs: number;
  now?: Date;
};

export interface DurableJobClaimStore {
  claimAvailableJobs(input: DurableJobClaimInput): Promise<WorkerJob[]>;
}

export class WorkerJobClaimer {
  constructor(
    private readonly jobs: DurableJobClaimStore,
    private readonly locks: LeaseLockStore,
  ) {}

  async claim(input: DurableJobClaimInput) {
    const claimed = await this.jobs.claimAvailableJobs(input);
    const locked: WorkerJob[] = [];

    for (const job of claimed) {
      const lock = await this.locks.acquire({
        key: `worker-job:${job.id}`,
        ownerId: input.workerId,
        ttlMs: input.leaseTtlMs,
        now: input.now,
      });
      if (lock) locked.push(job);
    }

    return locked;
  }
}
