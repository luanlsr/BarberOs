import { parseServerEnv } from '@barberos/config';

import { sanitizeUnknownError, WorkerLogger, WorkerRuntime } from './runtime';

export function createWorkerRuntimeFromEnv(input: NodeJS.ProcessEnv = process.env) {
  const env = parseServerEnv(input);
  return new WorkerRuntime({
    port: env.WORKER_PORT,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    logger: new WorkerLogger(),
  });
}

async function main() {
  const runtime = createWorkerRuntimeFromEnv();
  await runtime.start();
  const address = runtime.server.address();
  const port = typeof address === 'object' && address ? address.port : 'unknown';
  new WorkerLogger().info({
    event: 'worker.started',
    metadata: { host: '127.0.0.1', port },
  });

  const shutdown = () => {
    void runtime.stop().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  void main().catch((error) => {
    new WorkerLogger().error({
      event: 'worker.start.failed',
      error: sanitizeUnknownError(error),
    });
    process.exitCode = 1;
  });
}
