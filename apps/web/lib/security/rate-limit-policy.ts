export type SensitiveRateLimitSurface =
  | 'auth'
  | 'ai'
  | 'public-booking'
  | 'whatsapp-campaigns'
  | 'search'
  | 'webhooks'
  | 'platform-support';

export type RateLimitScope = {
  tenantId?: string;
  userId?: string;
  ip?: string;
  provider?: string;
};

export type RateLimitDecision = {
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds?: number;
};

export type RateLimitPolicy = {
  surface: SensitiveRateLimitSurface;
  windowSeconds: number;
  limit: number;
  keyParts: readonly (keyof RateLimitScope)[];
};

export const sensitiveRateLimitPolicies: Record<SensitiveRateLimitSurface, RateLimitPolicy> = {
  auth: {
    surface: 'auth',
    windowSeconds: 60,
    limit: 10,
    keyParts: ['ip', 'userId'],
  },
  ai: {
    surface: 'ai',
    windowSeconds: 60,
    limit: 30,
    keyParts: ['tenantId', 'userId'],
  },
  'public-booking': {
    surface: 'public-booking',
    windowSeconds: 60,
    limit: 20,
    keyParts: ['tenantId', 'ip'],
  },
  'whatsapp-campaigns': {
    surface: 'whatsapp-campaigns',
    windowSeconds: 60,
    limit: 120,
    keyParts: ['tenantId', 'provider'],
  },
  search: {
    surface: 'search',
    windowSeconds: 60,
    limit: 60,
    keyParts: ['tenantId', 'userId'],
  },
  webhooks: {
    surface: 'webhooks',
    windowSeconds: 60,
    limit: 300,
    keyParts: ['provider', 'ip'],
  },
  'platform-support': {
    surface: 'platform-support',
    windowSeconds: 60,
    limit: 20,
    keyParts: ['tenantId', 'userId'],
  },
};

export class InMemoryRateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAtMs: number }>();

  consume(policy: RateLimitPolicy, scope: RateLimitScope, now = new Date()): RateLimitDecision {
    const key = createRateLimitKey(policy, scope);
    const nowMs = now.getTime();
    const current = this.buckets.get(key);
    const resetAtMs =
      !current || current.resetAtMs <= nowMs
        ? nowMs + policy.windowSeconds * 1000
        : current.resetAtMs;
    const count = !current || current.resetAtMs <= nowMs ? 1 : current.count + 1;

    this.buckets.set(key, { count, resetAtMs });

    const allowed = count <= policy.limit;
    const remaining = Math.max(policy.limit - count, 0);
    const retryAfterSeconds = allowed ? undefined : Math.ceil((resetAtMs - nowMs) / 1000);

    return {
      allowed,
      key,
      limit: policy.limit,
      remaining,
      resetAt: new Date(resetAtMs).toISOString(),
      retryAfterSeconds,
    };
  }
}

export function createRateLimitKey(policy: RateLimitPolicy, scope: RateLimitScope) {
  const parts = policy.keyParts.map((part) => `${part}:${scope[part] ?? 'anonymous'}`);
  return ['rate-limit', policy.surface, ...parts].join(':');
}
