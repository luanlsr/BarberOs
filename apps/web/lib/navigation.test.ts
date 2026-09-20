import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import {
  buildReceivePaymentAction,
  filterNavigation,
  filterPrimaryActions,
  navigationItems,
  primaryActionItems,
} from './navigation';

type Role = SessionContext['role'];

function navFor(
  role: Role,
  permissions: Parameters<typeof filterNavigation>[1],
  entitlements: Parameters<typeof filterNavigation>[2] = [],
) {
  return filterNavigation(navigationItems, permissions, entitlements, { role }).map(
    (item) => item.href,
  );
}

function actionsFor(
  role: Role,
  permissions: Parameters<typeof filterPrimaryActions>[1],
  entitlements: Parameters<typeof filterPrimaryActions>[2] = [],
) {
  return filterPrimaryActions(primaryActionItems, permissions, entitlements, { role }).map(
    (item) => item.href,
  );
}

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

  it('exposes inventory areas for allowed owner, manager, finance and receptionist roles', () => {
    const permissions = ['inventory.read'] as const;
    const entitlements = ['inventory'] as const;

    expect(navFor('OWNER', permissions, entitlements)).toEqual(['/produtos', '/estoque']);
    expect(navFor('MANAGER', permissions, entitlements)).toEqual(['/produtos', '/estoque']);
    expect(navFor('FINANCE', permissions, entitlements)).toEqual(['/produtos', '/estoque']);
    expect(navFor('RECEPTIONIST', permissions, entitlements)).toEqual(['/produtos', '/estoque']);
    expect(navFor('PROFESSIONAL', permissions, entitlements)).toEqual([]);
  });

  it('hides inventory areas when permission or entitlement is missing', () => {
    expect(navFor('OWNER', ['inventory.read'], [])).toEqual([]);
    expect(navFor('OWNER', [], ['inventory'])).toEqual([]);
  });

  it('exposes finance areas for owner, finance and manager roles by permission', () => {
    const owner = navFor(
      'OWNER',
      ['dashboard.read', 'finance.read', 'commission.manage'],
      ['core.operations', 'finance'],
    );
    const finance = navFor(
      'FINANCE',
      ['finance.read', 'finance.write', 'commission.manage'],
      ['core.operations', 'finance'],
    );
    const manager = navFor('MANAGER', ['finance.read', 'finance.write'], ['finance']);

    expect(owner).toEqual([
      '/',
      '/financeiro',
      '/financeiro/despesas',
      '/financeiro/comissoes',
      '/caixa',
    ]);
    expect(finance).toEqual([
      '/financeiro',
      '/financeiro/despesas',
      '/financeiro/comissoes',
      '/caixa',
    ]);
    expect(manager).toEqual(['/financeiro', '/financeiro/despesas']);
  });

  it('keeps receptionists and professionals out of tenant-wide finance', () => {
    const receptionist = navFor(
      'RECEPTIONIST',
      ['orders.read', 'payments.receive', 'finance.read'],
      ['core.operations'],
    );
    const professional = navFor(
      'PROFESSIONAL',
      ['appointments.read', 'orders.read', 'commission.read', 'finance.read'],
      ['core.operations', 'finance'],
    );

    expect(receptionist).toEqual(['/comandas']);
    expect(professional).toEqual(['/agenda', '/comandas', '/minha-carteira']);
    expect(professional).not.toContain('/financeiro');
    expect(professional).not.toContain('/financeiro/comissoes');
  });

  it('exposes operational failures only to authorized owner and manager roles', () => {
    const permissions = ['worker.failures.read'] as const;
    const entitlements = ['worker.operations'] as const;

    expect(navFor('OWNER', permissions, entitlements)).toEqual(['/operacoes/falhas']);
    expect(navFor('MANAGER', permissions, entitlements)).toEqual(['/operacoes/falhas']);
    expect(navFor('RECEPTIONIST', permissions, entitlements)).toEqual([]);
    expect(navFor('PROFESSIONAL', permissions, entitlements)).toEqual([]);
    expect(navFor('OWNER', [], entitlements)).toEqual([]);
    expect(navFor('OWNER', permissions, [])).toEqual([]);
  });
  it('exposes professional wallet only to professional role with commission read entitlement', () => {
    const professional = navFor('PROFESSIONAL', ['commission.read'], ['finance']);
    const owner = navFor('OWNER', ['commission.read'], ['finance']);

    expect(professional).toEqual(['/minha-carteira']);
    expect(owner).toEqual([]);
  });
});
it('models expenses and commissions as Financeiro submenus', () => {
  expect(
    navigationItems.filter((item) => item.parentHref === '/financeiro').map((item) => item.href),
  ).toEqual(['/financeiro/despesas', '/financeiro/comissoes']);
});

