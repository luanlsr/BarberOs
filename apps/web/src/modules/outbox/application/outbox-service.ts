import { createOutboxEventCommandSchema, type RequestContext } from '@barberos/contracts';
import { isDuplicateOutboxEvent, type OutboxRepository } from '../domain';

export class OutboxApplicationService {
  constructor(private readonly repository: OutboxRepository) {}

  async createEvent(context: RequestContext, command: unknown) {
    const parsed = createOutboxEventCommandSchema.parse(command);
    if (parsed.tenantId !== context.tenantId) throw new Error('Cross-tenant outbox writes are not allowed.');
    const existing = await this.repository.findEventByIdempotencyKey(context, parsed.idempotencyKey);
    if (existing) {
      if (isDuplicateOutboxEvent(existing, { ...parsed })) return existing;
      throw new Error('Outbox idempotency key already belongs to another event.');
    }
    return this.repository.createEvent(context, parsed);
  }
}
