import type {
  AuthorizationRequirement,
  Entitlement,
  Permission,
  RequestContext,
} from '@barberos/contracts';

export type AuthorizationFailureCode =
  'UNAUTHENTICATED' | 'PERMISSION_DENIED' | 'ENTITLEMENT_DENIED' | 'BRANCH_SCOPE_DENIED';

export class AuthorizationError extends Error {
  readonly code: AuthorizationFailureCode;
  constructor(code: AuthorizationFailureCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export function authorize(
  context: RequestContext | null,
  requirement: AuthorizationRequirement,
): void {
  if (!context) throw new AuthorizationError('UNAUTHENTICATED', 'Authentication is required.');
  if (!context.permissions.includes(requirement.permission))
    throw new AuthorizationError('PERMISSION_DENIED', 'Permission denied.');
  if (requirement.entitlement && !context.entitlements.includes(requirement.entitlement))
    throw new AuthorizationError('ENTITLEMENT_DENIED', 'Feature entitlement is unavailable.');
  if (requirement.branchId && !context.branchScope.includes(requirement.branchId))
    throw new AuthorizationError('BRANCH_SCOPE_DENIED', 'Branch is outside the authorized scope.');
}

export function hasPermission(context: RequestContext | null, permission: Permission): boolean {
  return Boolean(context?.permissions.includes(permission));
}

export type PermissionCatalog = Readonly<Record<Permission, readonly Entitlement[]>>;
