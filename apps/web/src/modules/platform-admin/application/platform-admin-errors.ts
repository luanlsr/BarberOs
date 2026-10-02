export type PlatformAdminApplicationErrorCode =
  | 'PLATFORM_ADMIN_VALIDATION_ERROR'
  | 'PLATFORM_ADMIN_NOT_FOUND'
  | 'PLATFORM_ADMIN_INVALID_STATUS'
  | 'PLATFORM_ADMIN_AUDIT_REQUIRED'
  | 'PLATFORM_ADMIN_DUPLICATE_CODE';

export class PlatformAdminApplicationError extends Error {
  readonly code: PlatformAdminApplicationErrorCode;

  constructor(code: PlatformAdminApplicationErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PlatformAdminApplicationError';
    this.code = code;
  }
}
