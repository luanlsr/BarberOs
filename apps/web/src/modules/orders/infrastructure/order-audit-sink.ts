import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestContext } from '@barberos/contracts';

import { recordAuditEvent } from '../../../../lib/audit';
import type { OrderAuditSink } from '../domain';

export class SupabaseOrderAuditSink implements OrderAuditSink {
  constructor(private readonly client?: SupabaseClient | null) {}

  async record(context: RequestContext, event: Parameters<OrderAuditSink['record']>[1]) {
    await recordAuditEvent(
      {
        tenantId: context.tenantId,
        actorType: 'USER',
        actorId: context.userId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        result: event.result,
        beforeState: event.beforeState,
        afterState: event.afterState,
        requestId: context.requestId,
      },
      this.client,
    );
  }
}
