import type { TenantSubscription, TenantSubscriptionStatus } from '@barberos/contracts';

import { createSupabaseServerClient, getRequestContext } from '../../../../../lib/auth/server';
import { SubscriptionBillingService } from '../../../../../src/modules/platform-admin/application';
import type { PlatformRequestContext } from '../../../../../src/modules/platform-admin/domain';
import {
  SupabasePlatformAuditSink,
  SupabasePlatformBillingRepository,
} from '../../../../../src/modules/platform-admin/infrastructure';
import {
  createPlatformSubscriptionRouteHandlers,
  type SubscriptionRouteResult,
} from '../../../../../src/modules/platform-admin/presentation';

export function buildPlatformSubscriptionRouteHandlers() {
  return createPlatformSubscriptionRouteHandlers({
    resolveContext,
    service: {
      async listSubscriptions(context: PlatformRequestContext): Promise<SubscriptionRouteResult[]> {
        return (await getSubscriptionBillingService()).listSubscriptions(context);
      },
      async assignSubscription(
        context: PlatformRequestContext,
        command: unknown,
      ): Promise<TenantSubscription> {
        return (await getSubscriptionBillingService()).assignSubscription(context, command);
      },
      async updateSubscriptionStatus(
        context: PlatformRequestContext,
        command: { subscriptionId: string; status: unknown; reason: string },
      ): Promise<SubscriptionRouteResult> {
        return (await getSubscriptionBillingService()).updateSubscriptionStatus(context, {
          subscriptionId: command.subscriptionId,
          status: command.status as TenantSubscriptionStatus,
          reason: command.reason,
        });
      },
    },
  });
}

export async function resolveContext(request: Request): Promise<PlatformRequestContext | null> {
  const context = await getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
  );
  if (!context) {
    return null;
  }

  return {
    requestId: context.requestId,
    userId: context.userId,
    role: context.role,
    permissions: context.permissions,
  };
}

export async function getSubscriptionBillingService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }

  return new SubscriptionBillingService({
    repository: new SupabasePlatformBillingRepository(client),
    auditSink: new SupabasePlatformAuditSink(client),
  });
}
