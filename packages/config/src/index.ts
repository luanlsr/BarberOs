import { z } from 'zod';

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    BARBEROS_DEV_AUTH: z.enum(['true', 'false']).default('true'),
    WORKER_PORT: z.coerce.number().int().positive().default(4001),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(2),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60000).default(1000),
    WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
    WORKER_LOCK_TTL_MS: z.coerce.number().int().min(1000).max(900000).default(30000),
    WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(25).default(5),
    WORKER_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    WORKER_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1000).max(86400000).default(1800000),
    REDIS_URL: z.string().url().optional(),
    REDIS_NAMESPACE: z.string().trim().min(1).max(80).default('barberos'),
    REDIS_TLS: z.enum(['true', 'false']).default('false'),
    AI_PORT: z.coerce.number().int().positive().default(8000),
  })
  .refine((value) => value.WORKER_RETRY_BASE_DELAY_MS <= value.WORKER_RETRY_MAX_DELAY_MS, {
    message: 'WORKER_RETRY_BASE_DELAY_MS must be less than or equal to WORKER_RETRY_MAX_DELAY_MS.',
    path: ['WORKER_RETRY_BASE_DELAY_MS'],
  });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('BarberOS'),
});

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const parsed = serverEnvSchema.parse(input);
  const hasUrl = Boolean(parsed.SUPABASE_URL);
  const hasAnonKey = Boolean(parsed.SUPABASE_ANON_KEY);
  if (hasUrl !== hasAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured together.');
  }
  return parsed;
}

export function parsePublicEnv(input: NodeJS.ProcessEnv) {
  return publicEnvSchema.parse(input);
}

export type ServerEnv = ReturnType<typeof parseServerEnv>;
export type PublicEnv = ReturnType<typeof parsePublicEnv>;
