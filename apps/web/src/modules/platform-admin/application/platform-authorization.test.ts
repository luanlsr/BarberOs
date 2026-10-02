import { describe, expect, it } from 'vitest';
import type { Permission } from '@barberos/contracts';

import {
  assertPlatformAccess,
  assertSupportScope,
  authorizePlatformPermission,
  hasPlatformPermission,
  PlatformAuthorizationError,
} from './platform-authorization';
import type { PlatformRequestContext } from '../domain';

function platformContext(
  role: PlatformRequestContext['role'],
  permissions: readonly Permission[],
): PlatformRequestContext {
  return {
    requestId: 'request-platform-a',
    userId: 'user-a',
    role,
    permissions,
  };
}

describe('platform authorization', () => {
  it('allows platform masters with explicit platform permissions', () => {
    const context = platformContext('PLATFORM_MASTER', [
      'platform.tenants.read',
      'platform.tenants.manage',
    ]);

    expect(() => assertPlatformAccess(context)).not.toThrow();
    expect(() => authorizePlatformPermission(context, 'platform.tenants.manage')).not.toThrow();
    expect(hasPlatformPermission(context, 'platform.tenants.read')).toBe(true);
  });

  it('denies tenant owners even when they have tenant administration permissions', () => {
    const context = platformContext('OWNER', [
      'memberships.manage',
      'finance.write',
      'platform.tenants.read',
    ]);

    expect(() => assertPlatformAccess(context)).toThrowError(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    expect(hasPlatformPermission(context, 'platform.tenants.read')).toBe(false);
  });

  it('keeps platform support limited by explicit permission grants', () => {
    const context = platformContext('PLATFORM_SUPPORT', [
      'platform.tenants.read',
      'platform.billing.read',
      'platform.support.manage',
      'platform.audit.read',
    ]);

    expect(() => authorizePlatformPermission(context, 'platform.billing.read')).not.toThrow();
    expect(() => authorizePlatformPermission(context, 'platform.plans.manage')).toThrowError(
      new PlatformAuthorizationError('PLATFORM_PERMISSION_DENIED', 'Platform permission denied.'),
    );
  });

  it('requires active support scopes for tenant-private support access', () => {
    const now = new Date('2026-10-01T12:00:00.000Z');
    const activeScope = {
      tenantId: 'tenant-a',
      status: 'ACTIVE',
      expiresAt: '2026-10-01T13:00:00.000Z',
      operationClass: 'BILLING_SUPPORT' as const,
    };

    expect(() =>
      assertSupportScope(activeScope, {
        tenantId: 'tenant-a',
        operationClass: 'TENANT_HEALTH',
        now,
      }),
    ).not.toThrow();
    expect(() =>
      assertSupportScope(activeScope, {
        tenantId: 'tenant-b',
        operationClass: 'TENANT_HEALTH',
        now,
      }),
    ).toThrowError(PlatformAuthorizationError);
    expect(() =>
      assertSupportScope(activeScope, {
        tenantId: 'tenant-a',
        operationClass: 'PRIVATE_OPERATIONAL_READ',
        now,
      }),
    ).toThrowError(PlatformAuthorizationError);
    expect(() =>
      assertSupportScope(
        {
          ...activeScope,
          expiresAt: '2026-10-01T11:59:59.000Z',
        },
        {
          tenantId: 'tenant-a',
          operationClass: 'TENANT_HEALTH',
          now,
        },
      ),
    ).toThrowError(PlatformAuthorizationError);
  });
});
