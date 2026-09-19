import { parseServerEnv } from '@barberos/config';

import { WorkerRuntime } from './runtime';

export function createWorkerRuntimeFromEnv(input: NodeJS.ProcessEnv = process.env) {
  const env = parseServerEnv(input);
  return new WorkerRuntime({
    port: env.WORKER_PORT,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
  });
}

async function main() {
  const runtime = createWorkerRuntimeFromEnv();
  await runtime.start();
  const address = runtime.server.address();
  const port = typeof address === 'object' && address ? address.port : 'unknown';
  console.log(`BarberOS worker listening on http://localhost:${port}`);

  const shutdown = () => {
    void runtime.stop().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  void main().catch((error) => {
    console.error('Worker failed to start.', error);
    process.exitCode = 1;
  });
}
