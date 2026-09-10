import { NextResponse } from 'next/server';
import type {
  CommissionRule,
  CommissionRuleStatus,
  CreateCommissionRuleCommand,
  OrderItemSourceType,
  RequestContext,
  UpdateCommissionRuleCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { CommissionRuleFilters } from '../domain';

export type CommissionRuleRouteService = {
  listRules(context: RequestContext, filters?: CommissionRuleFilters): Promise<CommissionRule[]>;
  createRule(
    context: RequestContext,
    command: CreateCommissionRuleCommand,
  ): Promise<CommissionRule>;
  updateRule(
    context: RequestContext,
    command: UpdateCommissionRuleCommand,
  ): Promise<CommissionRule>;
};

export type CommissionRuleRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CommissionRuleRouteService;
};

export function createCommissionRuleRouteHandlers(dependencies: CommissionRuleRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const rules = await dependencies.service.listRules(
          context,
          commissionRuleFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: rules, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const command = (await request.json()) as CreateCommissionRuleCommand;
        const rule = await dependencies.service.createRule(context, command);
        return NextResponse.json({ data: rule, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    PATCH: async (request: Request, ruleId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as UpdateCommissionRuleCommand;
        const rule = await dependencies.service.updateRule(context, {
          ...body,
          id: ruleId ?? body.id,
        });
        return NextResponse.json({ data: rule, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function commissionRuleFiltersFromUrl(url: URL): CommissionRuleFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    professionalId: optionalParam(url, 'professionalId'),
    sourceType: optionalParam(url, 'sourceType') as OrderItemSourceType | undefined,
    sourceId: optionalParam(url, 'sourceId'),
    status: optionalParam(url, 'status') as CommissionRuleStatus | undefined,
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value ? Number(value) : undefined;
}

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
