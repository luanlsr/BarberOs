import type {
  CashMovement,
  CashMovementType,
  CashRegisterSessionStatus,
  Payment,
  PaymentMethod,
  Permission,
  RequestContext,
  SessionContext,
} from '@barberos/contracts';

import { createSupabaseServerClient, getRequestContext } from './auth/server';
import { CashRegisterApplicationService } from '../src/modules/cash-register/application';
import { SupabaseCashRegisterRepository } from '../src/modules/cash-register/infrastructure';
import type { CashRegisterSummary } from '../src/modules/cash-register/domain';
import { calculateCapturedPaymentAmount } from '../src/modules/payments/application';
import { SupabasePaymentRepository } from '../src/modules/payments/infrastructure';

export type CashRegisterTone = 'neutral' | 'success' | 'warning' | 'danger';

export type CashRegisterSessionModel = {
  id: string;
  status: CashRegisterSessionStatus;
  statusLabel: string;
  statusTone: CashRegisterTone;
  openedAtLabel: string;
  closedAtLabel?: string;
  openingBalanceAmountCents: number;
  openingBalanceLabel: string;
  expectedBalanceAmountCents: number;
  expectedBalanceLabel: string;
  actualBalanceAmountCents?: number;
  actualBalanceLabel?: string;
  differenceAmountCents: number;
  differenceLabel: string;
  closingNotes?: string;
};

export type CashRegisterPaymentMethodTotalModel = {
  method: PaymentMethod;
  methodLabel: string;
  amountCents: number;
  amountLabel: string;
  count: number;
};

export type CashRegisterMovementModel = {
  id: string;
  type: CashMovementType;
  typeLabel: string;
  tone: CashRegisterTone;
  amountCents: number;
  amountLabel: string;
  signedAmountCents: number;
  signedAmountLabel: string;
  reason?: string;
  createdAtLabel: string;
  orderId?: string;
  paymentId?: string;
};

export type CashRegisterViewModel = {
  state: 'open' | 'no-open-session' | 'closed' | 'permission-denied' | 'error';
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  canOpen: boolean;
  canWithdraw: boolean;
  canCashIn: boolean;
  canClose: boolean;
  session?: CashRegisterSessionModel;
  methodTotals: readonly CashRegisterPaymentMethodTotalModel[];
  movements: readonly CashRegisterMovementModel[];
  error?: { code: string; message: string; requestId: string };
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  DEBIT_CARD: 'Debito',
  CREDIT_CARD: 'Credito',
  OTHER: 'Outro',
};

const movementLabels: Record<CashMovementType, string> = {
  OPENING_BALANCE: 'Abertura',
  SALE: 'Venda',
  REFUND: 'Estorno',
  WITHDRAWAL: 'Sangria',
  CASH_IN: 'Reforco',
  EXPENSE: 'Despesa',
  ADJUSTMENT: 'Ajuste',
};

const movementTones: Record<CashMovementType, CashRegisterTone> = {
  OPENING_BALANCE: 'neutral',
  SALE: 'success',
  REFUND: 'danger',
  WITHDRAWAL: 'warning',
  CASH_IN: 'success',
  EXPENSE: 'danger',
  ADJUSTMENT: 'neutral',
};

const developmentOpenSession: CashRegisterSummary = {
  id: 'dev-cash-session-open',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  status: 'OPEN',
  openedBy: 'dev-user',
  openedAt: '2026-09-07T11:00:00.000Z',
  openingBalanceAmountCents: 20_000,
  expectedBalanceAmountCents: 28_500,
  differenceAmountCents: 0,
  createdAt: '2026-09-07T11:00:00.000Z',
  updatedAt: '2026-09-07T16:10:00.000Z',
  movements: [
    {
      id: 'dev-cash-movement-opening',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      sessionId: 'dev-cash-session-open',
      type: 'OPENING_BALANCE',
      amountCents: 20_000,
      signedAmountCents: 20_000,
      reason: 'Troco inicial.',
      createdBy: 'dev-user',
      createdAt: '2026-09-07T11:00:00.000Z',
    },
    {
      id: 'dev-cash-movement-sale',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      sessionId: 'dev-cash-session-open',
      type: 'SALE',
      amountCents: 8_500,
      signedAmountCents: 8_500,
      orderId: 'dev-order-1001',
      paymentId: 'dev-payment-cash-sale',
      reason: 'Pagamento em dinheiro.',
      createdBy: 'dev-user',
      createdAt: '2026-09-07T15:20:00.000Z',
    },
  ],
  cashInAmountCents: 28_500,
  cashOutAmountCents: 0,
};

