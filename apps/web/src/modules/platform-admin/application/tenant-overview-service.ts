import { platformTenantSummarySchema, type PlatformTenantSummary } from '@barberos/contracts';

import type { PlatformRequestContext, TenantOverviewFilters } from '../domain';
import { authorizePlatformPermission } from './platform-authorization';

export type TenantOverviewReader = {
  listTenants(context: PlatformRequestContext, filters?: TenantOverviewFilters): Promise<unknown[]>;
};

export class TenantOverviewService {
  private readonly reader: TenantOverviewReader;

  constructor(reader: TenantOverviewReader) {
    this.reader = reader;
  }

  async listTenants(
    context: PlatformRequestContext,
    filters?: TenantOverviewFilters,
  ): Promise<PlatformTenantSummary[]> {
    authorizePlatformPermission(context, 'platform.tenants.read');
    const rows = await this.reader.listTenants(context, filters);
    return rows.map((row) => platformTenantSummarySchema.parse(row));
  }
}
