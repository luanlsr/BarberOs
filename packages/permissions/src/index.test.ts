import { describe, expect, it } from 'vitest';
import { authorize, AuthorizationError } from './index';
import type { RequestContext } from '@barberos/contracts';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-a',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['appointments.read', 'finance.read'],
  entitlements: ['core.operations', 'finance'],
  branchScope: ['branch-a'],
};

describe('authorization service', () => {
  it('allows a permission, entitlement and branch in scope', () => {
    expect(() =>
      authorize(context, {
        permission: 'appointments.read',
        entitlement: 'core.operations',
        branchId: 'branch-a',
      }),
    ).not.toThrow();
  });
  it('denies missing permissions by default', () => {
    expect(() => authorize(context, { permission: 'payments.receive' })).toThrowError(
      new AuthorizationError('PERMISSION_DENIED', 'Permission denied.'),
    );
  });
  it('denies branches outside the context scope', () => {
    expect(() =>
      authorize(context, { permission: 'appointments.read', branchId: 'branch-b' }),
    ).toThrowError(AuthorizationError);
  });
});
