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
import type { Role, SessionContext } from '@barberos/contracts';
import { developmentSession } from '../dev-session';
import {
  BARBEROS_SESSION_EXPIRES_AT_COOKIE,
  BARBEROS_SESSION_ID_COOKIE,
  readJwtSessionMetadata,
} from './jwt-session';
import { roleEntitlements, rolePermissions } from './role-catalog';

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
  return getSessionContextInternal({
    requestedTenantId,
    requestedBranchId,
    allowDevelopmentFallback: true,
  });
}

async function getSessionContextInternal({
  requestedTenantId,
  requestedBranchId,
  allowDevelopmentFallback,
}: {
  requestedTenantId?: string;
  requestedBranchId?: string;
  allowDevelopmentFallback: boolean;
}): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return allowDevelopmentFallback && isDevelopmentAuthEnabled() ? developmentSession : null;
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  const jwtMetadata = readJwtSessionMetadata(authSession?.access_token);
  if (!jwtMetadata) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const cookieStore = await cookies();
  const sessionIdCookie = cookieStore.get(BARBEROS_SESSION_ID_COOKIE)?.value;
  const sessionExpiresAtCookie = cookieStore.get(BARBEROS_SESSION_EXPIRES_AT_COOKIE)?.value;
  if (
    sessionIdCookie !== jwtMetadata.sessionId ||
    sessionExpiresAtCookie !== jwtMetadata.sessionExpiresAt
  )
    return null;
  const branchCookie = cookieStore.get('barberos-branch-id')?.value;
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

export async function getVerifiedSessionContext(
  requestedTenantId?: string,
  requestedBranchId?: string,
): Promise<SessionContext | null> {
  return getSessionContextInternal({
    requestedTenantId,
    requestedBranchId,
    allowDevelopmentFallback: false,
  });
}

// Layouts and route pages both need the same session. React cache deduplicates
// that work within one server render without sharing auth data between requests.
export const getSessionContext = cache(getSessionContextUncached);
