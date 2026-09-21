import type { SessionContext } from '@barberos/contracts';
import { roleEntitlements, rolePermissions } from './auth/role-catalog';

export const developmentSession: SessionContext = {
  authState: 'authenticated',
  userId: 'dev-user',
  email: 'dev@barberos.local',
  tenantId: 'dev-tenant',
  membershipId: 'dev-membership',
  role: 'OWNER',
  permissions: rolePermissions.OWNER,
  entitlements: roleEntitlements.OWNER,
  branchScope: ['dev-branch', 'dev-branch-north'],
  activeBranchId: 'dev-branch',
  userName: 'Luan Ribeiro',
  tenantName: 'Barbearia Modelo',
  branchName: 'Unidade Centro',
  availableWorkspaces: [
    {
      tenantId: 'dev-tenant',
      tenantName: 'Barbearia Modelo',
      branchId: 'dev-branch',
      branchName: 'Unidade Centro',
    },
    {
      tenantId: 'dev-tenant',
      tenantName: 'Barbearia Modelo',
      branchId: 'dev-branch-north',
      branchName: 'Unidade Norte',
    },
  ],
};
