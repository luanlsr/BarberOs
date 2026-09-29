import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { getDevelopmentMessagingStatusViewModel } from './messaging-status-data';

const baseSession: SessionContext = {
  authState: 'authenticated',
  userId: 'user-1',
  tenantId: 'dev-tenant',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: [
    'messaging.read',
    'messaging.manage',
    'campaigns.read',
    'notifications.status.read',
  ],
  entitlements: ['messaging', 'campaigns', 'notifications'],
  branchScope: ['dev-branch', 'dev-branch-north'],
  activeBranchId: 'dev-branch',
  userName: 'Luan',
  tenantName: 'BarberOS Demo',
  branchName: 'Centro',
  availableWorkspaces: [
    {
      tenantId: 'dev-tenant',
      tenantName: 'BarberOS Demo',
      branchId: 'dev-branch',
      branchName: 'Centro',
    },
    {
      tenantId: 'dev-tenant',
      tenantName: 'BarberOS Demo',
      branchId: 'dev-branch-north',
      branchName: 'Norte',
    },
  ],
};

describe('getDevelopmentMessagingStatusViewModel', () => {
  it('builds a ready messaging setup model without exposing provider secrets', () => {
    const model = getDevelopmentMessagingStatusViewModel(baseSession);

    expect(model.state).toBe('ready');
    expect(model.connection).toMatchObject({
      label: 'WhatsApp Centro',
      providerLabel: 'Local/noop',
      statusLabel: 'Ativa',
    });
    expect(JSON.stringify(model)).not.toContain('credentialReference');
    expect(JSON.stringify(model)).not.toContain('webhookSecretReference');
    expect(model.deliveryMetrics.find((metric) => metric.id === 'DELIVERED')?.count).toBe(112);
  });

  it('communicates permission denied without delivery or connection data', () => {
    const model = getDevelopmentMessagingStatusViewModel({
      ...baseSession,
      permissions: ['dashboard.read'],
      entitlements: ['messaging', 'campaigns', 'notifications'],
    });

    expect(model.state).toBe('permission-denied');
    expect(model.connection).toBeUndefined();
    expect(model.deliveryMetrics).toEqual([]);
    expect(model.allowedActions.every((action) => !action.enabled)).toBe(true);
  });

  it('keeps final send actions disabled while offline', () => {
    const model = getDevelopmentMessagingStatusViewModel(baseSession, { state: 'offline' });

    expect(model.state).toBe('offline');
    expect(model.connection?.statusLabel).toBe('Ativa');
    expect(
      model.allowedActions.find((action) => action.id === 'messaging.open-campaigns'),
    ).toMatchObject({
      enabled: false,
      reason: 'Disponível quando a conexão voltar.',
    });
  });

  it('shows actionable empty and inactive-provider states for managers', () => {
    const empty = getDevelopmentMessagingStatusViewModel(baseSession, { state: 'empty' });
    const inactive = getDevelopmentMessagingStatusViewModel(baseSession, {
      branchId: 'dev-branch-north',
      state: 'inactive-provider',
    });

    expect(empty.state).toBe('empty');
    expect(empty.allowedActions.find((action) => action.id === 'messaging.setup')?.enabled).toBe(
      true,
    );
    expect(inactive.connection).toMatchObject({
      label: 'WhatsApp Norte',
      providerLabel: 'Meta WhatsApp Cloud',
      statusTone: 'warning',
    });
  });
});
