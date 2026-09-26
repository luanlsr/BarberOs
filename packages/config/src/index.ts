import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrlString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional(),
);

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SUPABASE_URL: optionalUrlString,
    SUPABASE_ANON_KEY: optionalNonEmptyString,
    SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrlString,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
    BARBEROS_DEV_AUTH: z.enum(['true', 'false']).default('true'),
    WORKER_PORT: z.coerce.number().int().positive().default(4001),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(2),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60000).default(1000),
    WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
    WORKER_LOCK_TTL_MS: z.coerce.number().int().min(1000).max(900000).default(30000),
    WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(25).default(5),
    WORKER_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    WORKER_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1000).max(86400000).default(1800000),
    REDIS_URL: optionalUrlString,
    REDIS_NAMESPACE: z.string().trim().min(1).max(80).default('barberos'),
    REDIS_TLS: z.enum(['true', 'false']).default('false'),
    AI_PORT: z.coerce.number().int().positive().default(8000),
    ASAAS_API_KEY: optionalNonEmptyString,
    ASAAS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    ASAAS_WEBHOOK_TOKEN: optionalNonEmptyString,
    WHATSAPP_PROVIDER: z.enum(['local', 'meta']).default('local'),
    WHATSAPP_ACCESS_TOKEN: optionalNonEmptyString,
    WHATSAPP_PHONE_NUMBER_ID: optionalNonEmptyString,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalNonEmptyString,
    WHATSAPP_WEBHOOK_APP_SECRET: optionalNonEmptyString,
    WHATSAPP_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
    CAMPAIGN_DISPATCH_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
    CAMPAIGN_DISPATCH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1000).default(120),
  })
  .transform((value) => ({
    ...value,
    SUPABASE_URL: value.SUPABASE_URL ?? value.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: value.SUPABASE_ANON_KEY ?? value.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }))
  .refine(
    (value) =>
      value.WHATSAPP_PROVIDER !== 'meta' ||
      (Boolean(value.WHATSAPP_ACCESS_TOKEN) &&
        Boolean(value.WHATSAPP_PHONE_NUMBER_ID) &&
        Boolean(value.WHATSAPP_WEBHOOK_VERIFY_TOKEN) &&
        Boolean(value.WHATSAPP_WEBHOOK_APP_SECRET)),
    {
      message:
        'Meta WhatsApp provider requires WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WEBHOOK_VERIFY_TOKEN and WHATSAPP_WEBHOOK_APP_SECRET.',
      path: ['WHATSAPP_PROVIDER'],
    },
  )
  .refine((value) => value.WORKER_RETRY_BASE_DELAY_MS <= value.WORKER_RETRY_MAX_DELAY_MS, {
    message: 'WORKER_RETRY_BASE_DELAY_MS must be less than or equal to WORKER_RETRY_MAX_DELAY_MS.',
    path: ['WORKER_RETRY_BASE_DELAY_MS'],
  });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('BarberOS'),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrlString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
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
