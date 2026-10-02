import type { Permission, Role, SupportOperationClass } from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';

export type PlatformAuthorizationFailureCode =
  | 'UNAUTHENTICATED'
  | 'PLATFORM_ACCESS_DENIED'
  | 'PLATFORM_PERMISSION_DENIED'
  | 'SUPPORT_SCOPE_REQUIRED';

export class PlatformAuthorizationError extends Error {
  readonly code: PlatformAuthorizationFailureCode;

  constructor(code: PlatformAuthorizationFailureCode, message?: string) {
    super(message ?? code);
    this.name = 'PlatformAuthorizationError';
    this.code = code;
  }
}

export const platformRoles = [
  'PLATFORM_MASTER',
  'PLATFORM_SUPPORT',
] as const satisfies readonly Role[];
export type PlatformRole = (typeof platformRoles)[number];

export type SupportScopeAuthorizationInput = {
  tenantId: string;
  status: string;
  expiresAt: string;
  operationClass: SupportOperationClass;
};

const supportOperationRank: Record<SupportOperationClass, number> = {
  METADATA_ONLY: 0,
  TENANT_HEALTH: 1,
  BILLING_SUPPORT: 2,
  PRIVATE_OPERATIONAL_READ: 3,
};

export function isPlatformRole(role: Role): role is PlatformRole {
  return platformRoles.includes(role as PlatformRole);
}

export function assertPlatformAccess(
  context: PlatformRequestContext | null,
): asserts context is PlatformRequestContext & { role: PlatformRole } {
  if (!context) {
    throw new PlatformAuthorizationError('UNAUTHENTICATED', 'Authentication is required.');
  }
  if (!isPlatformRole(context.role)) {
    throw new PlatformAuthorizationError(
      'PLATFORM_ACCESS_DENIED',
      'Platform membership is required.',
    );
  }
}

export function hasPlatformPermission(
  context: PlatformRequestContext | null,
  permission: Permission,
) {
  return Boolean(
    context && isPlatformRole(context.role) && context.permissions.includes(permission),
  );
}

export function authorizePlatformPermission(
  context: PlatformRequestContext | null,
  permission: Permission,
) {
  assertPlatformAccess(context);
  if (!context.permissions.includes(permission)) {
    throw new PlatformAuthorizationError(
      'PLATFORM_PERMISSION_DENIED',
      'Platform permission denied.',
    );
  }
}

export function assertSupportScope(
  scope: SupportScopeAuthorizationInput | null,
  input: {
    tenantId: string;
    operationClass: SupportOperationClass;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  if (
    !scope ||
    scope.tenantId !== input.tenantId ||
    scope.status !== 'ACTIVE' ||
    Date.parse(scope.expiresAt) <= now.getTime() ||
    supportOperationRank[scope.operationClass] < supportOperationRank[input.operationClass]
  ) {
    throw new PlatformAuthorizationError(
      'SUPPORT_SCOPE_REQUIRED',
      'A valid support scope is required.',
    );
  }
}
