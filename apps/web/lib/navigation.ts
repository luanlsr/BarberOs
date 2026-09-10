import type { Entitlement, Permission } from '@barberos/contracts';

export type NavigationItem = {
  href: string;
  label: string;
  icon: 'layout' | 'calendar' | 'receipt' | 'users' | 'team' | 'scissors' | 'wallet' | 'more';
  permission: Permission;
  entitlement?: Entitlement;
  mobile?: boolean;
};

export type PrimaryActionItem = {
  href: string;
  label: string;
  icon: 'appointment' | 'cash' | 'customer' | 'order' | 'payment';
  permission: Permission;
  entitlement?: Entitlement;
};

export const navigationItems: NavigationItem[] = [
  { href: '/', label: 'Visao geral', icon: 'layout', permission: 'dashboard.read' },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: 'calendar',
    permission: 'appointments.read',
    entitlement: 'core.operations',
    mobile: true,
  },
  {
    href: '/comandas',
    label: 'Comandas',
    icon: 'receipt',
    permission: 'orders.read',
    entitlement: 'core.operations',
    mobile: true,
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: 'users',
    permission: 'customers.read',
    entitlement: 'core.operations',
    mobile: true,
  },
  {
    href: '/equipe',
    label: 'Equipe',
    icon: 'team',
    permission: 'professionals.read',
    entitlement: 'core.operations',
    mobile: true,
  },
  {
    href: '/servicos',
    label: 'Servicos',
    icon: 'scissors',
    permission: 'services.read',
    entitlement: 'core.operations',
    mobile: true,
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
  },
  {
    href: '/caixa',
    label: 'Caixa',
    icon: 'wallet',
    permission: 'finance.read',
    entitlement: 'finance',
    mobile: true,
  },
  { href: '/configuracoes', label: 'Mais', icon: 'more', permission: 'settings.read' },
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
    href: '/caixa?mode=open',
    label: 'Abrir caixa',
    icon: 'cash',
    permission: 'cash.open',
    entitlement: 'finance',
  },
];

export function filterNavigation(
  items: NavigationItem[],
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[] = [],
) {
  return items.filter((item) => canAccess(item, permissions, entitlements));
}

export function filterPrimaryActions(
  items: PrimaryActionItem[],
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[] = [],
) {
  return items.filter((item) => canAccess(item, permissions, entitlements));
}

export function buildReceivePaymentAction(
  orderId: string,
  options: {
    canReceivePayment: boolean;
    permissions: readonly Permission[];
    entitlements?: readonly Entitlement[];
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
    canAccess(action, options.permissions, options.entitlements ?? [])
    ? action
    : null;
}

function canAccess(
  item: { permission: Permission; entitlement?: Entitlement },
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[],
) {
  return (
    permissions.includes(item.permission) &&
    (!item.entitlement || entitlements.includes(item.entitlement))
  );
}