const developmentClosedSession: CashRegisterSummary = {
  ...developmentOpenSession,
  id: 'dev-cash-session-closed',
  status: 'CLOSED',
  actualBalanceAmountCents: 28_000,
  differenceAmountCents: -500,
  closedBy: 'dev-user',
  closedAt: '2026-09-07T22:00:00.000Z',
  closingNotes: 'Diferenca conferida no fechamento.',
  updatedAt: '2026-09-07T22:00:00.000Z',
  movements: [
    ...developmentOpenSession.movements,
    {
      id: 'dev-cash-movement-withdrawal',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      sessionId: 'dev-cash-session-closed',
      type: 'WITHDRAWAL',
      amountCents: 500,
      signedAmountCents: -500,
      reason: 'Sangria no fechamento.',
      createdBy: 'dev-user',
      createdAt: '2026-09-07T21:50:00.000Z',
    },
  ],
};

const developmentPayments: readonly Payment[] = [
  {
    id: 'dev-payment-cash-sale',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    orderId: 'dev-order-1001',
    method: 'CASH',
    status: 'PAID',
    amountCents: 8_500,
    cashReceivedAmountCents: 10_000,
    changeDueAmountCents: 1_500,
    idempotencyKey: 'dev-cash-payment-1',
    receivedBy: 'dev-user',
    receivedAt: '2026-09-07T15:20:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-07T15:20:00.000Z',
    updatedAt: '2026-09-07T15:20:00.000Z',
  },
  {
    id: 'dev-payment-pix-sale',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    orderId: 'dev-order-1002',
    method: 'PIX',
    status: 'PAID',
    amountCents: 7_000,
    changeDueAmountCents: 0,
    idempotencyKey: 'dev-pix-payment-1',
    receivedBy: 'dev-user',
    receivedAt: '2026-09-07T16:05:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-07T16:05:00.000Z',
    updatedAt: '2026-09-07T16:05:00.000Z',
  },
  {
    id: 'dev-payment-card-sale',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    orderId: 'dev-order-1003',
    method: 'CREDIT_CARD',
    status: 'PAID',
    amountCents: 12_000,
    changeDueAmountCents: 0,
    idempotencyKey: 'dev-card-payment-1',
    receivedBy: 'dev-user',
    receivedAt: '2026-09-07T16:10:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-07T16:10:00.000Z',
    updatedAt: '2026-09-07T16:10:00.000Z',
  },
];

export async function getCashRegisterViewModel(
  session: SessionContext,
  options: { state?: string } = {},
): Promise<CashRegisterViewModel> {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return {
      ...base,
      state: 'permission-denied',
      description: 'Seu perfil nao possui acesso ao caixa desta unidade.',
      methodTotals: [],
      movements: [],
    };
  }

  if (options.state === 'error') {
    return {
      ...base,
      state: 'error',
      description: 'Nao conseguimos carregar o caixa agora.',
      methodTotals: [],
      movements: [],
      error: {
        code: 'CASH_REGISTER_LOAD_FAILED',
        message: 'Nao conseguimos carregar o caixa agora.',
        requestId: 'local-cash-register-error',
      },
    };
  }

  const client = await createSupabaseServerClient();
  const requestContext = client
    ? await getRequestContext(crypto.randomUUID(), session.tenantId, branchId)
    : null;

  if (client && requestContext) {
    try {
      return await getPersistentCashRegisterViewModel(client, requestContext, session);
    } catch (error) {
      return {
        ...base,
        state: 'error',
        description: 'Nao conseguimos carregar o caixa agora.',
        methodTotals: [],
        movements: [],
        error: {
          code:
            error instanceof Error && 'code' in error
              ? String(error.code)
              : 'CASH_REGISTER_LOAD_FAILED',
          message: 'Nao conseguimos carregar o caixa agora.',
          requestId: requestContext.requestId,
        },
      };
    }
  }

  return getDevelopmentCashRegisterViewModel(session, options);
}

export function getDevelopmentCashRegisterViewModel(
  session: SessionContext,
  options: { state?: string } = {},
): CashRegisterViewModel {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return {
      ...base,
      state: 'permission-denied',
      description: 'Seu perfil nao possui acesso ao caixa desta unidade.',
      methodTotals: [],
      movements: [],
    };
  }

  if (options.state === 'error') {
    return {
      ...base,
      state: 'error',
      description: 'Nao conseguimos carregar o caixa agora.',
      methodTotals: [],
      movements: [],
      error: {
        code: 'CASH_REGISTER_LOAD_FAILED',
        message: 'Nao conseguimos carregar o caixa agora.',
        requestId: 'local-cash-register-error',
      },
    };
  }

  if (options.state === 'closed') {
    return toCashRegisterViewModel(base, developmentClosedSession, developmentPayments);
  }

  if (options.state === 'empty' || options.state === 'no-open-session') {
    return {
      ...base,
      state: 'no-open-session',
      description: 'Nenhum caixa aberto nesta unidade.',
      methodTotals: paymentMethodTotals([]),
      movements: [],
    };
  }

  return toCashRegisterViewModel(base, developmentOpenSession, developmentPayments);
}

