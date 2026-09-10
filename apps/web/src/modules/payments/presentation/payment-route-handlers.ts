import { NextResponse } from 'next/server';
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  ReceivePaymentCommand,
  RefundPaymentCommand,
  RequestContext,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { PaymentListFilters, PaymentReceiveResult } from '../domain';

export type PaymentRouteService = {
  list(context: RequestContext, filters?: PaymentListFilters): Promise<Payment[]>;
  get(context: RequestContext, paymentId: string): Promise<Payment | null>;
  receivePayment(
    context: RequestContext,
    command: ReceivePaymentCommand,
  ): Promise<PaymentReceiveResult>;
  refundPayment(context: RequestContext, command: RefundPaymentCommand): Promise<Payment>;
};

export type PaymentRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: PaymentRouteService;
};

export function createPaymentRouteHandlers(dependencies: PaymentRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const url = new URL(request.url);
        const paymentId = optionalParam(url, 'id');
        if (paymentId) {
          const payment = await dependencies.service.get(context, paymentId);
          if (!payment)
            return jsonError('PAYMENT_NOT_FOUND', 'Payment was not found.', 404, context.requestId);
          return NextResponse.json({ data: payment, requestId: context.requestId });
        }

        const payments = await dependencies.service.list(context, paymentFiltersFromUrl(url));
        return NextResponse.json({ data: payments, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_BY_ID: async (request: Request, paymentId: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const payment = await dependencies.service.get(context, paymentId);
        if (!payment)
          return jsonError('PAYMENT_NOT_FOUND', 'Payment was not found.', 404, context.requestId);
        return NextResponse.json({ data: payment, requestId: context.requestId });
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
        const command = (await request.json()) as ReceivePaymentCommand;
        const result = await dependencies.service.receivePayment(context, command);
        return NextResponse.json({ data: result, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_REFUND: async (request: Request, paymentId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
        const body = (await request.json()) as RefundPaymentCommand;
        const payment = await dependencies.service.refundPayment(context, {
          ...body,
          paymentId: paymentId ?? body.paymentId,
        });
        return NextResponse.json({ data: payment, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function paymentFiltersFromUrl(url: URL): PaymentListFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    orderId: optionalParam(url, 'orderId'),
    status: optionalParam(url, 'status') as PaymentStatus | undefined,
    method: optionalParam(url, 'method') as PaymentMethod | undefined,
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

function compactFilters(filters: PaymentListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as PaymentListFilters;
}
