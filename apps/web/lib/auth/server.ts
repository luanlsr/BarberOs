import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { parseServerEnv } from '@barberos/config';
import {
  contextToSession,
  selectWorkspace,
  toRequestContext,
  type MembershipSnapshot,
} from '@barberos/auth';
import type { Entitlement, Permission, Role, SessionContext } from '@barberos/contracts';
import { developmentSession } from '../dev-session';

const rolePermissions: Record<Role, Permission[]> = {
  PLATFORM_MASTER: [
    'dashboard.read',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'appointments.cancel',
    'professionals.read',
    'professionals.create',
    'professionals.update',
    'services.read',
    'services.create',
    'services.update',
    'schedules.read',
    'schedules.manage',
    'customers.read',
    'customers.create',
    'customers.update',
    'appointments.check_in',
    'orders.read',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove',
    'finance.read',
    'settings.read',
    'memberships.manage',
    'audit.read',
    'payments.receive',
    'payments.refund',
    'cash.open',
    'cash.withdraw',
    'cash.close',
  ],
  PLATFORM_SUPPORT: [
    'dashboard.read',
    'appointments.read',
    'professionals.read',
    'services.read',
    'schedules.read',
    'customers.read',
    'settings.read',
    'audit.read',
  ],
  OWNER: [
    'dashboard.read',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'appointments.cancel',
    'professionals.read',
    'professionals.create',
    'professionals.update',
    'services.read',
    'services.create',
    'services.update',
    'schedules.read',
    'schedules.manage',
    'customers.read',
    'customers.create',
    'customers.update',
    'appointments.check_in',
    'orders.read',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove',
    'payments.receive',
    'cash.open',
    'cash.withdraw',
    'cash.close',
    'finance.read',
    'finance.write',
    'commission.read',
    'commission.manage',
    'inventory.read',
    'inventory.write',
    'worker.failures.read',
    'notifications.status.read',
    'settings.read',
    'memberships.read',
    'memberships.manage',
    'audit.read',
    'payments.refund',
  ],
  MANAGER: [
    'dashboard.read',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'appointments.cancel',
    'professionals.read',
    'professionals.create',
    'professionals.update',
    'services.read',
    'services.create',
    'services.update',
    'schedules.read',
    'schedules.manage',
    'customers.read',
    'customers.create',
    'customers.update',
    'appointments.check_in',
    'orders.read',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove',
    'payments.receive',
    'inventory.read',
    'inventory.write',
    'worker.failures.read',
    'notifications.status.read',
    'settings.read',
  ],
  FINANCE: [
    'dashboard.read',
    'finance.read',
    'finance.write',
    'cash.open',
    'cash.withdraw',
    'cash.close',
    'commission.read',
    'commission.manage',
    'payments.receive',
    'payments.refund',
  ],
  RECEPTIONIST: [
    'dashboard.read',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'appointments.cancel',
    'professionals.read',
    'services.read',
    'schedules.read',
    'customers.read',
    'customers.create',
    'customers.update',
    'appointments.check_in',
    'orders.read',
    'orders.create',
    'orders.update',
    'orders.item.add',
    'orders.item.update',
    'orders.item.remove',
    'payments.receive',
  ],
  PROFESSIONAL: [
    'dashboard.read',
    'appointments.read',
    'professionals.read',
    'services.read',
    'schedules.read',
    'customers.read',
    'orders.read',
  ],
};
const roleEntitlements: Record<Role, Entitlement[]> = {
  PLATFORM_MASTER: [
    'core.operations',
    'finance',
    'inventory',
    'worker.operations',
    'notifications',
    'ai',
  ],
  PLATFORM_SUPPORT: ['core.operations', 'worker.operations', 'notifications'],
  OWNER: ['core.operations', 'finance', 'inventory', 'worker.operations', 'notifications', 'ai'],
  MANAGER: ['core.operations', 'inventory', 'worker.operations', 'notifications'],
  FINANCE: ['core.operations', 'finance'],
  RECEPTIONIST: ['core.operations', 'notifications'],
  PROFESSIONAL: ['core.operations'],
};

type MembershipRow = {
  id: string;
  tenant_id: string;
  role: Role;
  tenant?: { name?: string } | Array<{ name?: string }> | null;
  membership_branches?: Array<{
    branch_id: string;
    branch?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }>;
};

function relationName(relation: MembershipRow['tenant']) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name;
}

function branchRecord(
  relation: NonNullable<NonNullable<MembershipRow['membership_branches']>[number]['branch']>,
) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function toSnapshot(row: MembershipRow, userId: string): MembershipSnapshot {
  const tenantName = relationName(row.tenant) ?? 'Workspace';
  const branches = (row.membership_branches ?? []).flatMap((item) => {
    const branch = item.branch ? branchRecord(item.branch) : null;
    return branch
      ? [{ tenantId: row.tenant_id, tenantName, branchId: branch.id, branchName: branch.name }]
      : [];
  });
  return {
    userId,
    tenantId: row.tenant_id,
    tenantName,
    membershipId: row.id,
    role: row.role,
    permissions: rolePermissions[row.role] ?? [],
    entitlements: roleEntitlements[row.role] ?? [],
    branches,
  };
}

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = parseServerEnv(process.env);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Components cannot mutate cookies. */
        }
      },
    },
  });
}

export function isDevelopmentAuthEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.BARBEROS_DEV_AUTH !== 'false';
}

async function getSessionContextUncached(
  requestedTenantId?: string,
  requestedBranchId?: string,
): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return isDevelopmentAuthEnabled() ? developmentSession : null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const branchCookie = (await cookies()).get('barberos-branch-id')?.value;
  const { data } = await supabase
    .from('memberships')
    .select(
      'id, tenant_id, role, tenant:tenants(name), membership_branches(branch_id, branch:branches(id, name))',
    )
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE');
  const rows = (data ?? []) as MembershipRow[];
  const selectedRow = rows.find((row) => row.tenant_id === requestedTenantId) ?? rows[0];
  if (!selectedRow) return null;
  const snapshot = toSnapshot(selectedRow, user.id);
  if (!snapshot.branches.length) return null;
  const workspace = selectWorkspace(
    snapshot,
    selectedRow.tenant_id,
    requestedBranchId ?? branchCookie,
  );
  const session = contextToSession(snapshot, workspace);
  const allWorkspaces = rows.flatMap((row) => toSnapshot(row, user.id).branches);
  return {
    ...session,
    email: user.email,
    userName: user.user_metadata?.full_name ?? user.email ?? user.id,
    availableWorkspaces: allWorkspaces,
  };
}

export async function getRequestContext(
  requestId = crypto.randomUUID(),
  tenantId?: string,
  branchId?: string,
) {
  const session = await getSessionContext(tenantId, branchId);
  if (!session) return null;
  const workspace = session.availableWorkspaces?.find(
    (candidate) => candidate.branchId === session.activeBranchId,
  ) ?? {
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    branchId: session.activeBranchId ?? session.branchScope[0] ?? 'unknown',
    branchName: session.branchName,
  };
  return toRequestContext(
    {
      userId: session.userId,
      tenantId: session.tenantId,
      tenantName: session.tenantName,
      membershipId: session.membershipId,
      role: session.role,
      permissions: session.permissions,
      entitlements: session.entitlements ?? [],
      branches: session.availableWorkspaces ?? [workspace],
    },
    requestId,
    workspace,
  );
}

// Layouts and route pages both need the same session. React cache deduplicates
// that work within one server render without sharing auth data between requests.
export const getSessionContext = cache(getSessionContextUncached);