async function getPersistentCashRegisterViewModel(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>> & {},
  context: RequestContext,
  session: SessionContext,
): Promise<CashRegisterViewModel> {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);
  const cashRegister = new SupabaseCashRegisterRepository(client);
  const service = new CashRegisterApplicationService(cashRegister);
  const currentSession = await service.getCurrentSession(context, { branchId });

  if (!currentSession) {
    return {
      ...base,
      state: 'no-open-session',
      description: 'Nenhum caixa aberto nesta unidade.',
      methodTotals: paymentMethodTotals([]),
      movements: [],
    };
  }

  const payments = await new SupabasePaymentRepository(client).list(context, {
    branchId,
    limit: 100,
  });

  return toCashRegisterViewModel(base, currentSession, payments);
}

function baseModel(
  session: SessionContext,
  branchId: string,
): Omit<CashRegisterViewModel, 'state' | 'methodTotals' | 'movements'> {
  const entitlements = session.entitlements ?? [];
  const hasFinanceEntitlement = entitlements.includes('finance');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Caixa',
    description: 'Sessao de caixa da unidade.',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead: hasPermission(session, 'finance.read') && hasFinanceEntitlement && hasBranch,
    canOpen: hasPermission(session, 'cash.open') && hasFinanceEntitlement && hasBranch,
    canWithdraw: hasPermission(session, 'cash.withdraw') && hasFinanceEntitlement && hasBranch,
    canCashIn: hasPermission(session, 'cash.open') && hasFinanceEntitlement && hasBranch,
    canClose: hasPermission(session, 'cash.close') && hasFinanceEntitlement && hasBranch,
  };
}

function toCashRegisterViewModel(
  base: Omit<CashRegisterViewModel, 'state' | 'methodTotals' | 'movements'>,
  session: CashRegisterSummary,
  payments: readonly Payment[],
): CashRegisterViewModel {
  const sessionModel = toSessionModel(session);
  const isOpen = session.status === 'OPEN';
  return {
    ...base,
    state: isOpen ? 'open' : 'closed',
    description: isOpen
      ? 'Caixa aberto com saldos, recebimentos e movimentos do dia.'
      : 'Caixa fechado com conferencia e diferenca registrada.',
    session: sessionModel,
    methodTotals: paymentMethodTotals(payments),
    movements: session.movements
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toMovementModel),
  };
}

function toSessionModel(session: CashRegisterSummary): CashRegisterSessionModel {
  return {
    id: session.id,
    status: session.status,
    statusLabel: session.status === 'OPEN' ? 'Aberto' : 'Fechado',
    statusTone: session.status === 'OPEN' ? 'success' : 'neutral',
    openedAtLabel: dateTimeFormatter.format(new Date(session.openedAt)),
    closedAtLabel: session.closedAt
      ? dateTimeFormatter.format(new Date(session.closedAt))
      : undefined,
    openingBalanceAmountCents: session.openingBalanceAmountCents,
    openingBalanceLabel: formatCurrency(session.openingBalanceAmountCents),
    expectedBalanceAmountCents: session.expectedBalanceAmountCents,
    expectedBalanceLabel: formatCurrency(session.expectedBalanceAmountCents),
    actualBalanceAmountCents: session.actualBalanceAmountCents,
    actualBalanceLabel:
      session.actualBalanceAmountCents === undefined
        ? undefined
        : formatCurrency(session.actualBalanceAmountCents),
    differenceAmountCents: session.differenceAmountCents,
    differenceLabel: formatSignedCurrency(session.differenceAmountCents),
    closingNotes: session.closingNotes,
  };
}

function toMovementModel(movement: CashMovement): CashRegisterMovementModel {
  return {
    id: movement.id,
    type: movement.type,
    typeLabel: movementLabels[movement.type],
    tone: movementTones[movement.type],
    amountCents: movement.amountCents,
    amountLabel: formatCurrency(movement.amountCents),
    signedAmountCents: movement.signedAmountCents,
    signedAmountLabel: formatSignedCurrency(movement.signedAmountCents),
    reason: movement.reason,
    createdAtLabel: dateTimeFormatter.format(new Date(movement.createdAt)),
    orderId: movement.orderId,
    paymentId: movement.paymentId,
  };
}

function paymentMethodTotals(payments: readonly Payment[]) {
  const totals = new Map<PaymentMethod, { amountCents: number; count: number }>();
  for (const payment of payments) {
    const amountCents = calculateCapturedPaymentAmount(payment);
    if (amountCents <= 0) continue;
    const current = totals.get(payment.method) ?? { amountCents: 0, count: 0 };
    totals.set(payment.method, {
      amountCents: current.amountCents + amountCents,
      count: current.count + 1,
    });
  }
  return Array.from(totals.entries()).map(([method, total]) => ({
    method,
    methodLabel: paymentMethodLabels[method],
    amountCents: total.amountCents,
    amountLabel: formatCurrency(total.amountCents),
    count: total.count,
  }));
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatSignedCurrency(cents: number) {
  const prefix = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return prefix + formatCurrency(Math.abs(cents));
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}
