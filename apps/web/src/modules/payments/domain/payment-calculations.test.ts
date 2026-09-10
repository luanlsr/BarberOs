import { describe, expect, it } from 'vitest';
import {
  calculateAmountDue,
  calculateCashChange,
  calculateCapturedPaymentAmount,
  calculatePaidAmount,
  calculateRefundableAmount,
  calculateSplitPaymentTotal,
  type PaymentAmountSnapshot,
} from './index';

const paid = (amountCents: number, refundedAmountCents = 0): PaymentAmountSnapshot => ({
  amountCents,
  refundedAmountCents,
  status: refundedAmountCents > 0 ? 'PARTIALLY_REFUNDED' : 'PAID',
});

describe('payment domain calculations', () => {
  it('calculates captured and due amounts using exact cents', () => {
    const payments: PaymentAmountSnapshot[] = [
      paid(3333),
      paid(3333, 1000),
      { amountCents: 9999, refundedAmountCents: 0, status: 'FAILED' },
    ];

    expect(calculateCapturedPaymentAmount(payments[1])).toBe(2333);
    expect(calculatePaidAmount(payments)).toBe(5666);
    expect(calculateAmountDue(10_000, payments)).toBe(4334);
  });

  it('never returns a negative amount due when payments exceed the order total', () => {
    expect(calculateAmountDue(8_500, [paid(6_000), paid(3_000)])).toBe(0);
  });

  it('totals split payment rows without floating point math', () => {
    expect(
      calculateSplitPaymentTotal([
        { amountCents: 3_333 },
        { amountCents: 3_333 },
        { amountCents: 3_334 },
      ]),
    ).toBe(10_000);
  });

  it('calculates cash change only from cash received above the payment amount', () => {
    expect(calculateCashChange({ amountCents: 8_500, cashReceivedAmountCents: 10_000 })).toBe(
      1_500,
    );
    expect(calculateCashChange({ amountCents: 8_500, cashReceivedAmountCents: 8_000 })).toBe(0);
    expect(calculateCashChange({ amountCents: 8_500 })).toBe(0);
  });

  it('calculates refundable amount from the immutable payment and refund snapshot', () => {
    expect(calculateRefundableAmount(paid(8_500))).toBe(8_500);
    expect(calculateRefundableAmount(paid(8_500, 3_000))).toBe(5_500);
    expect(
      calculateRefundableAmount({
        amountCents: 8_500,
        refundedAmountCents: 8_500,
        status: 'REFUNDED',
      }),
    ).toBe(0);
    expect(
      calculateRefundableAmount({ amountCents: 8_500, refundedAmountCents: 0, status: 'PENDING' }),
    ).toBe(0);
  });
});
