import type { CoreOperationsErrorCode } from '@barberos/contracts';

export class CoreOperationsApplicationError extends Error {
  readonly code: CoreOperationsErrorCode;

  constructor(code: CoreOperationsErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CoreOperationsApplicationError';
    this.code = code;
  }
}