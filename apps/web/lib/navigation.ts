import type { Entitlement, Permission, SessionContext } from '@barberos/contracts';

type NavigationRole = SessionContext['role'];

export type NavigationItem = {
  href: string;
  label: string;
  icon:
    | 'layout'
    | 'calendar'
    | 'receipt'
    | 'users'
    | 'team'
    | 'scissors'
    | 'wallet'
    | 'package'
    | 'boxes'
    | 'more';
  permission: Permission;
  entitlement?: Entitlement;
  entitlements?: readonly Entitlement[];
  roles?: readonly NavigationRole[];
  mobile?: boolean;
  parentHref?: string;
  group?: 'Operacao' | 'Gestao' | 'Sistema';
};

export type PrimaryActionItem = {
  href: string;
  label: string;
  icon: 'appointment' | 'cash' | 'customer' | 'expense' | 'order' | 'payment' | 'product';
  permission: Permission;
  entitlement?: Entitlement;
  entitlements?: readonly Entitlement[];
  roles?: readonly NavigationRole[];
};

type NavigationFilterOptions = {
  role?: NavigationRole;
};

export const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Visao geral',
    icon: 'layout',
    permission: 'dashboard.read',
    group: 'Operacao',
    mobile: true,
  },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: 'calendar',
    permission: 'appointments.read',
    entitlement: 'core.operations',
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/comandas',
    label: 'Comandas',
    icon: 'receipt',
    permission: 'orders.read',
    entitlement: 'core.operations',
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: 'users',
    permission: 'customers.read',
    entitlement: 'core.operations',
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/equipe',
    label: 'Equipe',
    icon: 'team',
    permission: 'professionals.read',
    entitlement: 'core.operations',
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/servicos',
    label: 'Servicos',
    icon: 'scissors',
    permission: 'services.read',
    entitlement: 'core.operations',
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/produtos',
    label: 'Produtos',
    icon: 'package',
    permission: 'inventory.read',
    entitlement: 'inventory',
    roles: ['OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST'],
    group: 'Gestao',
  },
  {
    href: '/estoque',
    label: 'Estoque',
    icon: 'boxes',
    permission: 'inventory.read',
    entitlement: 'inventory',
    roles: ['OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST'],
    mobile: true,
    group: 'Gestao',
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'MANAGER'],
    group: 'Gestao',
  },
  {
    href: '/financeiro/despesas',
    label: 'Despesas',
    icon: 'receipt',
    parentHref: '/financeiro',
    permission: 'finance.read',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'MANAGER'],
    group: 'Gestao',
  },
  {
    href: '/financeiro/comissoes',
    label: 'Comissoes/Repasses',
    icon: 'wallet',
    parentHref: '/financeiro',
    permission: 'commission.manage',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE'],
    group: 'Gestao',
  },
  {
    href: '/minha-carteira',
    label: 'Minha carteira',
    icon: 'wallet',
    permission: 'commission.read',
    entitlement: 'finance',
    roles: ['PROFESSIONAL'],
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/caixa',
    label: 'Caixa',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'RECEPTIONIST'],
    mobile: true,
    group: 'Operacao',
  },
  {
    href: '/operacoes/falhas',
    label: 'Falhas operacionais',
    icon: 'boxes',
    permission: 'worker.failures.read',
    entitlement: 'worker.operations',
    roles: ['OWNER', 'MANAGER'],
    group: 'Sistema',
  },
  {
    href: '/configuracoes',
    label: 'Mais',
    icon: 'more',
    permission: 'settings.read',
    group: 'Sistema',
  },
];

export const primaryActionItems: PrimaryActionItem[] = [
  {
    href: '/comandas?mode=walk-in#nova-comanda',
    label: 'Comanda',
    icon: 'order',
    permission: 'orders.create',
    entitlement: 'core.operations',
  },
  {
    href: '/agenda?mode=new',
    label: 'Agendamento',
    icon: 'appointment',
    permission: 'appointments.create',
    entitlement: 'core.operations',
  },
  {
    href: '/clientes?mode=new',
    label: 'Cliente',
    icon: 'customer',
    permission: 'customers.create',
    entitlement: 'core.operations',
  },
  {
    href: '/venda-produto',
    label: 'Venda produto',
    icon: 'product',
    permission: 'orders.item.add',
    entitlements: ['core.operations', 'inventory'],
    roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
  },
  {
    href: '/financeiro/despesas?mode=new',
    label: 'Despesa',
    icon: 'expense',
    permission: 'finance.write',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'MANAGER'],
  },
  {
    href: '/caixa?mode=open',
    label: 'Abrir caixa',
    icon: 'cash',
    permission: 'cash.open',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'RECEPTIONIST'],
  },
];

export function filterNavigation(
  items: NavigationItem[],
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[] = [],
  options: NavigationFilterOptions = {},
) {
  return items.filter((item) => canAccess(item, permissions, entitlements, options));
}

export function filterPrimaryActions(
  items: PrimaryActionItem[],
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[] = [],
  options: NavigationFilterOptions = {},
) {
  return items.filter((item) => canAccess(item, permissions, entitlements, options));
}

export function buildReceivePaymentAction(
  orderId: string,
  options: {
    canReceivePayment: boolean;
    permissions: readonly Permission[];
    entitlements?: readonly Entitlement[];
    role?: NavigationRole;
  },
): PrimaryActionItem | null {
  const action: PrimaryActionItem = {
    href: '/comandas?orderId=' + encodeURIComponent(orderId) + '#receber-pagamento',
    label: 'Receber',
    icon: 'payment',
    permission: 'payments.receive',
    entitlement: 'core.operations',
  };

  return options.canReceivePayment &&
    canAccess(action, options.permissions, options.entitlements ?? [], { role: options.role })
    ? action
    : null;
}

function canAccess(
  item: {
    permission: Permission;
    entitlement?: Entitlement;
    entitlements?: readonly Entitlement[];
    roles?: readonly NavigationRole[];
  },
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[],
  options: NavigationFilterOptions,
) {
  const requiredEntitlements = [
    ...(item.entitlement ? [item.entitlement] : []),
    ...(item.entitlements ?? []),
  ];
  return (
    permissions.includes(item.permission) &&
    requiredEntitlements.every((entitlement) => entitlements.includes(entitlement)) &&
    (!item.roles || !options.role || item.roles.includes(options.role))
  );
}
