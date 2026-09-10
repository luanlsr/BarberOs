import { describe, expect, it } from 'vitest';
import {
  buildReceivePaymentAction,
  filterNavigation,
  filterPrimaryActions,
  navigationItems,
  primaryActionItems,
} from './navigation';

describe('filterNavigation', () => {
  it('keeps only areas allowed by permissions and entitlements', () => {
    const visible = filterNavigation(
      navigationItems,
      [
        'dashboard.read',
        'appointments.read',
        'customers.read',
        'professionals.read',
        'services.read',
      ],
      ['core.operations'],
    );

    expect(visible.map((item) => item.href)).toEqual([
      '/',
      '/agenda',
      '/clientes',
      '/equipe',
      '/servicos',
    ]);
  });

  it('does not infer access from permission when entitlement is missing', () => {
    const visible = filterNavigation(navigationItems, ['appointments.read', 'customers.read'], []);
    expect(visible).toEqual([]);
  });

  it('does not infer access from the tenant identifier', () => {
    const visible = filterNavigation(navigationItems, [], ['core.operations']);
    expect(visible).toEqual([]);
  });

  it('exposes Caixa only to finance-enabled roles', () => {
    const owner = filterNavigation(
      navigationItems,
      ['dashboard.read', 'finance.read'],
      ['core.operations', 'finance'],
    );
    const finance = filterNavigation(
      navigationItems,
      ['finance.read'],
      ['core.operations', 'finance'],
    );
    const receptionist = filterNavigation(
      navigationItems,
      ['orders.read', 'payments.receive'],
      ['core.operations'],
    );
    const professional = filterNavigation(
      navigationItems,
      ['appointments.read', 'orders.read'],
      ['core.operations'],
    );

    expect(owner.map((item) => item.href)).toContain('/caixa');
    expect(finance.map((item) => item.href)).toEqual(['/financeiro', '/caixa']);
    expect(receptionist.map((item) => item.href)).not.toContain('/caixa');
    expect(professional.map((item) => item.href)).not.toContain('/caixa');
  });
});

describe('filterPrimaryActions', () => {
  it('shows new appointment, Comanda, customer and cash actions only when allowed', () => {
    const visible = filterPrimaryActions(
      primaryActionItems,
      ['appointments.create', 'orders.create', 'customers.create', 'cash.open'],
      ['core.operations', 'finance'],
    );

    expect(visible.map((item) => item.href)).toEqual([
      '/comandas?mode=walk-in#nova-comanda',
      '/agenda?mode=new',
      '/clientes?mode=new',
      '/caixa?mode=open',
    ]);
  });

  it('hides create actions without their required entitlements', () => {
    const visible = filterPrimaryActions(
      primaryActionItems,
      ['appointments.create', 'orders.create', 'customers.create', 'cash.open'],
      [],
    );
    expect(visible).toEqual([]);
  });

  it('separates cash and payment actions by role', () => {
    const finance = filterPrimaryActions(
      primaryActionItems,
      ['cash.open', 'payments.receive'],
      ['core.operations', 'finance'],
    );
    const receptionist = filterPrimaryActions(
      primaryActionItems,
      ['orders.create', 'payments.receive'],
      ['core.operations'],
    );
    const professional = filterPrimaryActions(
      primaryActionItems,
      ['orders.read'],
      ['core.operations'],
    );

    expect(finance.map((item) => item.href)).toEqual(['/caixa?mode=open']);
    expect(receptionist.map((item) => item.href)).toEqual(['/comandas?mode=walk-in#nova-comanda']);
    expect(professional).toEqual([]);
  });
});

describe('buildReceivePaymentAction', () => {
  it('returns a contextual payment action only when the Comanda can receive payment', () => {
    const action = buildReceivePaymentAction('order-1', {
      canReceivePayment: true,
      permissions: ['payments.receive'],
      entitlements: ['core.operations'],
    });

    expect(action).toMatchObject({
      href: '/comandas?orderId=order-1#receber-pagamento',
      label: 'Receber',
      icon: 'payment',
      permission: 'payments.receive',
      entitlement: 'core.operations',
    });
  });

  it('hides payment action for blocked state, missing permission or missing entitlement', () => {
    expect(
      buildReceivePaymentAction('order-1', {
        canReceivePayment: false,
        permissions: ['payments.receive'],
        entitlements: ['core.operations'],
      }),
    ).toBeNull();
    expect(
      buildReceivePaymentAction('order-1', {
        canReceivePayment: true,
        permissions: [],
        entitlements: ['core.operations'],
      }),
    ).toBeNull();
    expect(
      buildReceivePaymentAction('order-1', {
        canReceivePayment: true,
        permissions: ['payments.receive'],
        entitlements: [],
      }),
    ).toBeNull();
  });
});
