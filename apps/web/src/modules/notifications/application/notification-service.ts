import {
  createNotificationIntentCommandSchema,
  recordNotificationDeliveryAttemptCommandSchema,
  type RequestContext,
} from '@barberos/contracts';
import {
  assertNotificationDeliveryStatusTransition,
  assertNotificationIntentIsDuplicate,
  assertNotificationScope,
  isDuplicateNotificationIntent,
  type NotificationRepository,
} from '../domain';

export class NotificationApplicationService {
  constructor(private readonly repository: NotificationRepository) {}

  async createIntent(context: RequestContext, command: unknown) {
    const parsed = createNotificationIntentCommandSchema.parse(command);
    assertContextCanWrite(context, parsed.tenantId, parsed.branchId);
    const existing = await this.repository.findIntentByIdempotencyKey(
      context,
      parsed.idempotencyKey,
    );
    if (existing) {
      if (isDuplicateNotificationIntent(existing, { ...parsed })) return existing;
      assertNotificationIntentIsDuplicate(existing, { ...parsed });
    }
    return this.repository.createIntent(context, parsed);
  }

  async recordDeliveryAttempt(context: RequestContext, command: unknown) {
    const parsed = recordNotificationDeliveryAttemptCommandSchema.parse(command);
    assertContextCanWrite(context, parsed.tenantId, parsed.branchId);

    const intent = await this.repository.findIntentById(context, parsed.notificationIntentId);
    if (!intent) throw new Error('Notification intent was not found.');
    assertNotificationScope(
      { tenantId: parsed.tenantId, branchId: parsed.branchId },
      { tenantId: intent.tenantId, branchId: intent.branchId },
    );
    if (intent.channel !== parsed.channel) {
      throw new Error('Notification channel does not match the intent channel.');
    }

    const attempts = await this.repository.listDeliveryAttempts(context, {
      notificationIntentId: parsed.notificationIntentId,
      channel: parsed.channel,
      limit: 1,
    });
    const previous = attempts[0];
    if (previous) {
      assertNotificationDeliveryStatusTransition({ from: previous.status, to: parsed.status });
    }

    return this.repository.recordDeliveryAttempt(context, parsed);
  }
}

function assertContextCanWrite(context: RequestContext, tenantId: string, branchId?: string) {
  if (tenantId !== context.tenantId) {
    throw new Error('Cross-tenant notification writes are not allowed.');
  }
  if (branchId && !context.branchScope.includes(branchId)) {
    throw new Error('Notification branch is outside request scope.');
  }
}
