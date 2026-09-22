import { NextResponse } from 'next/server';
import type { NotificationIntentStatus, RequestContext } from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { NotificationStatusFilters, NotificationStatusSummary } from '../application';

export type NotificationStatusRouteService = {
  list(
    context: RequestContext,
    filters?: NotificationStatusFilters,
  ): Promise<NotificationStatusSummary>;
};

export type NotificationStatusRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: NotificationStatusRouteService;
};

export function createNotificationStatusRouteHandlers(
  dependencies: NotificationStatusRouteDependencies,
) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const summary = await dependencies.service.list(
          context,
          compactFilters({
            branchId: optionalParam(url, 'branchId'),
            status: optionalParam(url, 'status') as NotificationIntentStatus | undefined,
            channel: optionalParam(url, 'channel') as NotificationStatusFilters['channel'],
            limit: optionalNumberParam(url, 'limit'),
          }),
        );
        return NextResponse.json({ data: summary, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compactFilters(filters: NotificationStatusFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as NotificationStatusFilters;
}
