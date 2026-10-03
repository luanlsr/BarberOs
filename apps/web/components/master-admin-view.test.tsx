import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MasterAdminView } from './master-admin-view';
import type { MasterAdminData } from '../lib/master-admin-data';

type RenderResult = { container: HTMLDivElement; root: Root };

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  return { container, root };
}

function clickButton(container: HTMLElement, label: string) {
  const button = findButton(container, label);
  flushSync(() => button.click());
  return button;
}

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.textContent?.includes(label) || item.getAttribute('aria-label')?.includes(label),
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function fillReason(container: HTMLElement, value: string) {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
  expect(textarea).toBeTruthy();
  flushSync(() => {
    if (!textarea) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function fillLabeledControl(container: HTMLElement, labelText: string, value: string) {
  const label = Array.from(container.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    item.textContent?.includes(labelText),
  );
  expect(label).toBeTruthy();
  const control = label?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select',
  );
  expect(control).toBeTruthy();
  flushSync(() => {
    if (!control) return;
    const prototype =
      control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : control instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function setLabeledCheckbox(container: HTMLElement, labelText: string, checked: boolean) {
  const label = Array.from(container.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    item.textContent?.includes(labelText),
  );
  expect(label).toBeTruthy();
  const control = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(control).toBeTruthy();
  flushSync(() => {
    if (!control) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    setter?.call(control, checked);
    control.dispatchEvent(new Event('click', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  flushSync(() => {});
}

describe('MasterAdminView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('renders responsive Master Admin sections for platform operations', () => {
    const html = renderToStaticMarkup(<MasterAdminView data={masterData} />);

    expect(html).toContain('data-density="responsive"');
    expect(html).toContain('href="#tenants"');
    expect(html).toContain('href="#invoices"');
    expect(html).toContain('href="#entitlements"');
    expect(html).toContain('href="#support"');
    expect(html).toContain('Barbearia Modelo');
    expect(html).toContain('ai');
    expect(html).toContain('BILLING_SUPPORT');
    expect(html).toContain('SUBSCRIPTION_STATUS_CHANGED');
  });

  it('renders billing detail totals and tenant tags for subscription states', () => {
    const html = renderToStaticMarkup(<MasterAdminView data={masterData} />);

    expect(html).toContain('ACTIVE');
    expect(html).toContain('TRIALING');
    expect(html).toContain('PAST DUE');
    expect(html).toContain('CANCELLED');
    expect(html).toContain('Open invoices');
    expect(html).toContain('OVERDUE');
    expect(html).toContain('Barbearia Modelo');
    expect(html).toContain('Rede Navalha');
  });

  it('filters support scopes and audit entries while showing expired and redacted labels', async () => {
    const { container } = render(<MasterAdminView data={masterData} />);

    expect(container.textContent).toContain('Expirado');
    expect(container.textContent).toContain('Metadata redigida');

    fillLabeledControl(container, 'Buscar suporte', 'expired');
    await settle();
    const supportList = container.querySelector('#support .master-list');
    expect(supportList?.textContent).toContain('PRIVATE_OPERATIONAL_READ');
    expect(supportList?.textContent).not.toContain('BILLING_SUPPORT · expira');

    fillLabeledControl(container, 'Ação', 'SUPPORT_SCOPE_DENIED');
    await settle();
    const auditList = container.querySelector('#audit .master-list');
    expect(auditList?.textContent).toContain('SUPPORT_SCOPE_DENIED');
    expect(auditList?.textContent).not.toContain('SUBSCRIPTION_STATUS_CHANGED');
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

  it('opens and closes tenant lifecycle modal from outside click', () => {
    const { container } = render(<MasterAdminView data={masterData} />);

    clickButton(container, 'Restringir');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Restringir tenant');

    const backdrop = container.querySelector<HTMLElement>('.master-modal-backdrop');
    expect(backdrop).toBeTruthy();
    flushSync(() => backdrop?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps confirmation disabled until reason is valid and shows success feedback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            tenantId: 'tenant-1',
            tenantName: 'Barbearia Modelo',
            lifecycleStatus: 'SUSPENDED',
            branchCount: 2,
            userCount: 5,
            planName: 'Pro AI',
            subscriptionStatus: 'ACTIVE',
          },
        }),
      })),
    );
    const { container } = render(<MasterAdminView data={masterData} />);

    clickButton(container, 'Suspender');
    expect(findButton(container, 'Confirmar').disabled).toBe(true);

    fillReason(container, 'Inadimplência confirmada pelo financeiro.');
    await settle();
    expect(findButton(container, 'Confirmar').disabled).toBe(false);
    clickButton(container, 'Confirmar');
    await settle();

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/platform/tenants?action=SUSPEND',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          action: 'SUSPEND',
          reason: 'Inadimplência confirmada pelo financeiro.',
        }),
      }),
    );
    expect(container.textContent).toContain('SUSPENDED');
    expect(container.textContent).toContain('Ação aplicada com sucesso.');
  });

  it('shows lifecycle action errors without closing the modal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: { message: 'Platform access is required.' } }),
      })),
    );
    const { container } = render(<MasterAdminView data={masterData} />);

    clickButton(container, 'Reativar');
    fillReason(container, 'Regularização confirmada.');
    await settle();
    clickButton(container, 'Confirmar');
    await settle();

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.textContent).toContain('Platform access is required.');
  });

  it('validates plan form limits and sends plan entitlements to the platform API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            id: 'plan-scale',
            code: 'scale',
            name: 'Scale',
            priceAmountCents: 39900,
            billingInterval: 'MONTHLY',
            status: 'ACTIVE',
          },
        }),
      })),
    );
    const { container } = render(<MasterAdminView data={masterData} />);

    clickButton(container, 'Novo plano');
    expect(findButton(container, 'Salvar').disabled).toBe(true);

    fillLabeledControl(container, 'Código', 'scale');
    fillLabeledControl(container, 'Nome', 'Scale');
    fillLabeledControl(container, 'Preço mensal', '399');
    fillLabeledControl(container, 'Entitlement', 'ai');
    fillLabeledControl(container, 'Limite', '-1');
    await settle();
    expect(findButton(container, 'Salvar').disabled).toBe(true);

    fillLabeledControl(container, 'Limite', '2500');
    await settle();
    expect(findButton(container, 'Salvar').disabled).toBe(false);
    clickButton(container, 'Salvar');
    await settle();

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/platform/plans',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'scale',
          name: 'Scale',
          priceAmountCents: 39900,
          billingInterval: 'MONTHLY',
          status: 'ACTIVE',
          entitlements: [{ entitlement: 'ai', enabled: true, limit: 2500 }],
        }),
      }),
    );
    expect(container.textContent).toContain('Scale');
    expect(container.textContent).toContain('Plano salvo com sucesso.');
  });

  it('disables archive action for archived plans and applies entitlement overrides', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            tenantId: 'tenant-1',
            entitlement: 'ai',
            allowed: false,
            source: 'OVERRIDE',
            limit: 50,
            reason: 'Exceção comercial encerrada.',
          },
        }),
      })),
    );
    const { container } = render(<MasterAdminView data={masterData} />);
    const archiveButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).filter((button) => button.textContent?.includes('Arquivar'));
    expect(archiveButtons.some((button) => button.disabled)).toBe(true);

    clickButton(container, 'Override');
    setLabeledCheckbox(container, 'Permitir entitlement', false);
    fillLabeledControl(container, 'Limite', '50');
    fillLabeledControl(container, 'Motivo', 'Exceção comercial encerrada.');
    await settle();
    expect(findButton(container, 'Aplicar override').disabled).toBe(false);
    clickButton(container, 'Aplicar override');
    await settle();

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/platform/entitlements',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          entitlement: 'ai',
          enabled: false,
          limit: 50,
          reason: 'Exceção comercial encerrada.',
        }),
      }),
    );
    expect(container.textContent).toContain('OVERRIDE');
    expect(container.textContent).toContain('Override aplicado com sucesso.');
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
    {
      id: 'plan-archived',
      code: 'legacy',
      name: 'Legacy',
      priceAmountCents: 9900,
      billingInterval: 'MONTHLY',
      status: 'ARCHIVED',
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
    {
      id: 'subscription-2',
      tenantName: 'Barbearia Premium',
      planName: 'Pro AI',
      status: 'TRIALING',
      currentPeriodEnd: '2026-11-10',
      monthlyValueCents: 19900,
    },
    {
      id: 'subscription-3',
      tenantName: 'Rede Navalha',
      planName: 'Legacy',
      status: 'PAST_DUE',
      currentPeriodEnd: '2026-10-15',
      monthlyValueCents: 9900,
    },
    {
      id: 'subscription-4',
      tenantName: 'Barba Sul',
      planName: 'Legacy',
      status: 'CANCELLED',
      currentPeriodEnd: '2026-10-01',
      monthlyValueCents: 9900,
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
    {
      id: 'invoice-2',
      tenantName: 'Barbearia Modelo',
      status: 'PAID',
      amountCents: 19900,
      paidAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'invoice-3',
      tenantName: 'Rede Navalha',
      status: 'OVERDUE',
      amountCents: 9900,
      dueAt: '2026-09-25',
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
      entitlement: 'ai',
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
    {
      id: 'scope-2',
      tenantName: 'Rede Navalha',
      actorUserId: 'platform-user-1',
      purpose: 'Escopo expirado para auditoria',
      operationClass: 'PRIVATE_OPERATIONAL_READ',
      status: 'EXPIRED',
      expiresAt: '2026-09-28T18:00:00.000Z',
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
    {
      id: 'audit-2',
      tenantName: 'Rede Navalha',
      action: 'SUPPORT_SCOPE_DENIED',
      entityType: 'support_scope',
      createdAt: '2026-10-01T13:00:00.000Z',
      metadata: { token: '[redacted]' },
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
