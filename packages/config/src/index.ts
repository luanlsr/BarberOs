import { z } from 'zod';

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  BARBEROS_DEV_AUTH: z.enum(['true', 'false']).default('true'),
  WORKER_PORT: z.coerce.number().int().positive().default(4001),
  AI_PORT: z.coerce.number().int().positive().default(8000),
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
