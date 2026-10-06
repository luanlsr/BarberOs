import type {
  Campaign,
  CampaignStatus,
  Permission,
  RequestContext,
  SessionContext,
} from '@barberos/contracts';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from './auth/server';
import { CampaignApplicationService } from '../src/modules/campaigns/application/campaign-service';
import { SupabaseCampaignRepository } from '../src/modules/campaigns/infrastructure/supabase-campaign-repository';

export type CampaignsViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type CampaignTone = 'neutral' | 'success' | 'warning' | 'danger';

export type CampaignMetricModel = {
  label: string;
  value: string;
  tone: CampaignTone;
};

export type CampaignAudiencePreviewModel = {
  audienceSize: number;
  eligibleCount: number;
  excludedCount: number;
  unknownContactCount: number;
  exclusionReasons: readonly CampaignMetricModel[];
};

export type CampaignItemModel = {
  id: string;
  name: string;
  status: CampaignStatus;
  statusLabel: string;
  statusTone: CampaignTone;
  branchName: string;
  templateKey: string;
  bodyPreview: string;
  scheduledForLabel?: string;
  updatedAtLabel: string;
  audiencePreview: CampaignAudiencePreviewModel;
  resultMetrics: readonly CampaignMetricModel[];
  canEdit: boolean;
  canSubmitForReview: boolean;
  canApprove: boolean;
  canSchedule: boolean;
  canSend: boolean;
  canCancel: boolean;
  disabledReason?: string;
};

export type CampaignActionModel = {
  id: 'campaigns.refresh' | 'campaigns.create';
  label: string;
  enabled: boolean;
  reason?: string;
};

export type CampaignsViewModel = {
  state: CampaignsViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canSend: boolean;
  campaigns: readonly CampaignItemModel[];
  selectedCampaign?: CampaignItemModel;
  allowedActions: readonly CampaignActionModel[];
  summary: readonly CampaignMetricModel[];
  error?: { code: string; message: string; requestId: string };
};

type CampaignsViewOptions = {
  branchId?: string;
  campaignId?: string;
  state?: string;
};

type DevelopmentCampaignsViewOptions = {
  branchId?: string;
  campaignId?: string;
  state?: 'loading' | 'empty' | 'error' | 'offline';
};

type CampaignsBaseModel = ReturnType<typeof baseModel>;

type CampaignAudiencePreviewById = ReadonlyMap<string, CampaignAudiencePreviewModel>;

const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: 'Rascunho',
  READY_FOR_REVIEW: 'Em revisão',
  APPROVED: 'Aprovada',
  SCHEDULED: 'Agendada',
  SENDING: 'Enviando',
  SENT: 'Enviada',
  PARTIALLY_FAILED: 'Falha parcial',
  CANCELLED: 'Cancelada',
};

const statusTones: Record<CampaignStatus, CampaignTone> = {
  DRAFT: 'neutral',
  READY_FOR_REVIEW: 'warning',
  APPROVED: 'success',
  SCHEDULED: 'success',
  SENDING: 'warning',
  SENT: 'success',
  PARTIALLY_FAILED: 'danger',
  CANCELLED: 'neutral',
};

