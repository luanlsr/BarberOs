export type WorkerHandler<TJob = unknown> = (job: TJob) => Promise<void>;

export class WorkerHandlerRegistry<TJob = unknown> {
  private readonly handlers = new Map<string, WorkerHandler<TJob>>();

  register(name: string, handler: WorkerHandler<TJob>) {
    if (this.handlers.has(name)) {
      throw new Error('A worker handler with this name is already registered.');
    }
    this.handlers.set(name, handler);
    return this;
  }

  get(name: string) {
    return this.handlers.get(name);
  }

  has(name: string) {
    return this.handlers.has(name);
  }

  list() {
    return [...this.handlers.keys()];
  }
}
