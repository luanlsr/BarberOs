import { NextResponse } from 'next/server';
import type {
  NotificationIntentStatus,
  OutboxEventStatus,
  RequestContext,
  WorkerJobStatus,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { WorkerFailureFilters, WorkerFailureSummary } from '../application';

export type WorkerFailureRouteService = {
  summarize(context: RequestContext, filters?: WorkerFailureFilters): Promise<WorkerFailureSummary>;
};

export type WorkerFailureRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: WorkerFailureRouteService;
};

export function createWorkerFailureRouteHandlers(dependencies: WorkerFailureRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
      const context = await dependencies.resolveContext(request);
      if (!context)
        return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

      try {
        const url = new URL(request.url);
        const filters = compactFilters({
          branchId: optionalParam(url, 'branchId'),
          limit: optionalNumberParam(url, 'limit'),
          outboxStatus: optionalParam(url, 'outboxStatus') as OutboxEventStatus | undefined,
          jobStatus: optionalParam(url, 'jobStatus') as WorkerJobStatus | undefined,
          notificationStatus: optionalParam(url, 'notificationStatus') as
            NotificationIntentStatus | undefined,
        });
        const summary = await dependencies.service.summarize(context, filters);
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

function compactFilters(filters: WorkerFailureFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as WorkerFailureFilters;
}
