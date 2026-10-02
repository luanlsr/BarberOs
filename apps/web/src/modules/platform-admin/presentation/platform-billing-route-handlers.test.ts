import type { BillingInvoiceSummary, TenantSubscription } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAuthorizationError } from '../application/platform-authorization';
import type { PlatformRequestContext } from '../domain';
import {
  createPlatformInvoiceRouteHandlers,
  createPlatformSubscriptionRouteHandlers,
  type SubscriptionRouteResult,
  type PlatformInvoiceRouteService,
  type PlatformSubscriptionRouteService,
} from './platform-billing-route-handlers';

const platformContext: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.billing.read', 'platform.billing.manage'],
};

const tenantContext: PlatformRequestContext = {
  requestId: 'request-tenant',
  userId: 'tenant-user-1',
  role: 'OWNER',
  permissions: ['platform.billing.read'],
};

const subscription: TenantSubscription = {
  id: 'subscription-active',
  tenantId: 'tenant-1',
  planId: 'plan-pro',
  provider: 'ASAAS',
  externalReference: 'asaas-subscription-1',
  status: 'ACTIVE',
  currentPeriodStart: '2026-10-01',
  currentPeriodEnd: '2026-11-01',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const invoice: BillingInvoiceSummary = {
  id: 'invoice-1',
  tenantId: 'tenant-1',
  subscriptionId: 'subscription-active',
  provider: 'ASAAS',
  externalReference: 'invoice-external-1',
  status: 'OPEN',
  amountCents: 9900,
  dueDate: '2026-10-10',
  createdAt: '2026-10-01T12:00:00.000Z',
};

type MockSubscriptionService = PlatformSubscriptionRouteService & {
  listSubscriptions: ReturnType<typeof vi.fn>;
  assignSubscription: ReturnType<typeof vi.fn>;
  updateSubscriptionStatus: ReturnType<typeof vi.fn>;
};

type MockInvoiceService = PlatformInvoiceRouteService & {
  listInvoices: ReturnType<typeof vi.fn>;
};

describe('platform billing route handlers', () => {
  let subscriptionService: MockSubscriptionService;
  let invoiceService: MockInvoiceService;

  beforeEach(() => {
    subscriptionService = {
      listSubscriptions: vi.fn(async () => [{ subscription, restrictsTenantAccess: false }]),
      assignSubscription: vi.fn(async (): Promise<TenantSubscription> => ({
        ...subscription,
        id: 'subscription-assigned',
      })),
      updateSubscriptionStatus: vi.fn(async (): Promise<SubscriptionRouteResult> => ({
        subscription: { ...subscription, status: 'PAST_DUE' },
        restrictsTenantAccess: true,
      })),
    };
    invoiceService = {
      listInvoices: vi.fn(async () => [invoice]),
    };
  });

  it('lists subscriptions, assigns subscriptions and updates subscription status', async () => {
    const handlers = createPlatformSubscriptionRouteHandlers({
      resolveContext: vi.fn(async () => platformContext),
      service: subscriptionService,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/subscriptions'),
    );
    expect(response.status).toBe(200);
    expect(subscriptionService.listSubscriptions).toHaveBeenCalledWith(platformContext);
    expect(await response.json()).toEqual({
      data: [{ subscription, restrictsTenantAccess: false }],
      requestId: 'request-1',
    });

    const assignCommand = {
      tenantId: 'tenant-1',
      planId: 'plan-pro',
      provider: 'ASAAS',
      externalReference: 'asaas-subscription-1',
      status: 'ACTIVE',
      currentPeriodStart: '2026-10-01',
      currentPeriodEnd: '2026-11-01',
      reason: 'Checkout pago.',
    };
    response = await handlers.POST(
      new Request('https://barberos.local/api/v1/platform/subscriptions', {
        method: 'POST',
        body: JSON.stringify(assignCommand),
      }),
    );
    expect(response.status).toBe(201);
    expect(subscriptionService.assignSubscription).toHaveBeenCalledWith(
      platformContext,
      assignCommand,
    );

    const statusCommand = {
      subscriptionId: 'subscription-active',
      status: 'PAST_DUE',
      reason: 'Invoice vencida.',
    };
    response = await handlers.PATCH(
      new Request('https://barberos.local/api/v1/platform/subscriptions', {
        method: 'PATCH',
        body: JSON.stringify(statusCommand),
      }),
    );
    expect(response.status).toBe(200);
    expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
      platformContext,
      statusCommand,
    );
  });

  it('lists invoice summaries without provider secrets', async () => {
    const handlers = createPlatformInvoiceRouteHandlers({
      resolveContext: vi.fn(async () => platformContext),
      service: invoiceService,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/invoices'),
    );

    expect(response.status).toBe(200);
    expect(invoiceService.listInvoices).toHaveBeenCalledWith(platformContext);
    expect(await response.json()).toEqual({ data: [invoice], requestId: 'request-1' });
  });

  it('returns stable errors for missing auth and validation failures', async () => {
    const handlers = createPlatformSubscriptionRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service: subscriptionService,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/subscriptions', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );
    expect(response.status).toBe(401);

    const authenticatedHandlers = createPlatformSubscriptionRouteHandlers({
      resolveContext: vi.fn(async () => platformContext),
      service: subscriptionService,
    });
    response = await authenticatedHandlers.PATCH(
      new Request('https://barberos.local/api/v1/platform/subscriptions', {
        method: 'PATCH',
        body: JSON.stringify({ subscriptionId: 'subscription-active' }),
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

  it('keeps billing APIs platform-only', async () => {
    subscriptionService.listSubscriptions.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    const subscriptionHandlers = createPlatformSubscriptionRouteHandlers({
      resolveContext: vi.fn(async () => tenantContext),
      service: subscriptionService,
    });

    let response: Response = await subscriptionHandlers.GET(
      new Request('https://barberos.local/api/v1/platform/subscriptions'),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'PLATFORM_ACCESS_DENIED',
        message: 'Platform access is required.',
        requestId: 'request-tenant',
      },
    });

    invoiceService.listInvoices.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    const invoiceHandlers = createPlatformInvoiceRouteHandlers({
      resolveContext: vi.fn(async () => tenantContext),
      service: invoiceService,
    });

    response = await invoiceHandlers.GET(
      new Request('https://barberos.local/api/v1/platform/invoices'),
    );
    expect(response.status).toBe(403);
  });
});
