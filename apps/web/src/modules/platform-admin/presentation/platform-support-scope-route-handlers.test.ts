import type { SupportScope } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAuthorizationError } from '../application/platform-authorization';
import type { PlatformRequestContext } from '../domain';
import {
  createPlatformSupportScopeRouteHandlers,
  type PlatformSupportScopeRouteService,
} from './platform-support-scope-route-handlers';

const context: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.support.manage'],
};

const scope: SupportScope = {
  id: 'scope-1',
  tenantId: 'tenant-1',
  actorUserId: 'support-user-1',
  purpose: 'Investigar invoice vencida.',
  operationClass: 'BILLING_SUPPORT',
  status: 'ACTIVE',
  expiresAt: '2026-10-01T13:00:00.000Z',
  createdAt: '2026-10-01T12:00:00.000Z',
};

type MockSupportScopeRouteService = PlatformSupportScopeRouteService & {
  listSupportScopes: ReturnType<typeof vi.fn>;
  createSupportScope: ReturnType<typeof vi.fn>;
  assertScopeForOperation: ReturnType<typeof vi.fn>;
};

describe('platform support scope route handlers', () => {
  let service: MockSupportScopeRouteService;

  beforeEach(() => {
    service = {
      listSupportScopes: vi.fn(async () => [scope]),
      createSupportScope: vi.fn(async (): Promise<SupportScope> => ({
        ...scope,
        id: 'scope-created',
      })),
      assertScopeForOperation: vi.fn(async (): Promise<SupportScope> => scope),
    };
  });

  it('lists and creates support scopes', async () => {
    const handlers = createPlatformSupportScopeRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/support-scopes?tenantId=tenant-1'),
    );
    expect(response.status).toBe(200);
    expect(service.listSupportScopes).toHaveBeenCalledWith(context, 'tenant-1');
    expect(await response.json()).toEqual({ data: [scope], requestId: 'request-1' });

    const command = {
      tenantId: 'tenant-1',
      actorUserId: 'support-user-1',
      purpose: 'Investigar invoice vencida.',
      operationClass: 'BILLING_SUPPORT',
      expiresAt: '2099-10-01T13:00:00.000Z',
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/support-scopes', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    );

    expect(response.status).toBe(201);
    expect(service.createSupportScope).toHaveBeenCalledWith(context, command);
  });

  it('validates support scope coverage for operations', async () => {
    const handlers = createPlatformSupportScopeRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const command = {
      tenantId: 'tenant-1',
      actorUserId: 'support-user-1',
      operationClass: 'TENANT_HEALTH',
    };
    const response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/platform/support-scopes', {
        method: 'PATCH',
        body: JSON.stringify(command),
      }),
    );

    expect(response.status).toBe(200);
    expect(service.assertScopeForOperation).toHaveBeenCalledWith(context, command);
  });

  it('returns validation errors for missing purpose', async () => {
    service.createSupportScope.mockRejectedValueOnce({
      code: 'PLATFORM_ADMIN_VALIDATION_ERROR',
      message: 'Support scope purpose is required.',
    });
    const handlers = createPlatformSupportScopeRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/support-scopes', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          actorUserId: 'support-user-1',
          operationClass: 'BILLING_SUPPORT',
          expiresAt: '2099-10-01T13:00:00.000Z',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ADMIN_VALIDATION_ERROR',
        message: 'Platform admin request payload is invalid.',
        requestId: 'request-1',
      },
    });
  });

  it('returns platform-only and expired support scope errors', async () => {
    const handlers = createPlatformSupportScopeRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    service.listSupportScopes.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/support-scopes'),
    );
    expect(response.status).toBe(403);

    service.assertScopeForOperation.mockRejectedValueOnce(
      new PlatformAuthorizationError(
        'SUPPORT_SCOPE_REQUIRED',
        'A valid support scope is required.',
      ),
    );
    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/platform/support-scopes', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          actorUserId: 'support-user-1',
          operationClass: 'PRIVATE_OPERATIONAL_READ',
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'SUPPORT_SCOPE_REQUIRED',
        message: 'A valid support scope is required.',
        requestId: 'request-1',
      },
    });
  });
});
