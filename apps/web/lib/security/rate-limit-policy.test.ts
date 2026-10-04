import { describe, expect, it } from 'vitest';

import {
  createRateLimitKey,
  InMemoryRateLimitStore,
  sensitiveRateLimitPolicies,
} from './rate-limit-policy';

describe('sensitive rate limit policy', () => {
  it('creates stable tenant and user scoped keys for sensitive surfaces', () => {
    expect(
      createRateLimitKey(sensitiveRateLimitPolicies.ai, {
        tenantId: 'tenant-1',
        userId: 'user-1',
      }),
    ).toBe('rate-limit:ai:tenantId:tenant-1:userId:user-1');

    expect(
      createRateLimitKey(sensitiveRateLimitPolicies.webhooks, {
        provider: 'asaas',
        ip: '127.0.0.1',
      }),
    ).toBe('rate-limit:webhooks:provider:asaas:ip:127.0.0.1');
  });

  it('allows requests under the configured limit and exposes remaining quota', () => {
    const store = new InMemoryRateLimitStore();
    const decision = store.consume(
      { surface: 'auth', windowSeconds: 60, limit: 2, keyParts: ['ip'] },
      { ip: '127.0.0.1' },
      new Date('2026-10-03T12:00:00.000Z'),
    );

    expect(decision).toEqual({
      allowed: true,
      key: 'rate-limit:auth:ip:127.0.0.1',
      limit: 2,
      remaining: 1,
      resetAt: '2026-10-03T12:01:00.000Z',
      retryAfterSeconds: undefined,
    });
  });

  it('rejects calls above the configured limit without executing side effects', () => {
    const store = new InMemoryRateLimitStore();
    const policy = {
      surface: 'auth' as const,
      windowSeconds: 60,
      limit: 1,
      keyParts: ['ip'] as const,
    };
    const now = new Date('2026-10-03T12:00:00.000Z');

    expect(store.consume(policy, { ip: '127.0.0.1' }, now).allowed).toBe(true);
    expect(store.consume(policy, { ip: '127.0.0.1' }, now)).toEqual({
      allowed: false,
      key: 'rate-limit:auth:ip:127.0.0.1',
      limit: 1,
      remaining: 0,
      resetAt: '2026-10-03T12:01:00.000Z',
      retryAfterSeconds: 60,
    });
  });
});
