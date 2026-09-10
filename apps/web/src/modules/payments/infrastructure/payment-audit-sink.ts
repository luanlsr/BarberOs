import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestContext } from '@barberos/contracts';

import { recordAuditEvent } from '../../../../lib/audit';
import type { PaymentAuditSink } from '../domain';

export class SupabasePaymentAuditSink implements PaymentAuditSink {
  constructor(private readonly client?: SupabaseClient | null) {}

  async record(context: RequestContext, event: Parameters<PaymentAuditSink['record']>[1]) {
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
