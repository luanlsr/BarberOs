import { describe, expect, it } from 'vitest';
import { parsePublicEnv, parseServerEnv } from './index';

describe('environment contracts', () => {
  it('provides safe public defaults', () => {
    expect(parsePublicEnv({})).toEqual({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_NAME: 'BarberOS',
    });
  });

  it('rejects invalid public URLs', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: 'not-a-url' })).toThrow();
  });

  it('treats empty optional Supabase variables as unconfigured', () => {
    expect(
      parseServerEnv({
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      }),
    ).toMatchObject({
      SUPABASE_URL: undefined,
      SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
  });

  it('uses public Supabase variables as a server fallback for local Next.js auth', () => {
    expect(
      parseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://barberos.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toMatchObject({
      SUPABASE_URL: 'https://barberos.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
    });
  });

  it('does not require service role credentials for local shell work', () => {
    expect(parseServerEnv({}).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
  it('provides safe Asaas checkout defaults and accepts webhook configuration', () => {
    expect(parseServerEnv({})).toMatchObject({ ASAAS_ENVIRONMENT: 'sandbox' });
    expect(
      parseServerEnv({
        ASAAS_API_KEY: 'asaas-key',
        ASAAS_ENVIRONMENT: 'production',
        ASAAS_WEBHOOK_TOKEN: 'webhook-token',
      }),
    ).toMatchObject({
      ASAAS_API_KEY: 'asaas-key',
      ASAAS_ENVIRONMENT: 'production',
      ASAAS_WEBHOOK_TOKEN: 'webhook-token',
    });
  });

  it('rejects invalid Asaas environments', () => {
    expect(() => parseServerEnv({ ASAAS_ENVIRONMENT: 'staging' })).toThrow();
  });

  it('provides safe worker and Redis defaults for local development', () => {
    expect(parseServerEnv({})).toMatchObject({
      NODE_ENV: 'development',
      WORKER_PORT: 4001,
      WORKER_CONCURRENCY: 2,
      WORKER_POLL_INTERVAL_MS: 1000,
      WORKER_BATCH_SIZE: 10,
      WORKER_LOCK_TTL_MS: 30000,
      WORKER_MAX_ATTEMPTS: 5,
      WORKER_RETRY_BASE_DELAY_MS: 60000,
      WORKER_RETRY_MAX_DELAY_MS: 1800000,
      REDIS_NAMESPACE: 'barberos',
      REDIS_TLS: 'false',
    });
  });

  it('rejects invalid worker and Redis configuration values', () => {
    expect(() => parseServerEnv({ WORKER_CONCURRENCY: '0' })).toThrow();
    expect(() => parseServerEnv({ WORKER_BATCH_SIZE: '101' })).toThrow();
    expect(() => parseServerEnv({ WORKER_POLL_INTERVAL_MS: '50' })).toThrow();
    expect(() => parseServerEnv({ WORKER_LOCK_TTL_MS: '999' })).toThrow();
    expect(() => parseServerEnv({ REDIS_URL: 'not-a-url' })).toThrow();
    expect(() =>
      parseServerEnv({
        WORKER_RETRY_BASE_DELAY_MS: '60000',
        WORKER_RETRY_MAX_DELAY_MS: '1000',
      }),
    ).toThrow('WORKER_RETRY_BASE_DELAY_MS');
  });

  it('accepts production-like worker and Redis configuration', () => {
    expect(
      parseServerEnv({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://barberos.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        BARBEROS_DEV_AUTH: 'false',
        WORKER_PORT: '4100',
        WORKER_CONCURRENCY: '8',
        WORKER_POLL_INTERVAL_MS: '500',
        WORKER_BATCH_SIZE: '25',
        WORKER_LOCK_TTL_MS: '45000',
        WORKER_MAX_ATTEMPTS: '7',
        WORKER_RETRY_BASE_DELAY_MS: '30000',
        WORKER_RETRY_MAX_DELAY_MS: '1800000',
        REDIS_URL: 'rediss://redis.example.com:6379',
        REDIS_NAMESPACE: 'barberos-prod',
        REDIS_TLS: 'true',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      WORKER_PORT: 4100,
      WORKER_CONCURRENCY: 8,
      WORKER_BATCH_SIZE: 25,
      REDIS_URL: 'rediss://redis.example.com:6379',
      REDIS_NAMESPACE: 'barberos-prod',
      REDIS_TLS: 'true',
    });
  });
});