const developmentCampaigns: readonly Campaign[] = [
  {
    id: 'campaign-draft-reactivation',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Reativação de clientes 45 dias',
    status: 'DRAFT',
    audienceCriteria: {
      branchIds: ['dev-branch'],
      customerStatus: ['ACTIVE', 'AT_RISK'],
      lastVisitBefore: '2026-08-15',
      includeCustomersWithoutVisit: false,
    },
    content: {
      templateKey: 'reactivation_45_days',
      bodyPreview: 'Oi {{nome}}, faz tempo que você não aparece. Quer reservar seu corte?',
      variables: { nome: 'Cliente' },
    },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-28T14:20:00.000Z',
  },
  {
    id: 'campaign-review-plan',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Oferta plano mensal',
    status: 'READY_FOR_REVIEW',
    audienceCriteria: {
      branchIds: ['dev-branch'],
      customerStatus: ['ACTIVE'],
      includeCustomersWithoutVisit: true,
    },
    content: {
      templateKey: 'monthly_plan_offer',
      bodyPreview: 'Seu plano de corte mensal está disponível com benefícios exclusivos.',
      variables: {},
    },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-28T17:40:00.000Z',
  },
  {
    id: 'campaign-scheduled-weekend',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Horários livres de sábado',
    status: 'SCHEDULED',
    audienceCriteria: {
      branchIds: ['dev-branch'],
      customerStatus: ['ACTIVE'],
      includeCustomersWithoutVisit: false,
    },
    content: {
      templateKey: 'weekend_slots',
      bodyPreview: 'Abrimos novos horários para sábado. Responda para reservar.',
      variables: {},
    },
    scheduledFor: '2026-09-30T12:00:00.000Z',
    approvedBy: 'manager-1',
    approvedAt: '2026-09-28T18:00:00.000Z',
    createdBy: 'dev-user',
    updatedBy: 'manager-1',
    createdAt: '2026-09-26T10:00:00.000Z',
    updatedAt: '2026-09-28T18:00:00.000Z',
  },
  {
    id: 'campaign-partial-birthday',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    name: 'Aniversariantes do mês',
    status: 'PARTIALLY_FAILED',
    audienceCriteria: {
      branchIds: ['dev-branch'],
      customerStatus: ['ACTIVE'],
      includeCustomersWithoutVisit: true,
    },
    content: {
      templateKey: 'birthday_month',
      bodyPreview: 'Tem presente de aniversário esperando por você este mês.',
      variables: {},
    },
    createdBy: 'dev-user',
    updatedBy: 'worker',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-27T18:00:00.000Z',
  },
];

const previewByCampaignId: Record<string, CampaignAudiencePreviewModel> = {
  'campaign-draft-reactivation': preview(84, 62, 13, 9),
  'campaign-review-plan': preview(128, 103, 18, 7),
  'campaign-scheduled-weekend': preview(96, 88, 5, 3),
  'campaign-partial-birthday': preview(141, 119, 14, 8),
};

const resultByCampaignId: Record<string, readonly CampaignMetricModel[]> = {
  'campaign-partial-birthday': [
    { label: 'Enviadas', value: '109', tone: 'success' },
    { label: 'Entregues', value: '98', tone: 'success' },
    { label: 'Falharam', value: '7', tone: 'danger' },
    { label: 'Bloqueadas', value: '5', tone: 'warning' },
    { label: 'Respostas', value: '16', tone: 'success' },
    { label: 'Opt-outs', value: '2', tone: 'warning' },
  ],
};

export async function getCampaignsViewModel(
  session: SessionContext,
  options: CampaignsViewOptions = {},
): Promise<CampaignsViewModel> {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar campanhas desta unidade.',
      [],
      undefined,
      options.campaignId,
    );
  }
  if (options.state === 'loading') {
    return buildModel(base, 'loading', 'Carregando campanhas e prévias de audiência.', []);
  }
  if (options.state === 'error') {
    return buildModel(base, 'error', 'Não foi possível carregar campanhas agora.', [], {
      code: 'CAMPAIGN_VALIDATION_ERROR',
      message: 'Campanhas indisponíveis.',
      requestId: 'local-campaigns-error',
    });
  }

  const client = await createSupabaseServerClient();
  const requestContext = client
    ? await getRequestContext(crypto.randomUUID(), session.tenantId, branchId)
    : null;

  if (client && requestContext) {
    try {
      return await getPersistentCampaignsViewModel(client, requestContext, session, {
        branchId,
        campaignId: options.campaignId,
        state: developmentStateFrom(options.state),
      });
    } catch (error) {
      return buildModel(base, 'error', 'Não foi possível carregar campanhas agora.', [], {
        code:
          error instanceof Error && 'code' in error
            ? String(error.code)
            : 'CAMPAIGNS_LOAD_FAILED',
        message: 'Campanhas indisponíveis.',
        requestId: requestContext.requestId,
      });
    }
  }

  if (isDevelopmentAuthEnabled()) {
    return getDevelopmentCampaignsViewModel(session, {
      branchId: options.branchId,
      campaignId: options.campaignId,
      state: developmentStateFrom(options.state),
    });
  }

  return buildModel(
    base,
    'empty',
    'Nenhuma campanha criada para esta unidade.',
    [],
    undefined,
    options.campaignId,
  );
}

