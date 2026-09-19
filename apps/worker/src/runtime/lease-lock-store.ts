export type LeaseLock = {
  key: string;
  ownerId: string;
  expiresAt: Date;
};

export interface LeaseLockStore {
  acquire(input: {
    key: string;
    ownerId: string;
    ttlMs: number;
    now?: Date;
  }): Promise<LeaseLock | null>;
  release(input: { key: string; ownerId: string }): Promise<boolean>;
}

export class InMemoryLeaseLockStore implements LeaseLockStore {
  private readonly locks = new Map<string, LeaseLock>();

  async acquire(input: { key: string; ownerId: string; ttlMs: number; now?: Date }) {
    const now = input.now ?? new Date();
    const existing = this.locks.get(input.key);
    if (existing && existing.expiresAt > now && existing.ownerId !== input.ownerId) return null;

    const lock = {
      key: input.key,
      ownerId: input.ownerId,
      expiresAt: new Date(now.getTime() + input.ttlMs),
    };
    this.locks.set(input.key, lock);
    return lock;
  }

  async release(input: { key: string; ownerId: string }) {
    const existing = this.locks.get(input.key);
    if (!existing || existing.ownerId !== input.ownerId) return false;
    this.locks.delete(input.key);
    return true;
  }
}
