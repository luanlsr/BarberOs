import type { Entitlement, Permission, SessionContext } from '@barberos/contracts';

type NavigationRole = SessionContext['role'];

export type NavigationItem = {
  href: string;
  label: string;
  icon:
    | 'activity'
    | 'layout'
    | 'calendar'
    | 'receipt'
    | 'users'
    | 'team'
    | 'scissors'
    | 'wallet'
    | 'package'
    | 'boxes'
    | 'building'
    | 'credit-card'
    | 'link'
    | 'megaphone'
    | 'message'
    | 'more'
    | 'palette'
    | 'send'
    | 'shield'
    | 'settings';
  permission: Permission;
  entitlement?: Entitlement;
  entitlements?: readonly Entitlement[];
  roles?: readonly NavigationRole[];
  mobile?: boolean;
  parentHref?: string;
  group?: 'Operação' | 'Gestão' | 'Crescimento' | 'Sistema';
};

export type NavigationTreeItem = NavigationItem & { children: NavigationItem[] };

export type PrimaryActionItem = {
  href: string;
  label: string;
  icon: 'appointment' | 'cash' | 'customer' | 'expense' | 'order' | 'payment' | 'product';
  permission: Permission;
  entitlement?: Entitlement;
  entitlements?: readonly Entitlement[];
  roles?: readonly NavigationRole[];
};

export type MobileNavigationModel = {
  primaryItems: NavigationItem[];
  overflowItems: NavigationItem[];
};

type NavigationFilterOptions = {
  role?: NavigationRole;
};

const tenantOperationRoles = [
  'OWNER',
  'MANAGER',
  'FINANCE',
  'RECEPTIONIST',
  'PROFESSIONAL',
] as const satisfies readonly NavigationRole[];

const sidebarChildlessHrefs = new Set(['/configuracoes']);

export const preferredMobileHrefs = ['/inicio', '/agenda', '/comandas', '/clientes'] as const;

export const navigationItems: NavigationItem[] = [
  {
    href: '/inicio',
    label: 'Visão geral',
    icon: 'layout',
    permission: 'dashboard.read',
    roles: tenantOperationRoles,
    group: 'Operação',
    mobile: true,
  },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: 'calendar',
    permission: 'appointments.read',
    entitlement: 'core.operations',
    roles: tenantOperationRoles,
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/comandas',
    label: 'Comandas',
    icon: 'receipt',
    permission: 'orders.read',
    entitlement: 'core.operations',
    roles: tenantOperationRoles,
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: 'users',
    permission: 'customers.read',
    entitlement: 'core.operations',
    roles: tenantOperationRoles,
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/equipe',
    label: 'Equipe',
    icon: 'team',
    permission: 'professionals.read',
    entitlement: 'core.operations',
    roles: tenantOperationRoles,
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/servicos',
    label: 'Serviços',
    icon: 'scissors',
    permission: 'services.read',
    entitlement: 'core.operations',
    roles: tenantOperationRoles,
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/produtos',
    label: 'Produtos',
    icon: 'package',
    permission: 'inventory.read',
    entitlement: 'inventory',
    roles: ['OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST'],
    group: 'Gestão',
  },
  {
    href: '/estoque',
    label: 'Estoque',
    icon: 'boxes',
    permission: 'inventory.read',
    entitlement: 'inventory',
    roles: ['OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST'],
    mobile: true,
    group: 'Gestão',
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'MANAGER'],
    group: 'Gestão',
  },
  {
    href: '/minha-carteira',
    label: 'Minha carteira',
    icon: 'wallet',
    permission: 'commission.read',
    entitlement: 'finance',
    roles: ['PROFESSIONAL'],
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/caixa',
    label: 'Caixa',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
    roles: ['OWNER', 'FINANCE', 'RECEPTIONIST'],
    mobile: true,
    group: 'Operação',
  },
  {
    href: '/mensagens',
    label: 'Mensagens',
    icon: 'message',
    permission: 'messaging.read',
    entitlement: 'messaging',
    roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    group: 'Crescimento',
  },
  {
    href: '/campanhas',
    label: 'Campanhas',
    icon: 'megaphone',
    permission: 'campaigns.read',
    entitlement: 'campaigns',
    roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    group: 'Crescimento',
  },
  {
    href: '/entregas',
    label: 'Entregas',
    icon: 'send',
    permission: 'notifications.status.read',
    entitlement: 'notifications',
    roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    group: 'Crescimento',
  },
  {
    href: '/master',
    label: 'Master Admin',
    icon: 'layout',
    permission: 'platform.tenants.read',
    roles: ['PLATFORM_MASTER'],
    group: 'Sistema',
  },
  {
    href: '/operacoes/worker',
    label: 'Operações',
    icon: 'activity',
    permission: 'worker.failures.read',
    entitlement: 'worker.operations',
    roles: ['PLATFORM_MASTER', 'PLATFORM_SUPPORT'],
    group: 'Sistema',
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: 'settings',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER'],
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

export function buildSidebarNavigationTree(items: readonly NavigationItem[]): NavigationTreeItem[] {
  const parents = items.filter((item) => !item.parentHref);
  return parents.map((item) => ({
    ...item,
    children: sidebarChildlessHrefs.has(item.href)
      ? []
      : items.filter((candidate) => candidate.parentHref === item.href),
  }));
}

export function buildMobileNavigationItems(
  items: readonly NavigationItem[],
  preferredHrefs: readonly string[] = preferredMobileHrefs,
): MobileNavigationModel {
  const mobileCandidates = items.filter((item) => item.mobile);
  const preferredItems = preferredHrefs
    .map((href) => mobileCandidates.find((item) => item.href === href))
    .filter((item): item is NavigationItem => Boolean(item));
  const fallbackItems = mobileCandidates.filter(
    (item) => !preferredItems.some((preferredItem) => preferredItem.href === item.href),
  );
  const primaryItems = [...preferredItems, ...fallbackItems].slice(0, 3);
  const overflowItems = items.filter(
    (item) => !primaryItems.some((primaryItem) => primaryItem.href === item.href),
  );

  return { primaryItems, overflowItems };
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
