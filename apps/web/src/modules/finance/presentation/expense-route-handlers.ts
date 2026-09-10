import { NextResponse } from 'next/server';
import type {
  CancelExpenseCommand,
  CreateExpenseCommand,
  Expense,
  ExpenseListResponse,
  ExpenseStatus,
  PayExpenseCommand,
  RequestContext,
  UpdateExpenseCommand,
} from '@barberos/contracts';

import { jsonError, jsonFromError } from '../../shared/presentation/api';
import type { ExpenseListFilters } from '../domain';

export type ExpenseRouteService = {
  listExpenses(context: RequestContext, filters?: ExpenseListFilters): Promise<ExpenseListResponse>;
  createExpense(context: RequestContext, command: CreateExpenseCommand): Promise<Expense>;
  updateExpense(context: RequestContext, command: UpdateExpenseCommand): Promise<Expense>;
  payExpense(context: RequestContext, command: PayExpenseCommand): Promise<Expense>;
  cancelExpense(context: RequestContext, command: CancelExpenseCommand): Promise<Expense>;
};

export type ExpenseRouteDependencies = {
  resolveContext(request: Request): Promise<RequestContext | null>;
  service: ExpenseRouteService;
};

export function createExpenseRouteHandlers(dependencies: ExpenseRouteDependencies) {
  return {
    GET: async (request: Request) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const response = await dependencies.service.listExpenses(
          context,
          expenseFiltersFromUrl(new URL(request.url)),
        );
        return NextResponse.json({ data: response, requestId: context.requestId });
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

        const command = (await request.json()) as CreateExpenseCommand;
        const expense = await dependencies.service.createExpense(context, command);
        return NextResponse.json({ data: expense, requestId: context.requestId }, { status: 201 });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    PATCH: async (request: Request, expenseId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as UpdateExpenseCommand;
        const expense = await dependencies.service.updateExpense(context, {
          ...body,
          id: expenseId ?? body.id,
        });
        return NextResponse.json({ data: expense, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_PAY: async (request: Request, expenseId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as PayExpenseCommand;
        const expense = await dependencies.service.payExpense(context, {
          ...body,
          expenseId: expenseId ?? body.expenseId,
        });
        return NextResponse.json({ data: expense, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },

    POST_CANCEL: async (request: Request, expenseId?: string) => {
      const requestId = requestIdFrom(request);
      let context: RequestContext | null = null;
      try {
        context = await dependencies.resolveContext(request);
        if (!context)
          return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);

        const body = (await request.json()) as CancelExpenseCommand;
        const expense = await dependencies.service.cancelExpense(context, {
          ...body,
          expenseId: expenseId ?? body.expenseId,
        });
        return NextResponse.json({ data: expense, requestId: context.requestId });
      } catch (error) {
        return jsonFromError(error, context?.requestId ?? requestId);
      }
    },
  };
}

function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function expenseFiltersFromUrl(url: URL): ExpenseListFilters {
  return compactFilters({
    branchId: optionalParam(url, 'branchId'),
    categoryId: optionalParam(url, 'categoryId'),
    status: optionalParam(url, 'status') as ExpenseStatus | undefined,
    periodStart: optionalParam(url, 'periodStart'),
    periodEnd: optionalParam(url, 'periodEnd'),
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

function compactFilters<T extends Record<string, unknown>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}
