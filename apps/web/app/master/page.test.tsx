import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MasterAdminPage from './page';

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getMasterAdminData: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('../../lib/auth/server', () => ({
  getSessionContext: mocks.getSessionContext,
}));

vi.mock('../../lib/master-admin-data', () => ({
  getMasterAdminData: mocks.getMasterAdminData,
}));

const platformSession = {
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: [
    'platform.tenants.read',
    'platform.plans.manage',
    'platform.billing.read',
    'platform.audit.read',
  ],
};

const masterData = {
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
      id: 'platform-membership-1',
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
  invoices: [],
  aiUsage: [],
  messaging: [],
  incidents: [],
  featureFlags: [],
  entitlements: [],
  supportScopes: [],
  audit: [],
  totals: {
    tenants: 1,
    activeTenants: 1,
    platformUsers: 1,
    mrrCents: 19900,
    openInvoicesCents: 0,
    aiRequests: 0,
    incidentsOpen: 0,
  },
};

describe('MasterAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionContext.mockResolvedValue(platformSession);
    mocks.getMasterAdminData.mockResolvedValue(masterData);
  });

  it('renders the Master Admin console for a platform master using the platform data service', async () => {
    const element = await MasterAdminPage();
    const html = renderToStaticMarkup(element);

    expect(mocks.getMasterAdminData).toHaveBeenCalledWith(platformSession);
    expect(html).toContain('Super Admin BarberOS');
    expect(html).toContain('Barbearia Modelo');
    expect(html).toContain('Pro AI');
  });

  it('redirects tenant users away from the Master Admin console', async () => {
    mocks.getSessionContext.mockResolvedValueOnce({
      ...platformSession,
      role: 'OWNER',
      permissions: ['settings.read'],
    });

    await expect(MasterAdminPage()).rejects.toThrow('NEXT_REDIRECT:/forbidden');
    expect(mocks.getMasterAdminData).not.toHaveBeenCalled();
  });

  it('redirects platform users without platform tenant permission', async () => {
    mocks.getSessionContext.mockResolvedValueOnce({
      ...platformSession,
      permissions: ['audit.read'],
    });

    await expect(MasterAdminPage()).rejects.toThrow('NEXT_REDIRECT:/forbidden');
    expect(mocks.getMasterAdminData).not.toHaveBeenCalled();
  });
});
