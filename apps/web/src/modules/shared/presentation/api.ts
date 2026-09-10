import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { CoreOperationsErrorCode } from '@barberos/contracts';

type ApiErrorCode = CoreOperationsErrorCode | 'UNAUTHENTICATED' | 'PERSISTENCE_NOT_CONFIGURED';

const safePublicMessages: Partial<Record<ApiErrorCode, string>> = {
  CORE_PERMISSION_DENIED: 'Permission denied.',
  CORE_ENTITLEMENT_DENIED: 'Entitlement denied.',
  CORE_BRANCH_SCOPE_DENIED: 'Branch scope denied.',
  ORDER_PERMISSION_DENIED: 'Permission denied.',
  ORDER_BRANCH_SCOPE_DENIED: 'Order is outside the authorized scope.',
  ORDER_NOT_FOUND: 'Order was not found.',
  PAYMENT_PERMISSION_DENIED: 'Permission denied.',
  PAYMENT_BRANCH_SCOPE_DENIED: 'Payment is outside the authorized scope.',
  PAYMENT_NOT_FOUND: 'Payment was not found.',
  PAYMENT_IDEMPOTENCY_CONFLICT: 'Payment request conflicts with an existing idempotency key.',
  CASH_REGISTER_PERMISSION_DENIED: 'Permission denied.',
  CASH_REGISTER_BRANCH_SCOPE_DENIED: 'Cash register is outside the authorized scope.',
  CASH_REGISTER_NOT_FOUND: 'Cash register session was not found.',
  CASH_REGISTER_ALREADY_OPEN: 'Cash register already has an open session.',
  CASH_REGISTER_NOT_OPEN: 'Cash register session is not open.',
  FINANCE_PERMISSION_DENIED: 'Permission denied.',
  FINANCE_BRANCH_SCOPE_DENIED: 'Financial data is outside the authorized scope.',
  FINANCE_ENTITLEMENT_DENIED: 'Entitlement denied.',
  FINANCE_NOT_FOUND: 'Financial record was not found.',
  FINANCE_IDEMPOTENCY_CONFLICT: 'Finance request conflicts with an existing idempotency key.',
  FINANCE_IMMUTABLE_ENTRY: 'Financial history cannot be changed destructively.',
  FINANCE_CASH_REGISTER_NOT_OPEN: 'Cash register session is not open.',
  FINANCE_VALIDATION_ERROR: 'Finance request payload is invalid.',
  COMMISSION_PERMISSION_DENIED: 'Permission denied.',
  COMMISSION_BRANCH_SCOPE_DENIED: 'Commission data is outside the authorized scope.',
  COMMISSION_ENTITLEMENT_DENIED: 'Entitlement denied.',
  COMMISSION_NOT_FOUND: 'Commission record was not found.',
  COMMISSION_RULE_NOT_FOUND: 'Commission rule was not found.',
  COMMISSION_IDEMPOTENCY_CONFLICT: 'Commission request conflicts with an existing idempotency key.',
  COMMISSION_IMMUTABLE_ACCRUAL: 'Commission history cannot be changed destructively.',
  COMMISSION_VALIDATION_ERROR: 'Commission request payload is invalid.',
  PAYOUT_PERMISSION_DENIED: 'Permission denied.',
  PAYOUT_BRANCH_SCOPE_DENIED: 'Payout is outside the authorized scope.',
  PAYOUT_ENTITLEMENT_DENIED: 'Entitlement denied.',
  PAYOUT_NOT_FOUND: 'Payout was not found.',
  PAYOUT_IDEMPOTENCY_CONFLICT: 'Payout request conflicts with an existing idempotency key.',
  PAYOUT_IMMUTABLE: 'Payout history cannot be changed destructively.',
  PAYOUT_CASH_REGISTER_NOT_OPEN: 'Cash register session is not open.',
  PAYOUT_VALIDATION_ERROR: 'Payout request payload is invalid.',
  PAYOUT_INVALID_STATUS: 'Payout status does not allow this operation.',
};

export function jsonError(code: ApiErrorCode, message: string, status: number, requestId?: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}

