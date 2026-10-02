import type { SaasPlan } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import {
  createPlatformPlanRouteHandlers,
  type PlatformPlanRouteService,
} from './platform-plan-route-handlers';

const context: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.plans.manage'],
};

const plan: SaasPlan = {
  id: 'plan-pro',
  code: 'pro',
  name: 'Pro',
  priceAmountCents: 9900,
  billingInterval: 'MONTHLY',
  status: 'ACTIVE',
  entitlements: [
    {
      id: 'plan-pro:finance',
      planId: 'plan-pro',
      entitlement: 'finance',
      enabled: true,
      limit: 100,
      metadata: {},
    },
  ],
  metadata: {},
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

type MockPlanRouteService = PlatformPlanRouteService & {
  listPlans: ReturnType<typeof vi.fn>;
  createPlan: ReturnType<typeof vi.fn>;
  updatePlan: ReturnType<typeof vi.fn>;
  archivePlan: ReturnType<typeof vi.fn>;
};

describe('platform plan route handlers', () => {
  let service: MockPlanRouteService;

  beforeEach(() => {
    service = {
      listPlans: vi.fn(async () => [plan]),
      createPlan: vi.fn(async (): Promise<SaasPlan> => ({ ...plan, id: 'plan-created' })),
      updatePlan: vi.fn(async (): Promise<SaasPlan> => ({ ...plan, priceAmountCents: 12900 })),
      archivePlan: vi.fn(async (): Promise<SaasPlan> => ({ ...plan, status: 'ARCHIVED' })),
    };
  });

  it('lists, creates and updates SaaS plans through protected APIs', async () => {
    const handlers = createPlatformPlanRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/plans'),
    );
    expect(response.status).toBe(200);
    expect(service.listPlans).toHaveBeenCalledWith(context);
    expect(await response.json()).toEqual({ data: [plan], requestId: 'request-1' });

    const createCommand = {
      code: 'scale',
      name: 'Scale',
      priceAmountCents: 39900,
      billingInterval: 'MONTHLY',
      entitlements: [{ entitlement: 'ai', enabled: true, limit: 5000 }],
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'POST',
        body: JSON.stringify(createCommand),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.createPlan).toHaveBeenCalledWith(context, createCommand);

    const updateCommand = { id: 'plan-pro', priceAmountCents: 12900 };
    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'PATCH',
        body: JSON.stringify(updateCommand),
      }),
    );
    expect(response.status).toBe(200);
    expect(service.updatePlan).toHaveBeenCalledWith(context, updateCommand);
  });

  it('archives SaaS plans with a reason', async () => {
    const handlers = createPlatformPlanRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const command = {
      planId: 'plan-pro',
      reason: 'Plano substituido por nova grade comercial.',
    };
    const response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'DELETE',
        body: JSON.stringify(command),
      }),
    );

    expect(response.status).toBe(200);
    expect(service.archivePlan).toHaveBeenCalledWith(context, command);
    expect(await response.json()).toEqual({
      data: { ...plan, status: 'ARCHIVED' },
      requestId: 'request-1',
    });
  });

  it('returns stable errors for unauthenticated and invalid requests', async () => {
    const handlers = createPlatformPlanRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/plans', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );
    expect(response.status).toBe(401);

    const authenticatedHandlers = createPlatformPlanRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    response = await authenticatedHandlers.DELETE(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'DELETE',
        body: JSON.stringify({ planId: 'plan-pro' }),
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

  it('maps duplicate plan codes and archived-plan behavior to public errors', async () => {
    const handlers = createPlatformPlanRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    service.createPlan.mockRejectedValueOnce(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_DUPLICATE_CODE',
        'SaaS plan code already exists.',
      ),
    );
    let response: Response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'POST',
        body: JSON.stringify({
          code: 'pro',
          name: 'Pro Duplicate',
          priceAmountCents: 9900,
          billingInterval: 'MONTHLY',
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ADMIN_DUPLICATE_CODE',
        message: 'Platform admin code already exists.',
        requestId: 'request-1',
      },
    });

    service.archivePlan.mockRejectedValueOnce(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_INVALID_STATUS',
        'Plan is already archived.',
      ),
    );
    response = await handlers.DELETE(
      new Request('https://barberos.local/api/v1/platform/plans', {
        method: 'DELETE',
        body: JSON.stringify({ planId: 'plan-pro', reason: 'Ja arquivado.' }),
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ADMIN_INVALID_STATUS',
        message: 'Platform admin record status does not allow this operation.',
        requestId: 'request-1',
      },
    });
  });
});