export function getDevelopmentCampaignsViewModel(
  session: SessionContext,
  options: DevelopmentCampaignsViewOptions = {},
): CampaignsViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar campanhas desta unidade.',
      [],
    );
  }
  if (options.state === 'loading') {
    return buildModel(base, 'loading', 'Carregando campanhas e prévias de audiência.', []);
  }
  if (options.state === 'error') {
    return buildModel(base, 'error', 'Não foi possível carregar campanhas agora.', [], {
      code: 'CAMPAIGN_VALIDATION_ERROR',
      message: 'Campanhas indisponíveis.',
      requestId: 'local-campaigns-error',
    });
  }
  if (options.state === 'empty') {
    return buildModel(base, 'empty', 'Nenhuma campanha criada para esta unidade.', []);
  }

  const branchCampaigns = developmentCampaigns.filter((campaign) => campaign.branchId === branchId);
  return buildModel(
    base,
    options.state === 'offline' ? 'offline' : 'ready',
    options.state === 'offline'
      ? 'Você está offline. Edição local pode continuar, mas envio e agendamento ficam bloqueados.'
      : 'Campanhas de WhatsApp com audiência, revisão, agenda e resultado operacional.',
    branchCampaigns,
    undefined,
    options.campaignId,
  );
}

function baseModel(session: SessionContext, branchId: string) {
  const hasCampaigns = (session.entitlements ?? []).includes('campaigns');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Campanhas',
    description: 'Segmentação, revisão, aprovação e envio de campanhas WhatsApp.',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead: hasPermission(session, 'campaigns.read') && hasCampaigns && hasBranch,
    canCreate: hasPermission(session, 'campaigns.create') && hasCampaigns && hasBranch,
    canApprove: hasPermission(session, 'campaigns.approve') && hasCampaigns && hasBranch,
    canSend: hasPermission(session, 'campaigns.send') && hasCampaigns && hasBranch,
  };
}

function buildModel(
  base: CampaignsBaseModel,
  state: CampaignsViewState,
  description: string,
  campaigns: readonly Campaign[],
  error?: CampaignsViewModel['error'],
  campaignId?: string,
  previewById?: CampaignAudiencePreviewById,
): CampaignsViewModel {
  const items = campaigns.map((campaign) => toCampaignItem(campaign, base, state, previewById));
  return {
    ...base,
    state,
    description,
    campaigns: items,
    selectedCampaign: items.find((item) => item.id === campaignId) ?? items[0],
    allowedActions: actionsFor(base, state),
    summary: summaryFor(items),
    error,
  };
}

function toCampaignItem(
  campaign: Campaign,
  base: CampaignsBaseModel,
  state: CampaignsViewState,
  previewById?: CampaignAudiencePreviewById,
): CampaignItemModel {
  const disabledReason = unavailableReasonForState(state);
  const previewModel =
    previewById?.get(campaign.id) ?? previewByCampaignId[campaign.id] ?? preview(0, 0, 0, 0);
  const canMutate = state === 'ready';
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    statusLabel: statusLabels[campaign.status],
    statusTone: statusTones[campaign.status],
    branchName: base.branchName,
    templateKey: campaign.content.templateKey,
    bodyPreview: sanitizeCampaignBody(campaign.content.bodyPreview),
    scheduledForLabel: campaign.scheduledFor ? formatDateTime(campaign.scheduledFor) : undefined,
    updatedAtLabel: formatDateTime(campaign.updatedAt),
    audiencePreview: previewModel,
    resultMetrics: resultByCampaignId[campaign.id] ?? [],
    canEdit: base.canCreate && canMutate && campaign.status === 'DRAFT',
    canSubmitForReview: base.canCreate && canMutate && campaign.status === 'DRAFT',
    canApprove: base.canApprove && canMutate && campaign.status === 'READY_FOR_REVIEW',
    canSchedule: base.canSend && canMutate && campaign.status === 'APPROVED',
    canSend:
      base.canSend &&
      canMutate &&
      (campaign.status === 'APPROVED' || campaign.status === 'SCHEDULED'),
    canCancel:
      base.canApprove &&
      canMutate &&
      !['SENT', 'PARTIALLY_FAILED', 'CANCELLED'].includes(campaign.status),
    disabledReason:
      disabledReason ??
      (!base.canCreate && campaign.status === 'DRAFT' ? 'Sem permissão para editar.' : undefined),
  };
}

