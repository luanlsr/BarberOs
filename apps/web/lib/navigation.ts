import type { Entitlement, Permission } from '@barberos/contracts';

export type NavigationItem = {
  href: string;
  label: string;
  icon: 'layout' | 'calendar' | 'users' | 'team' | 'scissors' | 'wallet' | 'more';
  permission: Permission;
  entitlement?: Entitlement;
  mobile?: boolean;
};

export type PrimaryActionItem = {
  href: string;
  label: string;
  icon: 'appointment' | 'customer';
  permission: Permission;
  entitlement?: Entitlement;
};

export const navigationItems: NavigationItem[] = [
  { href: '/', label: 'Visao geral', icon: 'layout', permission: 'dashboard.read' },
  { href: '/agenda', label: 'Agenda', icon: 'calendar', permission: 'appointments.read', entitlement: 'core.operations', mobile: true },
  { href: '/clientes', label: 'Clientes', icon: 'users', permission: 'customers.read', entitlement: 'core.operations', mobile: true },
  { href: '/equipe', label: 'Equipe', icon: 'team', permission: 'professionals.read', entitlement: 'core.operations', mobile: true },
  { href: '/servicos', label: 'Servicos', icon: 'scissors', permission: 'services.read', entitlement: 'core.operations', mobile: true },
  { href: '/financeiro', label: 'Financeiro', icon: 'wallet', permission: 'finance.read', entitlement: 'finance' },
  { href: '/configuracoes', label: 'Mais', icon: 'more', permission: 'settings.read' },
];

export const primaryActionItems: PrimaryActionItem[] = [
  { href: '/agenda?mode=new', label: 'Agendamento', icon: 'appointment', permission: 'appointments.create', entitlement: 'core.operations' },
  { href: '/clientes?mode=new', label: 'Cliente', icon: 'customer', permission: 'customers.create', entitlement: 'core.operations' },
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

function canAccess(
  item: { permission: Permission; entitlement?: Entitlement },
  permissions: readonly Permission[],
  entitlements: readonly Entitlement[],
) {
  return permissions.includes(item.permission) && (!item.entitlement || entitlements.includes(item.entitlement));
}