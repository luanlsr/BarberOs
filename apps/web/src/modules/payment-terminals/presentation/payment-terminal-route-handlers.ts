import { NextResponse } from 'next/server';
import type {
  CreatePaymentTerminalIntentCommand,
  PaymentTerminal,
  PaymentTerminalIntent,
  RequestContext,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type PaymentTerminalRouteService = {
  listTerminals(
    context: RequestContext,
    filters?: { branchId?: string },
  ): Promise<PaymentTerminal[]>;
  createIntent(
    context: RequestContext,
    command: CreatePaymentTerminalIntentCommand,
  ): Promise<PaymentTerminalIntent>;
};

export type PaymentTerminalRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: PaymentTerminalRouteService;
};

export function createPaymentTerminalRouteHandlers(dependencies: PaymentTerminalRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const url = new URL(request.url);
        const terminals = await dependencies.service.listTerminals(context, {
          branchId: url.searchParams.get('branchId') ?? undefined,
        });
        return NextResponse.json({ data: terminals, requestId: context.requestId });
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
        const command = (await request.json()) as CreatePaymentTerminalIntentCommand;
        const intent = await dependencies.service.createIntent(context, command);
        return NextResponse.json({ data: intent, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}
