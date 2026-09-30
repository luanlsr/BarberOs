import type { CreateMessagingConnectionCommand, RequestContext } from '@barberos/contracts';
import { createSupabaseServerClient, getRequestContext } from '../../../../lib/auth/server';
import { MessagingApplicationService } from '../../../../src/modules/messaging/application';
import type {
  MessagingConnectionFilters,
  MessagingConversationFilters,
  MessagingMessageFilters,
} from '../../../../src/modules/messaging/domain';
import {
  SupabaseMessagingAuditSink,
  SupabaseMessagingRepository,
} from '../../../../src/modules/messaging/infrastructure';
import {
  createMessagingConnectionRouteHandlers,
  createMessagingConversationRouteHandlers,
} from '../../../../src/modules/messaging/presentation';

export function buildMessagingConnectionRouteHandlers() {
  return createMessagingConnectionRouteHandlers({
    resolveContext,
    service: {
      async listConnections(context: RequestContext, filters?: MessagingConnectionFilters) {
        return (await getMessagingApplicationService()).listConnections(context, filters ?? {});
      },
      async createConnection(context: RequestContext, command: CreateMessagingConnectionCommand) {
        return (await getMessagingApplicationService()).createConnection(context, command);
      },
      async listConversations(context: RequestContext, filters?: MessagingConversationFilters) {
        return (await getMessagingApplicationService()).listConversations(context, filters ?? {});
      },
      async listMessages(context: RequestContext, filters: MessagingMessageFilters) {
        return (await getMessagingApplicationService()).listMessages(context, filters);
      },
    },
  });
}

export function buildMessagingConversationRouteHandlers() {
  return createMessagingConversationRouteHandlers({
    resolveContext,
    service: {
      async listConnections(context: RequestContext, filters?: MessagingConnectionFilters) {
        return (await getMessagingApplicationService()).listConnections(context, filters ?? {});
      },
      async createConnection(context: RequestContext, command: CreateMessagingConnectionCommand) {
        return (await getMessagingApplicationService()).createConnection(context, command);
      },
      async listConversations(context: RequestContext, filters?: MessagingConversationFilters) {
        return (await getMessagingApplicationService()).listConversations(context, filters ?? {});
      },
      async listMessages(context: RequestContext, filters: MessagingMessageFilters) {
        return (await getMessagingApplicationService()).listMessages(context, filters);
      },
    },
  });
}

function resolveContext(request: Request) {
  const url = new URL(request.url);
  return getRequestContext(
    request.headers.get('x-request-id') ?? crypto.randomUUID(),
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function getMessagingApplicationService() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw Object.assign(new Error('Persistence is not configured.'), {
      code: 'PERSISTENCE_NOT_CONFIGURED',
    });
  }
  return new MessagingApplicationService(
    new SupabaseMessagingRepository(client),
    new SupabaseMessagingAuditSink(client),
  );
}
