import { NextResponse } from 'next/server';
import type {
  CreateMessagingConnectionCommand,
  MessagingConnection,
  MessagingConversation,
  MessagingMessage,
  RequestContext,
} from '@barberos/contracts';

import type {
  MessagingConnectionFilters,
  MessagingConversationFilters,
  MessagingMessageFilters,
} from '../domain';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type MessagingRouteService = {
  listConnections(
    context: RequestContext,
    filters?: MessagingConnectionFilters,
  ): Promise<MessagingConnection[]>;
  createConnection(
    context: RequestContext,
    command: CreateMessagingConnectionCommand,
  ): Promise<MessagingConnection>;
  listConversations(
    context: RequestContext,
    filters?: MessagingConversationFilters,
  ): Promise<MessagingConversation[]>;
  listMessages(
    context: RequestContext,
    filters: MessagingMessageFilters,
  ): Promise<MessagingMessage[]>;
};

export type MessagingRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null> | RequestContext | null;
  service: MessagingRouteService;
};

export function createMessagingConnectionRouteHandlers(dependencies: MessagingRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const connections = await dependencies.service.listConnections(
          context,
          compact({
            branchId: optionalParam(url, 'branchId'),
            status: optionalParam(url, 'status') as MessagingConnectionFilters['status'],
            provider: optionalParam(url, 'provider') as MessagingConnectionFilters['provider'],
          }),
        );
        return NextResponse.json({ data: connections, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },

    POST: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const connection = await dependencies.service.createConnection(
          context,
          (await request.json()) as CreateMessagingConnectionCommand,
        );
        return NextResponse.json(
          { data: connection, requestId: context.requestId },
          { status: 201 },
        );
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
}

export function createMessagingConversationRouteHandlers(dependencies: MessagingRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = getRequestId(request);
      const context = await dependencies.resolveContext(request);
      if (!context) return unauthenticated(requestId);

      try {
        const url = new URL(request.url);
        const conversationId = optionalParam(url, 'conversationId');
        if (conversationId) {
          const messages = await dependencies.service.listMessages(
            context,
            compact({
              conversationId,
              limit: optionalNumberParam(url, 'limit'),
              cursor: optionalParam(url, 'cursor'),
            }) as MessagingMessageFilters,
          );
          return NextResponse.json({ data: messages, requestId: context.requestId });
        }

        const conversations = await dependencies.service.listConversations(
          context,
          compact({
            branchId: optionalParam(url, 'branchId'),
            status: optionalParam(url, 'status') as MessagingConversationFilters['status'],
            customerId: optionalParam(url, 'customerId'),
            connectionId: optionalParam(url, 'connectionId'),
            limit: optionalNumberParam(url, 'limit'),
            cursor: optionalParam(url, 'cursor'),
          }),
        );
        return NextResponse.json({ data: conversations, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context.requestId);
      }
    },
  };
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

function optionalNumberParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
