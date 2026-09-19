import { createNotificationIntentCommandSchema, type RequestContext } from '@barberos/contracts';
import { isDuplicateNotificationIntent, type NotificationRepository } from '../domain';

export class NotificationApplicationService {
  constructor(private readonly repository: NotificationRepository) {}

  async createIntent(context: RequestContext, command: unknown) {
    const parsed = createNotificationIntentCommandSchema.parse(command);
    if (parsed.tenantId !== context.tenantId) throw new Error('Cross-tenant notification writes are not allowed.');
    const existing = await this.repository.findIntentByIdempotencyKey(context, parsed.idempotencyKey);
    if (existing) {
      if (isDuplicateNotificationIntent(existing, { ...parsed })) return existing;
      throw new Error('Notification idempotency key already belongs to another intent.');
    }
    return this.repository.createIntent(context, parsed);
  }
}
