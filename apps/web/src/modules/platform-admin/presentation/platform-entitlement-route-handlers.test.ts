import type { EntitlementDecision } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAuthorizationError } from '../application/platform-authorization';
import type { PlatformRequestContext } from '../domain';
import {
  createPlatformEntitlementRouteHandlers,
  type PlatformEntitlementRouteService,
} from './platform-entitlement-route-handlers';

const context: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.read', 'platform.tenants.manage'],
};

const allowedDecision: EntitlementDecision = {
  tenantId: 'tenant-1',
  entitlement: 'ai',
  allowed: true,
  source: 'PLAN',
  limit: 1000,
  planId: 'plan-ai',
  resolvedAt: '2026-10-01T12:00:00.000Z',
};

type MockEntitlementRouteService = PlatformEntitlementRouteService & {
  resolveEntitlement: ReturnType<typeof vi.fn>;
  applyEntitlementOverride: ReturnType<typeof vi.fn>;
};

describe('platform entitlement route handlers', () => {
  let service: MockEntitlementRouteService;

  beforeEach(() => {
    service = {
      resolveEntitlement: vi.fn(async (): Promise<EntitlementDecision> => allowedDecision),
      applyEntitlementOverride: vi.fn(
        async (_context, command: { enabled?: boolean }): Promise<EntitlementDecision> => ({
          ...allowedDecision,
          allowed: Boolean(command.enabled),
          source: 'OVERRIDE',
          overrideId: 'override-1',
          reason: 'Commercial exception.',
        }),
      ),
    };
  });

  it('resolves effective tenant entitlement decisions', async () => {
    const handlers = createPlatformEntitlementRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/platform/entitlements?tenantId=tenant-1&entitlement=ai',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.resolveEntitlement).toHaveBeenCalledWith(context, {
      tenantId: 'tenant-1',
      entitlement: 'ai',
    });
    expect(await response.json()).toEqual({ data: allowedDecision, requestId: 'request-1' });
  });

  it('applies audited allow and deny overrides', async () => {
    const handlers = createPlatformEntitlementRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/entitlements', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          entitlement: 'ai',
          enabled: true,
          limit: 500,
          reason: 'Commercial exception.',
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.applyEntitlementOverride).toHaveBeenCalledWith(context, {
      tenantId: 'tenant-1',
      entitlement: 'ai',
      enabled: true,
      limit: 500,
      reason: 'Commercial exception.',
    });
    expect((await response.json()).data).toMatchObject({
      allowed: true,
      source: 'OVERRIDE',
    });

    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/entitlements', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          entitlement: 'ai',
          enabled: false,
          reason: 'Support pause.',
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({
      allowed: false,
      source: 'OVERRIDE',
    });
  });

  it('returns stable errors for invalid and non-platform requests', async () => {
    const handlers = createPlatformEntitlementRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/entitlements?tenantId=tenant-1'),
    );
    expect(response.status).toBe(400);

    service.resolveEntitlement.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/platform/entitlements?tenantId=tenant-1&entitlement=ai',
      ),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ACCESS_DENIED',
        message: 'Platform access is required.',
        requestId: 'request-1',
      },
    });
  });
});
