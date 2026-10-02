import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MasterAdminView } from './master-admin-view';
import type { MasterAdminData } from '../lib/master-admin-data';

describe('MasterAdminView', () => {
  it('renders responsive Master Admin sections for platform operations', () => {
    const html = renderToStaticMarkup(<MasterAdminView data={masterData} />);

    expect(html).toContain('data-density="responsive"');
    expect(html).toContain('href="#tenants"');
    expect(html).toContain('href="#invoices"');
    expect(html).toContain('href="#entitlements"');
    expect(html).toContain('href="#support"');
    expect(html).toContain('Barbearia Modelo');
    expect(html).toContain('AI_ASSISTANT');
    expect(html).toContain('BILLING_SUPPORT');
    expect(html).toContain('SUBSCRIPTION_STATUS_CHANGED');
  });

  it('renders loading, empty, error and permission denied states', () => {
    expect(renderToStaticMarkup(<MasterAdminView data={emptyData} state="loading" />)).toContain(
      'Carregando console',
    );
    expect(renderToStaticMarkup(<MasterAdminView data={emptyData} />)).toContain(
      'Nenhum dado operacional encontrado.',
    );
    expect(renderToStaticMarkup(<MasterAdminView data={emptyData} state="error" />)).toContain(
      'Não foi possível carregar',
    );
    expect(
      renderToStaticMarkup(<MasterAdminView data={emptyData} state="permission-denied" />),
    ).toContain('Acesso restrito');
  });
});

const masterData: MasterAdminData = {
  generatedAt: '2026-10-01T12:00:00.000Z',
  tenants: [
    {
      id: 'tenant-1',
      name: 'Barbearia Modelo',
      status: 'ACTIVE',
      branchCount: 2,
      userCount: 5,
      subscriptionStatus: 'ACTIVE',
      planName: 'Pro AI',
      monthlyValueCents: 19900,
    },
  ],
  users: [
    {
      id: 'platform-user-1',
      role: 'PLATFORM_MASTER',
      status: 'ACTIVE',
      scope: 'platform',
    },
  ],
  plans: [
    {
      id: 'plan-pro',
      code: 'pro-ai',
      name: 'Pro AI',
      priceAmountCents: 19900,
      billingInterval: 'MONTHLY',
      status: 'ACTIVE',
    },
  ],
  subscriptions: [
    {
      id: 'subscription-1',
      tenantName: 'Barbearia Modelo',
      planName: 'Pro AI',
      status: 'ACTIVE',
      currentPeriodEnd: '2026-11-01',
      monthlyValueCents: 19900,
    },
  ],
  invoices: [
    {
      id: 'invoice-1',
      tenantName: 'Barbearia Modelo',
      status: 'OPEN',
      amountCents: 19900,
      dueAt: '2026-10-10',
    },
  ],
  aiUsage: [{ tenantName: 'Barbearia Modelo', metric: 'AI_REQUESTS', quantity: 120 }],
  messaging: [],
  incidents: [],
  featureFlags: [],
  entitlements: [
    {
      id: 'tenant-1:ai',
      tenantName: 'Barbearia Modelo',
      entitlement: 'AI_ASSISTANT',
      allowed: true,
      source: 'PLAN',
      limit: 1000,
    },
  ],
  supportScopes: [
    {
      id: 'scope-1',
      tenantName: 'Barbearia Modelo',
      actorUserId: 'platform-user-1',
      purpose: 'Suporte billing',
      operationClass: 'BILLING_SUPPORT',
      status: 'ACTIVE',
      expiresAt: '2026-10-02T18:00:00.000Z',
    },
  ],
  audit: [
    {
      id: 'audit-1',
      tenantName: 'Barbearia Modelo',
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      entityType: 'tenant_subscription',
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  ],
  totals: {
    tenants: 1,
    activeTenants: 1,
    platformUsers: 1,
    mrrCents: 19900,
    openInvoicesCents: 19900,
    aiRequests: 120,
    incidentsOpen: 0,
  },
};

const emptyData: MasterAdminData = {
  generatedAt: '2026-10-01T12:00:00.000Z',
  tenants: [],
  users: [],
  plans: [],
  subscriptions: [],
  invoices: [],
  aiUsage: [],
  messaging: [],
  incidents: [],
  featureFlags: [],
  entitlements: [],
  supportScopes: [],
  audit: [],
  totals: {
    tenants: 0,
    activeTenants: 0,
    platformUsers: 0,
    mrrCents: 0,
    openInvoicesCents: 0,
    aiRequests: 0,
    incidentsOpen: 0,
  },
};
