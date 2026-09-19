import type { PaymentTerminalProviderAdapter } from '../domain';

export class MockPaymentTerminalProvider implements PaymentTerminalProviderAdapter {
  readonly provider = 'MOCK_TERMINAL' as const;

  async createPayment(input: Parameters<PaymentTerminalProviderAdapter['createPayment']>[0]) {
    return {
      providerIntentId: 'mock-intent-' + input.intentId,
      providerReference: 'mock-terminal-' + input.intentId,
      status: 'PAID' as const,
      payload: {
        approved: true,
        mode: 'auto_approve',
        terminalId: input.terminal.id,
      },
    };
  }
}
