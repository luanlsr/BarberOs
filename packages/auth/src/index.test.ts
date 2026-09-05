import { describe, expect, it } from 'vitest';
import { AuthError, selectWorkspace, toRequestContext } from './index';

const membership = {
  userId: 'user-1',
  tenantId: 'tenant-a',
  tenantName: 'Barbearia Alpha',
  membershipId: 'membership-1',
  role: 'OWNER' as const,
  permissions: ['dashboard.read'] as const,
  entitlements: ['core.operations'] as const,
  branches: [
    {
      tenantId: 'tenant-a',
      tenantName: 'Barbearia Alpha',
      branchId: 'branch-a',
      branchName: 'Centro',
    },
    {
      tenantId: 'tenant-a',
      tenantName: 'Barbearia Alpha',
      branchId: 'branch-b',
      branchName: 'Norte',
    },
  ],
};

describe('auth context', () => {
  it('selects only a branch in the membership scope', () =>
    expect(selectWorkspace(membership, 'tenant-a', 'branch-b').branchName).toBe('Norte'));
  it('rejects a tenant outside the membership', () =>
    expect(() => selectWorkspace(membership, 'tenant-b')).toThrowError(
      new AuthError('WORKSPACE_DENIED', 'Workspace is not authorized.'),
    ));
  it('creates a request context with all authorized branches', () =>
    expect(
      toRequestContext(
        membership,
        'request-1',
        selectWorkspace(membership, 'tenant-a', 'branch-a'),
      ),
    ).toMatchObject({ tenantId: 'tenant-a', branchScope: ['branch-a', 'branch-b'] }));
});
