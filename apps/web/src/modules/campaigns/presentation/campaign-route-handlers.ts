import { NextResponse } from 'next/server';
import type {
  Campaign,
  CampaignAudienceCriteria,
  CampaignStatus,
  CreateCampaignCommand,
  RequestContext,
  ScheduleCampaignCommand,
} from '@barberos/contracts';

import type { CampaignAudiencePreview, CampaignFilters, CampaignMetricRollup } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type CampaignRouteService = {
  list(context: RequestContext, filters?: CampaignFilters): Promise<Campaign[]>;
  createDraft(context: RequestContext, command: CreateCampaignCommand): Promise<Campaign>;
  submitForReview(context: RequestContext, command: { campaignId: string }): Promise<Campaign>;
  approve(context: RequestContext, command: { campaignId: string }): Promise<Campaign>;
  schedule(context: RequestContext, command: ScheduleCampaignCommand): Promise<Campaign>;
  markSending(context: RequestContext, command: { campaignId: string }): Promise<Campaign>;
  cancel(
    context: RequestContext,
    command: { campaignId: string; reason?: string },
  ): Promise<Campaign>;
  previewAudience(
    context: RequestContext,
    criteria: CampaignAudienceCriteria,
  ): Promise<CampaignAudiencePreview>;
  aggregateRunMetrics(
    context: RequestContext,
    command: { campaignRunId: string },
  ): Promise<CampaignMetricRollup>;
};

export type CampaignRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null> | RequestContext | null;
  service: CampaignRouteService;
};

export function createCampaignRouteHandlers(dependencies: CampaignRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const campaigns = await dependencies.service.list(
          context,
          compact({
            branchId: optionalParam(url, 'branchId'),
            status: optionalParam(url, 'status') as CampaignStatus | undefined,
          }),
        );
        return NextResponse.json({ data: campaigns, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const campaign = await dependencies.service.createDraft(
          context,
          (await request.json()) as CreateCampaignCommand,
        );
        return NextResponse.json({ data: campaign, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createCampaignActionRouteHandlers(dependencies: CampaignRouteDependencies) {
  return {
    POST: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const action = optionalParam(url, 'action');
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const campaignId = stringBody(body, 'campaignId') ?? optionalParam(url, 'campaignId');
        if (!campaignId) {
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Campaign id is required.',
            400,
            context.requestId,
          );
        }

        const campaign = await runCampaignAction(dependencies.service, context, action, {
          ...body,
          campaignId,
        });
        return NextResponse.json({ data: campaign, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createCampaignPreviewRouteHandlers(dependencies: CampaignRouteDependencies) {
  return {
    POST: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const preview = await dependencies.service.previewAudience(
          context,
          (await request.json()) as CampaignAudienceCriteria,
        );
        return NextResponse.json({ data: preview, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createCampaignMetricsRouteHandlers(dependencies: CampaignRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const campaignRunId = optionalParam(url, 'campaignRunId');
        if (!campaignRunId) {
          return jsonError(
            'CORE_VALIDATION_ERROR',
            'Campaign run id is required.',
            400,
            context.requestId,
          );
        }
        const metrics = await dependencies.service.aggregateRunMetrics(context, { campaignRunId });
        return NextResponse.json({ data: metrics, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

async function runCampaignAction(
  service: CampaignRouteService,
  context: RequestContext,
  action: string | undefined,
  body: Record<string, unknown>,
) {
  switch (action) {
    case 'submit':
    case 'submit-for-review':
      return service.submitForReview(context, { campaignId: String(body.campaignId) });
    case 'approve':
      return service.approve(context, { campaignId: String(body.campaignId) });
    case 'schedule':
      return service.schedule(context, body as ScheduleCampaignCommand);
    case 'send':
      return service.markSending(context, { campaignId: String(body.campaignId) });
    case 'cancel':
      return service.cancel(context, {
        campaignId: String(body.campaignId),
        reason: stringBody(body, 'reason'),
      });
    default:
      throw Object.assign(new Error('Campaign action is required.'), {
        code: 'CORE_VALIDATION_ERROR',
      });
  }
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function unauthenticated(requestId: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function stringBody(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
