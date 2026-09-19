import { NextResponse } from 'next/server';
import type {
  FinanceSummary,
  FinancialEntry,
  FinancialEntrySourceType,
  FinancialEntryType,
  RequestContext,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/finance-service';
import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { FinancialEntryFilters, FinanceSummaryFilters } from '../domain';

export type FinanceRouteService = {
  getSummary(context: RequestContext, filters: FinanceSummaryFilters): Promise<FinanceSummary>;
  listEntries(context: RequestContext, filters: FinancialEntryFilters): Promise<FinancialEntry[]>;
};

export type FinanceRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: FinanceRouteService;
};

export function createFinanceRouteHandlers(dependencies: FinanceRouteDependencies) {
  return {
    GET_SUMMARY: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const summary = await dependencies.service.getSummary(
          context,
          financeSummaryFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: summary, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_ENTRIES: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const entries = await dependencies.service.listEntries(
          context,
          financialEntryFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: entries, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function financeSummaryFiltersFromUrl(url: URL): FinanceSummaryFilters {
  return compactFilters({
    periodStart: requiredDateParam(url, 'periodStart'),
    periodEnd: requiredDateParam(url, 'periodEnd'),
    branchId: optionalParam(url, 'branchId'),
  });
}

function financialEntryFiltersFromUrl(url: URL): FinancialEntryFilters {
  return compactFilters({
    periodStart: requiredDateParam(url, 'periodStart'),
    periodEnd: requiredDateParam(url, 'periodEnd'),
    branchId: optionalParam(url, 'branchId'),
    type: optionalParam(url, 'type') as FinancialEntryType | undefined,
    sourceType: optionalParam(url, 'sourceType') as FinancialEntrySourceType | undefined,
    sourceId: optionalParam(url, 'sourceId'),
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

function requiredDateParam(url: URL, key: string) {
  const value = optionalParam(url, key);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CoreOperationsApplicationError(
      'FINANCE_VALIDATION_ERROR',
      'Finance periodStart and periodEnd query parameters are required.',
    );
  }
  return value;
}

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
