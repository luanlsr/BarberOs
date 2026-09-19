import { describe, expect, it } from 'vitest';

import {
  createPaymentTerminalIntentCommandSchema,
  paymentTerminalIntentSchema,
  paymentTerminalSchema,
} from './index';

describe('payment terminal contracts', () => {
  it('validates terminal metadata without provider secrets', () => {
    const terminal = paymentTerminalSchema.parse({
      id: 'terminal-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      provider: 'MOCK_TERMINAL',
      providerTerminalId: 'mock-branch-1',
      name: 'Terminal simulado',
      status: 'ACTIVE',
      createdAt: '2026-09-19T10:00:00.000Z',
      updatedAt: '2026-09-19T10:00:00.000Z',
    });

    expect(terminal.provider).toBe('MOCK_TERMINAL');
  });

  it('accepts only Pix and card methods for terminal intents', () => {
    expect(
      createPaymentTerminalIntentCommandSchema.parse({
        orderId: 'order-1',
        terminalId: 'terminal-1',
        method: 'PIX',
        amountCents: 10_000,
        idempotencyKey: 'terminal-intent-1',
      }),
    ).toMatchObject({ method: 'PIX' });

    expect(
      createPaymentTerminalIntentCommandSchema.safeParse({
        orderId: 'order-1',
        terminalId: 'terminal-1',
        method: 'CASH',
        amountCents: 10_000,
        idempotencyKey: 'terminal-intent-2',
      }).success,
    ).toBe(false);
  });

  it('validates terminal payment lifecycle records', () => {
    const intent = paymentTerminalIntentSchema.parse({
      id: 'intent-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      orderId: 'order-1',
      terminalId: 'terminal-1',
      provider: 'MERCADO_PAGO',
      method: 'CREDIT_CARD',
      status: 'SENT_TO_TERMINAL',
      amountCents: 12_000,
      installments: 2,
      providerIntentId: 'mp-intent-1',
      providerReference: 'mp-ref-1',
      idempotencyKey: 'terminal-intent-3',
      createdBy: 'user-1',
      createdAt: '2026-09-19T10:00:00.000Z',
      updatedAt: '2026-09-19T10:00:00.000Z',
    });

    expect(intent.installments).toBe(2);
  });
});