describe('filterPrimaryActions', () => {
  it('shows new appointment, Comanda, customer, product sale, expense and cash actions only when allowed', () => {
    const visible = filterPrimaryActions(
      primaryActionItems,
      [
        'appointments.create',
        'orders.create',
        'orders.item.add',
        'customers.create',
        'finance.write',
        'cash.open',
      ],
      ['core.operations', 'inventory', 'finance'],
      { role: 'OWNER' },
    );

    expect(visible.map((item) => item.href)).toEqual([
      '/comandas?mode=walk-in#nova-comanda',
      '/agenda?mode=new',
      '/clientes?mode=new',
      '/venda-produto',
      '/financeiro/despesas?mode=new',
      '/caixa?mode=open',
    ]);
  });

  it('hides create actions without their required entitlements', () => {
    const visible = filterPrimaryActions(
      primaryActionItems,
      [
        'appointments.create',
        'orders.create',
        'orders.item.add',
        'customers.create',
        'finance.write',
        'cash.open',
      ],
      [],
      { role: 'OWNER' },
    );
    expect(visible).toEqual([]);
  });

  it('requires both operations and inventory entitlements for product sale action', () => {
    const permissions = ['orders.item.add'] as const;

    expect(actionsFor('OWNER', permissions, ['core.operations'])).toEqual([]);
    expect(actionsFor('OWNER', permissions, ['inventory'])).toEqual([]);
    expect(actionsFor('OWNER', permissions, ['core.operations', 'inventory'])).toEqual([
      '/venda-produto',
    ]);
  });

  it('separates product sale, expense, cash and operational actions by role', () => {
    const finance = actionsFor(
      'FINANCE',
      ['orders.item.add', 'finance.write', 'cash.open', 'payments.receive'],
      ['core.operations', 'inventory', 'finance'],
    );
    const manager = actionsFor(
      'MANAGER',
      ['orders.item.add', 'finance.write', 'cash.open'],
      ['core.operations', 'inventory', 'finance'],
    );
    const receptionist = actionsFor(
      'RECEPTIONIST',
      ['orders.create', 'orders.item.add', 'payments.receive', 'cash.open', 'finance.write'],
      ['core.operations', 'inventory', 'finance'],
    );
    const professional = actionsFor(
      'PROFESSIONAL',
      ['orders.item.add', 'orders.read', 'commission.read'],
      ['core.operations', 'inventory', 'finance'],
    );

    expect(finance).toEqual(['/financeiro/despesas?mode=new', '/caixa?mode=open']);
    expect(manager).toEqual(['/venda-produto', '/financeiro/despesas?mode=new']);
    expect(receptionist).toEqual([
      '/comandas?mode=walk-in#nova-comanda',
      '/venda-produto',
      '/caixa?mode=open',
    ]);
    expect(professional).toEqual([]);
  });
});

describe('buildReceivePaymentAction', () => {
  it('returns a contextual payment action only when the Comanda can receive payment', () => {
    const action = buildReceivePaymentAction('order-1', {
      canReceivePayment: true,
      permissions: ['payments.receive'],
      entitlements: ['core.operations'],
      role: 'RECEPTIONIST',
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
