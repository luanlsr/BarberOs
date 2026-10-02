import type { PlatformTenantSummary } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformRequestContext } from '../domain';
import { PlatformAuthorizationError } from '../application/platform-authorization';
import {
  createPlatformTenantRouteHandlers,
  type PlatformTenantRouteService,
} from './platform-tenant-route-handlers';

const context: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.read', 'platform.tenants.manage'],
};

const tenantSummary: PlatformTenantSummary = {
  tenantId: 'tenant-1',
  tenantName: 'Barbearia Centro',
  lifecycleStatus: 'ACTIVE',
  branchCount: 2,
  userCount: 5,
  planId: 'plan-pro',
  planCode: 'PRO',
  planName: 'Pro',
  subscriptionStatus: 'ACTIVE',
  openBillingExposureCents: 0,
  usage: { branches: 2, users: 5 },
  health: 'OK',
  healthSignals: [],
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

type MockTenantRouteService = PlatformTenantRouteService & {
  listTenants: ReturnType<typeof vi.fn>;
  applyLifecycleAction: ReturnType<typeof vi.fn>;
};

describe('platform tenant route handlers', () => {
  let service: MockTenantRouteService;

  beforeEach(() => {
    service = {
      listTenants: vi.fn(async () => [tenantSummary]),
      applyLifecycleAction: vi.fn(async (): Promise<PlatformTenantSummary> => ({
        ...tenantSummary,
        lifecycleStatus: 'SUSPENDED',
      })),
    };
  });

  it('lists tenant summaries with platform filters', async () => {
    const handlers = createPlatformTenantRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/platform/tenants?status=ACTIVE&planCode=PRO&query=centro&limit=25&cursor=next-page',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.listTenants).toHaveBeenCalledWith(context, {
      status: 'ACTIVE',
      planCode: 'PRO',
      query: 'centro',
      limit: 25,
      cursor: 'next-page',
    });
    expect(await response.json()).toEqual({ data: [tenantSummary], requestId: 'request-1' });
  });

  it('routes tenant lifecycle actions through the platform service', async () => {
    const handlers = createPlatformTenantRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/tenants?action=suspend', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          reason: 'Inadimplencia confirmada',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(service.applyLifecycleAction).toHaveBeenCalledWith(context, {
      tenantId: 'tenant-1',
      reason: 'Inadimplencia confirmada',
      action: 'SUSPEND',
      requestId: 'request-1',
    });
    expect(await response.json()).toEqual({
      data: {
        ...tenantSummary,
        lifecycleStatus: 'SUSPENDED',
      },
      requestId: 'request-1',
    });
  });

  it('returns stable errors for missing authentication and platform authorization', async () => {
    let handlers = createPlatformTenantRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/tenants', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: 'request-unauthenticated',
      },
    });

    service.listTenants.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    handlers = createPlatformTenantRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    response = await handlers.GET(new Request('https://barberos.local/api/v1/platform/tenants'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ACCESS_DENIED',
        message: 'Platform access is required.',
        requestId: 'request-1',
      },
    });
  });

  it('returns validation errors for invalid route inputs', async () => {
    const handlers = createPlatformTenantRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/tenants?limit=abc'),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ADMIN_VALIDATION_ERROR',
        message: 'Platform admin request payload is invalid.',
        requestId: 'request-1',
      },
    });

    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/tenants', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          reason: 'Inadimplencia confirmada',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(service.applyLifecycleAction).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ADMIN_VALIDATION_ERROR',
        message: 'Platform admin request payload is invalid.',
        requestId: 'request-1',
      },
    });
  });
});
