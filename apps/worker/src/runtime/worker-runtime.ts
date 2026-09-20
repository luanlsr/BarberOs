import { createServer, type Server } from 'node:http';

import { WorkerHandlerRegistry } from './handler-registry';
import { sanitizeUnknownError, WorkerLogger } from './worker-logger';

export type WorkerRuntimeState = 'STARTING' | 'READY' | 'STOPPING' | 'STOPPED';

export type WorkerRuntimeOptions<TJob = unknown> = {
  port: number;
  pollIntervalMs: number;
  poll?: () => Promise<void>;
  registry?: WorkerHandlerRegistry<TJob>;
  logger?: WorkerLogger;
};

export class WorkerRuntime<TJob = unknown> {
  readonly registry: WorkerHandlerRegistry<TJob>;
  readonly server: Server;
  private readonly logger: WorkerLogger;
  private state: WorkerRuntimeState = 'STARTING';
  private timer: NodeJS.Timeout | null = null;
  private pollInFlight: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;

  constructor(private readonly options: WorkerRuntimeOptions<TJob>) {
    this.registry = options.registry ?? new WorkerHandlerRegistry<TJob>();
    this.logger = options.logger ?? new WorkerLogger();
    this.server = createServer((request, response) => this.handleRequest(request.url, response));
  }

  get currentState() {
    return this.state;
  }

  async start() {
    if (this.state !== 'STARTING') return;
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.options.port, '127.0.0.1', () => resolve());
    });
    this.state = 'READY';
    this.timer = setInterval(() => {
      void this.runPoll();
    }, this.options.pollIntervalMs);
    this.timer.unref();
    void this.runPoll();
  }

  async stop() {
    if (this.stopPromise) return this.stopPromise;
    this.stopPromise = this.shutdown();
    return this.stopPromise;
  }

  private async shutdown() {
    if (this.state === 'STOPPED') return;
    this.state = 'STOPPING';
    if (this.timer) clearInterval(this.timer);
    if (this.pollInFlight) await this.pollInFlight;
    await new Promise<void>((resolve, reject) => {
      if (!this.server.listening) {
        resolve();
        return;
      }
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
    this.state = 'STOPPED';
  }

  private async runPoll() {
    if (this.state !== 'READY' || this.pollInFlight || !this.options.poll) return;
    this.pollInFlight = this.options
      .poll()
      .catch((error) => {
        this.logger.error({
          event: 'worker.poll.failed',
          error: sanitizeUnknownError(error),
        });
      })
      .finally(() => {
        this.pollInFlight = null;
      });
    await this.pollInFlight;
  }

  private handleRequest(url: string | undefined, response: import('node:http').ServerResponse) {
    if (url === '/health') {
      this.writeJson(response, 200, {
        status: 'ok',
        service: 'worker',
        state: this.state,
      });
      return;
    }
    if (url === '/ready') {
      this.writeJson(response, this.state === 'READY' ? 200 : 503, {
        status: this.state === 'READY' ? 'ready' : 'not_ready',
        service: 'worker',
        state: this.state,
        handlers: this.registry.list(),
      });
      return;
    }
    this.writeJson(response, 404, { error: 'not_found' });
  }

  private writeJson(
    response: import('node:http').ServerResponse,
    status: number,
    body: Record<string, unknown>,
  ) {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  }
}
