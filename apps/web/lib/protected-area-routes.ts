import type { Entitlement, Permission, SessionContext } from '@barberos/contracts';

export type ProtectedAreaRoute = {
  label: string;
  permission: Permission;
  entitlement?: Entitlement;
};

export const protectedAreaRoutes: Record<string, ProtectedAreaRoute> = {
  financeiro: { label: 'Financeiro', permission: 'finance.read' },
  configuracoes: { label: 'Configurações', permission: 'settings.read' },
  mensagens: {
    label: 'Mensagens',
    permission: 'messaging.read',
    entitlement: 'messaging',
  },
  campanhas: {
    label: 'Campanhas',
    permission: 'campaigns.read',
    entitlement: 'campaigns',
  },
  entregas: {
    label: 'Entregas',
    permission: 'notifications.status.read',
    entitlement: 'notifications',
  },
};

export function getProtectedAreaRoute(area: string): ProtectedAreaRoute {
  return protectedAreaRoutes[area] ?? { label: 'Área', permission: 'dashboard.read' };
}

export function canAccessProtectedArea(
  session: Pick<SessionContext, 'permissions' | 'entitlements'>,
  route: ProtectedAreaRoute,
) {
  return (
    session.permissions.includes(route.permission) &&
    (!route.entitlement || (session.entitlements ?? []).includes(route.entitlement))
  );
}
