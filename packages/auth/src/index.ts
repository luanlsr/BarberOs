import type { RequestContext, SessionContext, WorkspaceContext } from '@barberos/contracts';

export type AuthErrorCode = 'UNAUTHENTICATED' | 'SESSION_EXPIRED' | 'WORKSPACE_DENIED';
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type MembershipSnapshot = {
  userId: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  role: SessionContext['role'];
  permissions: SessionContext['permissions'];
  entitlements: NonNullable<SessionContext['entitlements']>;
  branches: readonly WorkspaceContext[];
};

export function selectWorkspace(
  membership: MembershipSnapshot,
  requestedTenantId?: string,
  requestedBranchId?: string,
): WorkspaceContext {
  if (requestedTenantId && requestedTenantId !== membership.tenantId)
    throw new AuthError('WORKSPACE_DENIED', 'Workspace is not authorized.');
  const branch = membership.branches.find((candidate) =>
    requestedBranchId ? candidate.branchId === requestedBranchId : true,
  );
  if (!branch) throw new AuthError('WORKSPACE_DENIED', 'Branch is not authorized.');
  return branch;
}

export function toRequestContext(
  membership: MembershipSnapshot,
  requestId: string,
  workspace: WorkspaceContext,
): RequestContext {
  if (workspace.tenantId !== membership.tenantId)
    throw new AuthError('WORKSPACE_DENIED', 'Workspace is not authorized.');
  return {
    requestId,
    userId: membership.userId,
    tenantId: membership.tenantId,
    membershipId: membership.membershipId,
    role: membership.role,
    permissions: membership.permissions,
    entitlements: membership.entitlements,
    branchScope: membership.branches.map((branch) => branch.branchId),
  };
}

export function contextToSession(
  membership: MembershipSnapshot,
  workspace: WorkspaceContext,
): SessionContext {
  const context = toRequestContext(membership, 'session', workspace);
  return {
    authState: 'authenticated',
    userId: context.userId,
    tenantId: context.tenantId,
    membershipId: context.membershipId,
    role: context.role,
    permissions: context.permissions,
    entitlements: context.entitlements,
    branchScope: context.branchScope,
    activeBranchId: workspace.branchId,
    userName: membership.userId,
    tenantName: membership.tenantName,
    branchName: workspace.branchName,
    availableWorkspaces: membership.branches,
  };
}
