import type {
  CampaignAudienceCriteria,
  CreateCampaignCommand,
  RequestContext,
  ScheduleCampaignCommand,
} from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { CampaignApplicationService } from '../../../../src/modules/campaigns/application';
import type { CampaignFilters } from '../../../../src/modules/campaigns/domain';
import { SupabaseCampaignRepository } from '../../../../src/modules/campaigns/infrastructure';
import {
  createCampaignActionRouteHandlers,
  createCampaignMetricsRouteHandlers,
  createCampaignPreviewRouteHandlers,
  createCampaignRouteHandlers,
} from '../../../../src/modules/campaigns/presentation';

export function buildCampaignRouteHandlers() {
  return createCampaignRouteHandlers({ resolveContext, service: campaignRouteService });
}

export function buildCampaignActionRouteHandlers() {
  return createCampaignActionRouteHandlers({ resolveContext, service: campaignRouteService });
}

export function buildCampaignPreviewRouteHandlers() {
  return createCampaignPreviewRouteHandlers({ resolveContext, service: campaignRouteService });
}

export function buildCampaignMetricsRouteHandlers() {
  return createCampaignMetricsRouteHandlers({ resolveContext, service: campaignRouteService });
}

const campaignRouteService = {
  async list(context: RequestContext, filters?: CampaignFilters) {
    return (await getCampaignApplicationService()).list(context, filters ?? {});
  },
  async createDraft(context: RequestContext, command: CreateCampaignCommand) {
    return (await getCampaignApplicationService()).createDraft(context, command);
  },
  async submitForReview(context: RequestContext, command: { campaignId: string }) {
    return (await getCampaignApplicationService()).submitForReview(context, command);
  },
  async approve(context: RequestContext, command: { campaignId: string }) {
    return (await getCampaignApplicationService()).approve(context, command);
  },
  async schedule(context: RequestContext, command: ScheduleCampaignCommand) {
    return (await getCampaignApplicationService()).schedule(context, command);
  },
  async markSending(context: RequestContext, command: { campaignId: string }) {
    return (await getCampaignApplicationService()).markSending(context, command);
  },
  async cancel(context: RequestContext, command: { campaignId: string; reason?: string }) {
    return (await getCampaignApplicationService()).cancel(context, command);
  },
  async previewAudience(context: RequestContext, criteria: CampaignAudienceCriteria) {
    return (await getCampaignApplicationService()).previewAudience(context, criteria);
  },
  async aggregateRunMetrics(context: RequestContext, command: { campaignRunId: string }) {
    return (await getCampaignApplicationService()).aggregateRunMetrics(context, command);
  },
};

function resolveContext(request: Request) {
  const url = new URL(request.url);
  return getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function getCampaignApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  const repository = new SupabaseCampaignRepository(client);
  return new CampaignApplicationService(repository, repository, repository);
}