function actionsFor(
  base: CampaignsBaseModel,
  state: CampaignsViewState,
): readonly CampaignActionModel[] {
  return [
    {
      id: 'campaigns.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissão para visualizar campanhas.',
    },
    {
      id: 'campaigns.create',
      label: 'Nova campanha',
      enabled: base.canCreate && (state === 'ready' || state === 'empty'),
      reason: actionReason(
        base.canCreate,
        unavailableReasonForState(state),
        'Sem permissão para criar campanhas.',
      ),
    },
  ];
}

async function getPersistentCampaignsViewModel(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  context: RequestContext,
  session: SessionContext,
  options: {
    branchId: string;
    campaignId?: string;
    state?: DevelopmentCampaignsViewOptions['state'];
  },
): Promise<CampaignsViewModel> {
  const base = baseModel(session, options.branchId);
  const repository = new SupabaseCampaignRepository(client);
  const service = new CampaignApplicationService(repository, repository, repository);
  const campaigns = await service.list(context, { branchId: options.branchId });

  if (options.state === 'empty') {
    return buildModel(
      base,
      'empty',
      'Nenhuma campanha criada para esta unidade.',
      [],
      undefined,
      options.campaignId,
    );
  }

  const state = options.state === 'offline' ? 'offline' : campaigns.length ? 'ready' : 'empty';
  const description =
    state === 'offline'
      ? 'Você está offline. Edição local pode continuar, mas envio e agendamento ficam bloqueados.'
      : state === 'empty'
        ? 'Nenhuma campanha criada para esta unidade.'
        : 'Campanhas de WhatsApp com audiência, revisão, agenda e resultado operacional.';
  const previews = await loadPersistentAudiencePreviews(service, context, campaigns, base.canCreate);

  return buildModel(
    base,
    state,
    description,
    campaigns,
    undefined,
    options.campaignId,
    previews,
  );
}

async function loadPersistentAudiencePreviews(
  service: CampaignApplicationService,
  context: RequestContext,
  campaigns: readonly Campaign[],
  canPreviewAudience: boolean,
): Promise<CampaignAudiencePreviewById> {
  if (!canPreviewAudience || campaigns.length === 0) return new Map();

  const entries = await Promise.all(
    campaigns.map(async (campaign) => {
      const previewModel = await service.previewAudience(context, campaign.audienceCriteria);
      return [
        campaign.id,
        preview(
          previewModel.audienceSize,
          previewModel.eligibleCount,
          previewModel.excludedCount,
          previewModel.unknownContactCount,
        ),
      ] as const;
    }),
  );
  return new Map(entries);
}

function summaryFor(items: readonly CampaignItemModel[]): readonly CampaignMetricModel[] {
  return [
    { label: 'Campanhas', value: String(items.length), tone: 'neutral' },
    {
      label: 'Prontas/agendadas',
      value: String(
        items.filter((item) => ['APPROVED', 'SCHEDULED', 'SENDING'].includes(item.status)).length,
      ),
      tone: 'success',
    },
    {
      label: 'Falha parcial',
      value: String(items.filter((item) => item.status === 'PARTIALLY_FAILED').length),
      tone: items.some((item) => item.status === 'PARTIALLY_FAILED') ? 'danger' : 'neutral',
    },
  ];
}

function preview(
  audienceSize: number,
  eligibleCount: number,
  excludedCount: number,
  unknownContactCount: number,
): CampaignAudiencePreviewModel {
  return {
    audienceSize,
    eligibleCount,
    excludedCount,
    unknownContactCount,
    exclusionReasons: [
      { label: 'Sem destino', value: String(unknownContactCount), tone: 'warning' },
      {
        label: 'Sem consentimento',
        value: String(Math.max(0, excludedCount - unknownContactCount)),
        tone: 'warning',
      },
    ],
  };
}

function unavailableReasonForState(state: CampaignsViewState) {
  if (state === 'offline') return 'Disponível quando a conexão voltar.';
  if (state === 'loading') return 'Aguarde o carregamento.';
  if (state === 'error') return 'Recarregue antes de executar esta ação.';
  if (state === 'permission-denied') return 'Sem permissão para campanhas.';
  return undefined;
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function developmentStateFrom(state: string | undefined): DevelopmentCampaignsViewOptions['state'] {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'offline') {
    return state;
  }
  return undefined;
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function sanitizeCampaignBody(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, '[link removido]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removido]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[telefone removido]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}
