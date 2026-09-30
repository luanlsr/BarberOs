import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { getDevelopmentCampaignsViewModel } from './campaigns-view-data';

const baseSession: SessionContext = {
  authState: 'authenticated',
  userId: 'user-1',
  tenantId: 'dev-tenant',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['campaigns.read', 'campaigns.create', 'campaigns.approve', 'campaigns.send'],
  entitlements: ['campaigns'],
  branchScope: ['dev-branch'],
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
  ],
};

describe('getDevelopmentCampaignsViewModel', () => {
  it('builds list, editor selection and audience preview for authorized users', () => {
    const model = getDevelopmentCampaignsViewModel(baseSession, {
      campaignId: 'campaign-review-plan',
    });

    expect(model.state).toBe('ready');
    expect(model.campaigns).toHaveLength(4);
    expect(model.selectedCampaign).toMatchObject({
      id: 'campaign-review-plan',
      statusLabel: 'Em revisão',
      canApprove: true,
    });
    expect(model.selectedCampaign?.audiencePreview).toMatchObject({
      audienceSize: 128,
      eligibleCount: 103,
      excludedCount: 18,
    });
  });

  it('denies campaign data without permission or entitlement', () => {
    const model = getDevelopmentCampaignsViewModel({
      ...baseSession,
      permissions: ['dashboard.read'],
      entitlements: [],
    });

    expect(model.state).toBe('permission-denied');
    expect(model.campaigns).toEqual([]);
    expect(model.selectedCampaign).toBeUndefined();
  });

  it('blocks final send and schedule actions while offline', () => {
    const model = getDevelopmentCampaignsViewModel(baseSession, {
      campaignId: 'campaign-scheduled-weekend',
      state: 'offline',
    });

    expect(model.state).toBe('offline');
    expect(model.selectedCampaign).toMatchObject({
      canSchedule: false,
      canSend: false,
      disabledReason: 'Disponível quando a conexão voltar.',
    });
  });

  it('presents partial failure metrics without implying full success', () => {
    const model = getDevelopmentCampaignsViewModel(baseSession, {
      campaignId: 'campaign-partial-birthday',
    });

    expect(model.selectedCampaign).toMatchObject({
      status: 'PARTIALLY_FAILED',
      statusLabel: 'Falha parcial',
      statusTone: 'danger',
    });
    expect(model.selectedCampaign?.resultMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Falharam', value: '7', tone: 'danger' }),
        expect.objectContaining({ label: 'Bloqueadas', value: '5', tone: 'warning' }),
      ]),
    );
  });
});
