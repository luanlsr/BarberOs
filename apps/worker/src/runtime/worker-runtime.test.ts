import { afterEach, describe, expect, it } from 'vitest';

import { WorkerHandlerRegistry } from './handler-registry';
import { WorkerRuntime } from './worker-runtime';

describe('WorkerRuntime', () => {
  const runtimes: WorkerRuntime[] = [];

  afterEach(async () => {
    await Promise.all(runtimes.splice(0).map((runtime) => runtime.stop()));
  });

  it('starts health and readiness endpoints and runs the poll loop', async () => {
    let polls = 0;
    const registry = new WorkerHandlerRegistry().register('test.handler', async () => undefined);
    const runtime = new WorkerRuntime({
      port: 0,
      pollIntervalMs: 10_000,
      registry,
      poll: async () => {
        polls += 1;
      },
    });
    runtimes.push(runtime);

    await runtime.start();
    const address = runtime.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok', state: 'READY' });

    const ready = await fetch(`http://127.0.0.1:${port}/ready`);
    expect(ready.status).toBe(200);
    expect(await ready.json()).toMatchObject({
      status: 'ready',
      handlers: ['test.handler'],
    });
    expect(polls).toBe(1);
  });

  it('waits for an in-flight poll during graceful shutdown', async () => {
    let releasePoll!: () => void;
    const pollFinished = new Promise<void>((resolve) => {
      releasePoll = resolve;
    });
    const runtime = new WorkerRuntime({
      port: 0,
      pollIntervalMs: 10_000,
      poll: () => pollFinished,
    });
    runtimes.push(runtime);

    await runtime.start();
    const shutdown = runtime.stop();
    await Promise.resolve();
    expect(runtime.currentState).toBe('STOPPING');

    let stopped = false;
    void shutdown.then(() => {
      stopped = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(stopped).toBe(false);

    releasePoll();
    await shutdown;
    expect(runtime.currentState).toBe('STOPPED');
    expect(runtime.server.listening).toBe(false);
  });

  it('rejects duplicate handler registration', () => {
    const registry = new WorkerHandlerRegistry();
    registry.register('test.handler', async () => undefined);
    expect(() => registry.register('test.handler', async () => undefined)).toThrow(
      'already registered',
    );
  });
});
