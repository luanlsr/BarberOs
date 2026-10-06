import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, RequestContext, SessionContext } from '@barberos/contracts';
import { getCampaignsViewModel, getDevelopmentCampaignsViewModel } from './campaigns-view-data';

const authMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getRequestContext: vi.fn(),
  isDevelopmentAuthEnabled: vi.fn(),
}));

const repositoryState = vi.hoisted(() => ({
  list: vi.fn(),
  findAudienceCandidates: vi.fn(),
}));

vi.mock('./auth/server', () => authMocks);

vi.mock('../src/modules/campaigns/infrastructure/supabase-campaign-repository', () => ({
  SupabaseCampaignRepository: vi.fn(() => repositoryState),
}));

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

const requestContext: RequestContext = {
  requestId: 'request-campaigns-view-test',
  userId: baseSession.userId,
  tenantId: baseSession.tenantId,
  membershipId: baseSession.membershipId,
  role: baseSession.role,
  permissions: baseSession.permissions,
  entitlements: baseSession.entitlements ?? [],
  branchScope: baseSession.branchScope,
};

const persistentCampaign: Campaign = {
  id: 'campaign-real',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  name: 'Campanha real',
  status: 'DRAFT',
  audienceCriteria: {
    branchIds: ['dev-branch'],
    customerStatus: ['AT_RISK'],
    includeCustomersWithoutVisit: false,
  },
  content: {
    templateKey: 'real_reactivation',
    bodyPreview: 'Volte pelo link https://barberos.example e chame +55 11 98888-7777',
    variables: {},
  },
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T11:00:00.000Z',
};

describe('getDevelopmentCampaignsViewModel', () => {
  beforeEach(() => {
    authMocks.createSupabaseServerClient.mockResolvedValue(null);
    authMocks.getRequestContext.mockResolvedValue(null);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(true);
    repositoryState.list.mockResolvedValue([]);
    repositoryState.findAudienceCandidates.mockResolvedValue([]);
  });

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

  it('keeps explicit development campaign data available when dev auth is enabled', async () => {
    const model = await getCampaignsViewModel(baseSession, {
      campaignId: 'campaign-review-plan',
    });

    expect(model.state).toBe('ready');
    expect(model.campaigns).toHaveLength(4);
    expect(model.selectedCampaign?.id).toBe('campaign-review-plan');
  });

  it('does not fallback to development campaigns when development auth is disabled', async () => {
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(false);

    const model = await getCampaignsViewModel(baseSession);

    expect(authMocks.createSupabaseServerClient).toHaveBeenCalled();
    expect(model.state).toBe('empty');
    expect(model.campaigns).toEqual([]);
    expect(model.selectedCampaign).toBeUndefined();
  });

  it('loads persistent campaigns and audience previews through the campaign service', async () => {
    authMocks.createSupabaseServerClient.mockResolvedValue({});
    authMocks.getRequestContext.mockResolvedValue(requestContext);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(false);
    repositoryState.list.mockResolvedValue([persistentCampaign]);
    repositoryState.findAudienceCandidates.mockResolvedValue([
      {
        tenantId: 'dev-tenant',
        branchId: 'dev-branch',
        customerId: 'customer-eligible',
        contactPhoneHash: 'hash-eligible',
        hasReachableDestination: true,
        marketingConsentState: 'OPTED_IN',
      },
      {
        tenantId: 'dev-tenant',
        branchId: 'dev-branch',
        customerId: 'customer-no-phone',
        hasReachableDestination: false,
        marketingConsentState: 'OPTED_IN',
      },
      {
        tenantId: 'dev-tenant',
        branchId: 'dev-branch',
        customerId: 'customer-unknown-consent',
        contactPhoneHash: 'hash-unknown',
        hasReachableDestination: true,
      },
    ]);

    const model = await getCampaignsViewModel(baseSession);

    expect(model.state).toBe('ready');
    expect(model.campaigns).toHaveLength(1);
    expect(model.selectedCampaign).toMatchObject({
      id: 'campaign-real',
      name: 'Campanha real',
      bodyPreview: 'Volte pelo link [link removido] e chame [telefone removido]',
      audiencePreview: {
        audienceSize: 3,
        eligibleCount: 1,
        excludedCount: 2,
        unknownContactCount: 1,
      },
      resultMetrics: [],
    });
    expect(repositoryState.list).toHaveBeenCalledWith(requestContext, { branchId: 'dev-branch' });
    expect(repositoryState.findAudienceCandidates).toHaveBeenCalledWith(
      requestContext,
      persistentCampaign.audienceCriteria,
    );
  });
});
