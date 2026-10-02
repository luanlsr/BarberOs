import type { BillingInvoiceSummary, TenantSubscription } from '@barberos/contracts';
import { NextResponse } from 'next/server';

import { PlatformAdminApplicationError } from '../application/platform-admin-errors';
import type { PlatformRequestContext } from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type SubscriptionRouteResult = {
  subscription: TenantSubscription;
  restrictsTenantAccess: boolean;
};

export type PlatformSubscriptionRouteService = {
  listSubscriptions(context: PlatformRequestContext): Promise<SubscriptionRouteResult[]>;
  assignSubscription(
    context: PlatformRequestContext,
    command: unknown,
  ): Promise<TenantSubscription>;
  updateSubscriptionStatus(
    context: PlatformRequestContext,
    command: { subscriptionId: string; status: unknown; reason: string },
  ): Promise<SubscriptionRouteResult>;
};

export type PlatformInvoiceRouteService = {
  listInvoices(context: PlatformRequestContext): Promise<BillingInvoiceSummary[]>;
};

export type PlatformRouteDependencies<Service> = {
  resolveContext(
    request: Request,
  ): Promise<PlatformRequestContext | null> | PlatformRequestContext | null;
  service: Service;
};

export function createPlatformSubscriptionRouteHandlers(
  dependencies: PlatformRouteDependencies<PlatformSubscriptionRouteService>,
) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const data = await service.listSubscriptions(context);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async POST(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const command = await readJsonObject(request, 'Subscription command payload is required.');
        const data = await service.assignSubscription(context, command);
        return NextResponse.json({ data, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    async PATCH(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const body = await readJsonObject(
          request,
          'Subscription status command payload is required.',
        );
        const command = subscriptionStatusCommandFromBody(body);
        const data = await service.updateSubscriptionStatus(context, command);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createPlatformInvoiceRouteHandlers(
  dependencies: PlatformRouteDependencies<PlatformInvoiceRouteService>,
) {
  const { resolveContext, service } = dependencies;

  return {
    async GET(request: Request) {
      const requestId = getRequestId(request);
      const context = await resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const data = await service.listInvoices(context);
        return NextResponse.json({ data, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

function subscriptionStatusCommandFromBody(body: Record<string, unknown>) {
  const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';
  if (!subscriptionId || !body.status || !reason) {
    throw new PlatformAdminApplicationError(
      'PLATFORM_ADMIN_VALIDATION_ERROR',
      'Subscription status updates require subscriptionId, status and reason.',
    );
  }

  return {
    subscriptionId,
    status: body.status,
    reason,
  };
}

async function readJsonObject(request: Request, message: string): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Expected JSON object.');
    }
    return body as Record<string, unknown>;
  } catch {
    throw new PlatformAdminApplicationError('PLATFORM_ADMIN_VALIDATION_ERROR', message);
  }
}

function getRequestId(request: Request) {
  return request.headers.get('x-request-id') ?? undefined;
}

function unauthenticated(requestId?: string) {
  return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
}