export function jsonFromError(error: unknown, requestId?: string) {
  if (error instanceof ZodError) {
    return jsonError('CORE_VALIDATION_ERROR', 'Request payload is invalid.', 400, requestId);
  }

  const code = getErrorCode(error);
  switch (code) {
    case 'CORE_PERMISSION_DENIED':
    case 'CORE_ENTITLEMENT_DENIED':
    case 'CORE_BRANCH_SCOPE_DENIED':
      return jsonError(code, getPublicErrorMessage(error, code), 403, requestId);
    case 'PERMISSION_DENIED':
      return jsonError(
        'CORE_PERMISSION_DENIED',
        getPublicErrorMessage(error, 'CORE_PERMISSION_DENIED'),
        403,
        requestId,
      );
    case 'ENTITLEMENT_DENIED':
      return jsonError(
        'CORE_ENTITLEMENT_DENIED',
        getPublicErrorMessage(error, 'CORE_ENTITLEMENT_DENIED'),
        403,
        requestId,
      );
    case 'BRANCH_SCOPE_DENIED':
      return jsonError(
        'CORE_BRANCH_SCOPE_DENIED',
        getPublicErrorMessage(error, 'CORE_BRANCH_SCOPE_DENIED'),
        403,
        requestId,
      );
    case 'PERSISTENCE_NOT_CONFIGURED':
      return jsonError(
        'PERSISTENCE_NOT_CONFIGURED',
        getPublicErrorMessage(error, 'PERSISTENCE_NOT_CONFIGURED'),
        503,
        requestId,
      );
    case 'CORE_NOT_FOUND':
    case 'ORDER_NOT_FOUND':
    case 'PAYMENT_NOT_FOUND':
    case 'CASH_REGISTER_NOT_FOUND':
    case 'FINANCE_NOT_FOUND':
    case 'COMMISSION_NOT_FOUND':
    case 'COMMISSION_RULE_NOT_FOUND':
    case 'PAYOUT_NOT_FOUND':
      return jsonError(code, getPublicErrorMessage(error, code), 404, requestId);
    case 'APPOINTMENT_CONFLICT':
    case 'ORDER_ALREADY_OPEN_FOR_APPOINTMENT':
    case 'ORDER_IDEMPOTENCY_CONFLICT':
    case 'PAYMENT_IDEMPOTENCY_CONFLICT':
    case 'CASH_REGISTER_ALREADY_OPEN':
    case 'CASH_REGISTER_NOT_OPEN':
    case 'FINANCE_IDEMPOTENCY_CONFLICT':
    case 'FINANCE_IMMUTABLE_ENTRY':
    case 'FINANCE_CASH_REGISTER_NOT_OPEN':
    case 'COMMISSION_IDEMPOTENCY_CONFLICT':
    case 'COMMISSION_IMMUTABLE_ACCRUAL':
    case 'PAYOUT_IDEMPOTENCY_CONFLICT':
    case 'PAYOUT_IMMUTABLE':
    case 'PAYOUT_CASH_REGISTER_NOT_OPEN':
      return jsonError(code, getPublicErrorMessage(error, code), 409, requestId);
    case 'ORDER_PERMISSION_DENIED':
    case 'ORDER_BRANCH_SCOPE_DENIED':
    case 'PAYMENT_PERMISSION_DENIED':
    case 'PAYMENT_BRANCH_SCOPE_DENIED':
    case 'CASH_REGISTER_PERMISSION_DENIED':
    case 'CASH_REGISTER_BRANCH_SCOPE_DENIED':
    case 'FINANCE_PERMISSION_DENIED':
    case 'FINANCE_BRANCH_SCOPE_DENIED':
    case 'FINANCE_ENTITLEMENT_DENIED':
    case 'COMMISSION_PERMISSION_DENIED':
    case 'COMMISSION_BRANCH_SCOPE_DENIED':
    case 'COMMISSION_ENTITLEMENT_DENIED':
    case 'PAYOUT_PERMISSION_DENIED':
    case 'PAYOUT_BRANCH_SCOPE_DENIED':
    case 'PAYOUT_ENTITLEMENT_DENIED':
      return jsonError(code, getPublicErrorMessage(error, code), 403, requestId);
    case 'APPOINTMENT_INVALID_TRANSITION':
    case 'CHECK_IN_INVALID_APPOINTMENT_STATUS':
    case 'ORDER_INVALID_STATUS':
    case 'ORDER_ITEM_INVALID':
    case 'ORDER_VALIDATION_ERROR':
    case 'PAYMENT_VALIDATION_ERROR':
    case 'PAYMENT_INVALID_STATUS':
    case 'PAYMENT_AMOUNT_DUE_MISMATCH':
    case 'CASH_REGISTER_VALIDATION_ERROR':
    case 'CASH_REGISTER_INVALID_STATUS':
    case 'CASH_MOVEMENT_INVALID':
    case 'FINANCE_VALIDATION_ERROR':
    case 'COMMISSION_VALIDATION_ERROR':
    case 'PAYOUT_VALIDATION_ERROR':
    case 'PAYOUT_INVALID_STATUS':
    case 'CORE_VALIDATION_ERROR':
      return jsonError(code, getPublicErrorMessage(error, code), 400, requestId);
    default:
      return jsonError('CORE_VALIDATION_ERROR', 'Request could not be processed.', 400, requestId);
  }
}

function getErrorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getPublicErrorMessage(error: unknown, code: ApiErrorCode) {
  return safePublicMessages[code] ?? getErrorMessage(error, code);
}
