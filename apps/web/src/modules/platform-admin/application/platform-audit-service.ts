import {
  platformAuditEntrySchema,
  platformAuditFilterSchema,
  type PlatformAuditEntry,
  type PlatformAuditFilter,
} from '@barberos/contracts';

import type { PlatformRequestContext } from '../domain';
import { authorizePlatformPermission } from './platform-authorization';

export type PlatformAuditRepository = {
  listAuditEntries(
    context: PlatformRequestContext,
    filters?: PlatformAuditFilter,
  ): Promise<PlatformAuditEntry[]>;
};

const sensitiveKeyPattern =
  /(secret|token|credential|password|api[_-]?key|webhook|card|payment|message|body|phone)/i;

export class PlatformAuditService {
  private readonly repository: PlatformAuditRepository;

  constructor(repository: PlatformAuditRepository) {
    this.repository = repository;
  }

  async listAuditEntries(context: PlatformRequestContext, filters?: unknown) {
    authorizePlatformPermission(context, 'platform.audit.read');
    const parsedFilters =
      filters === undefined ? undefined : platformAuditFilterSchema.parse(filters);
    const entries = await this.repository.listAuditEntries(context, parsedFilters);
    return entries.map((entry) => redactAuditEntry(platformAuditEntrySchema.parse(entry)));
  }
}

export function redactAuditEntry(entry: PlatformAuditEntry): PlatformAuditEntry {
  return {
    ...entry,
    metadata: redactValue(entry.metadata) as Record<string, unknown>,
  };
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[redacted]' : redactValue(item),
    ]),
  );
}
