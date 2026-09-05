import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { CoreOperationsErrorCode } from '@barberos/contracts';

type ApiErrorCode = CoreOperationsErrorCode | 'UNAUTHENTICATED' | 'PERSISTENCE_NOT_CONFIGURED';

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
      return jsonError(code, getErrorMessage(error, code), 403, requestId);
    case 'PERMISSION_DENIED':
      return jsonError('CORE_PERMISSION_DENIED', getErrorMessage(error, 'Permission denied.'), 403, requestId);
    case 'ENTITLEMENT_DENIED':
      return jsonError('CORE_ENTITLEMENT_DENIED', getErrorMessage(error, 'Entitlement denied.'), 403, requestId);
    case 'BRANCH_SCOPE_DENIED':
      return jsonError('CORE_BRANCH_SCOPE_DENIED', getErrorMessage(error, 'Branch scope denied.'), 403, requestId);
    case 'PERSISTENCE_NOT_CONFIGURED':
      return jsonError('PERSISTENCE_NOT_CONFIGURED', getErrorMessage(error, 'Persistence is not configured.'), 503, requestId);
    case 'CORE_NOT_FOUND':
      return jsonError(code, getErrorMessage(error, code), 404, requestId);
    case 'APPOINTMENT_CONFLICT':
      return jsonError(code, getErrorMessage(error, code), 409, requestId);
    case 'APPOINTMENT_INVALID_TRANSITION':
    case 'CORE_VALIDATION_ERROR':
      return jsonError(code, getErrorMessage(error, code), 400, requestId);
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