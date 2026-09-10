import { NextResponse } from 'next/server';
import type {
  ClosePayoutCommand,
  CommissionAccrual,
  CommissionAccrualStatus,
  CorrectPayoutCommand,
  PayPayoutCommand,
  PayoutDetail,
  ProfessionalWallet,
  RequestContext,
} from '@barberos/contracts';

import { CoreOperationsApplicationError } from '../application/commission-service';
import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { CommissionAccrualFilters, ProfessionalWalletFilters } from '../domain';

export type CommissionRouteService = {
  listAccruals(
    context: RequestContext,
    filters?: CommissionAccrualFilters,
  ): Promise<CommissionAccrual[]>;
  getProfessionalWallet(
    context: RequestContext,
    filters: ProfessionalWalletFilters,
  ): Promise<ProfessionalWallet>;
  closePayout(context: RequestContext, command: ClosePayoutCommand): Promise<PayoutDetail>;
  payPayout(context: RequestContext, command: PayPayoutCommand): Promise<PayoutDetail>;
  correctPayout(context: RequestContext, command: CorrectPayoutCommand): Promise<PayoutDetail>;
};

export type CommissionRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: CommissionRouteService;
};

export function createCommissionRouteHandlers(dependencies: CommissionRouteDependencies) {
  return {
    GET_ACCRUALS: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const accruals = await dependencies.service.listAccruals(
          context,
          accrualFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: accruals, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    GET_WALLET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const wallet = await dependencies.service.getProfessionalWallet(
          context,
          walletFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: wallet, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_PAYOUT: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const command = (await request.json()) as ClosePayoutCommand;
        const payout = await dependencies.service.closePayout(context, command);
        return NextResponse.json({ data: payout, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_PAY_PAYOUT: async (request: Request, payoutId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as PayPayoutCommand;
        const payout = await dependencies.service.payPayout(context, {
          ...body,
          payoutId: payoutId ?? body.payoutId,
        });
        return NextResponse.json({ data: payout, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_CORRECT_PAYOUT: async (request: Request, payoutId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as CorrectPayoutCommand;
        const payout = await dependencies.service.correctPayout(context, {
          ...body,
          payoutId: payoutId ?? body.payoutId,
        });
        return NextResponse.json({ data: payout, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function accrualFiltersFromUrl(url: URL): CommissionAccrualFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    professionalId: optionalParam(url, 'professionalId'),
    status: optionalParam(url, 'status') as CommissionAccrualStatus | undefined,
    payoutId: optionalParam(url, 'payoutId'),
    orderId: optionalParam(url, 'orderId'),
    periodStart: optionalDateParam(url, 'periodStart'),
    periodEnd: optionalDateParam(url, 'periodEnd'),
    limit: optionalNumberParam(url, 'limit'),
    cursor: optionalParam(url, 'cursor'),
  });
}

function walletFiltersFromUrl(url: URL): ProfessionalWalletFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    professionalId: requiredParam(url, 'professionalId'),
    periodStart: requiredDateParam(url, 'periodStart'),
    periodEnd: requiredDateParam(url, 'periodEnd'),
  });
}

function optionalParam(url: URL, key: string) {
  return url.searchParams.get(key) ?? undefined;
}

function optionalDateParam(url: URL, key: string) {
  const value = optionalParam(url, key);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_VALIDATION_ERROR',
      'Commission period query parameters must use YYYY-MM-DD.',
    );
  }
  return value;
}

function requiredParam(url: URL, key: string) {
  const value = optionalParam(url, key);
  if (!value) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_VALIDATION_ERROR',
      'Professional wallet requires professionalId, periodStart and periodEnd query parameters.',
    );
  }
  return value;
}

function requiredDateParam(url: URL, key: string) {
  const value = requiredParam(url, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CoreOperationsApplicationError(
      'COMMISSION_VALIDATION_ERROR',
      'Professional wallet requires periodStart and periodEnd query parameters as YYYY-MM-DD.',
    );
  }
  return value;
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
