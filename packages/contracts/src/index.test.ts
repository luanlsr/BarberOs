import { describe, expect, it } from 'vitest';
import {
  activeAppointmentStatuses,
  apiErrorSchema,
  appointmentSchema,
  branchScopedAuthorizationRequirementSchema,
  canTransitionOrderStatus,
  cashMovementSchema,
  cashMovementTypeSchema,
  cashRegisterMovementCommandSchema,
  cashRegisterSessionSchema,
  cashRegisterSessionStatusSchema,
  commissionAccrualStatusSchema,
  commissionRuleScopeSchema,
  commissionRuleStatusSchema,
  commissionRuleTypeSchema,
  commissionSummarySchema,
  commissionAccrualSchema,
  commissionRuleSchema,
  checkInAppointmentCommandSchema,
  closeCashRegisterCommandSchema,
  closePayoutCommandSchema,
  correctPayoutCommandSchema,
  coreOperationsErrorCodeSchema,
  createCommissionRuleCommandSchema,
  createAppointmentCommandSchema,
  createOrderItemCommandSchema,
  createServiceCommandSchema,
  createWalkInOrderCommandSchema,
  cancelExpenseCommandSchema,
  createExpenseCommandSchema,
  expenseStatusSchema,
  expenseRecurrenceFrequencySchema,
  expenseCategorySchema,
  expenseSchema,
  expenseListResponseSchema,
  financialEntryDirectionSchema,
  financialEntryStatusSchema,
  financialEntryTypeSchema,
  financialEntrySchema,
  financeSummarySchema,
  hasBranchAccess,
  generateCommissionAccrualsCommandSchema,
  openCashRegisterCommandSchema,
  orderDetailSchema,
  orderItemSchema,
  orderStatusSchema,
  paymentAllocationSchema,
  paymentMethodSchema,
  paymentSchema,
  paymentStatusSchema,
  payExpenseCommandSchema,
  payPayoutCommandSchema,
  payoutStatusSchema,
  payoutAllocationSchema,
  payoutSchema,
  payoutDetailSchema,
  professionalWalletSchema,
  permissionSchema,
  professionalScheduleSchema,
  receivePaymentCommandSchema,
  refundPaymentCommandSchema,
  refundStatusSchema,
  updateOrderItemCommandSchema,
  updateOrderStatusCommandSchema,
  updateCommissionRuleCommandSchema,
  updateExpenseCommandSchema,
} from './index';

describe('core operations contracts', () => {
  it('recognizes core operations permissions and stable error codes', () => {
    expect(permissionSchema.parse('professionals.create')).toBe('professionals.create');
    expect(permissionSchema.parse('services.update')).toBe('services.update');
    expect(permissionSchema.parse('schedules.manage')).toBe('schedules.manage');
    expect(permissionSchema.parse('orders.read')).toBe('orders.read');
    expect(permissionSchema.parse('appointments.check_in')).toBe('appointments.check_in');
    expect(permissionSchema.parse('payments.receive')).toBe('payments.receive');
    expect(permissionSchema.parse('cash.close')).toBe('cash.close');
    expect(coreOperationsErrorCodeSchema.parse('APPOINTMENT_CONFLICT')).toBe(
      'APPOINTMENT_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('ORDER_NOT_FOUND')).toBe('ORDER_NOT_FOUND');
    expect(coreOperationsErrorCodeSchema.parse('PAYMENT_IDEMPOTENCY_CONFLICT')).toBe(
      'PAYMENT_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('CASH_REGISTER_NOT_OPEN')).toBe(
      'CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_PERMISSION_DENIED')).toBe(
      'FINANCE_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_BRANCH_SCOPE_DENIED')).toBe(
      'FINANCE_BRANCH_SCOPE_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_IDEMPOTENCY_CONFLICT')).toBe(
      'FINANCE_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_CASH_REGISTER_NOT_OPEN')).toBe(
      'FINANCE_CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.parse('FINANCE_IMMUTABLE_ENTRY')).toBe(
      'FINANCE_IMMUTABLE_ENTRY',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_PERMISSION_DENIED')).toBe(
      'COMMISSION_PERMISSION_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_BRANCH_SCOPE_DENIED')).toBe(
      'COMMISSION_BRANCH_SCOPE_DENIED',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_IDEMPOTENCY_CONFLICT')).toBe(
      'COMMISSION_IDEMPOTENCY_CONFLICT',
    );
    expect(coreOperationsErrorCodeSchema.parse('COMMISSION_IMMUTABLE_ACCRUAL')).toBe(
      'COMMISSION_IMMUTABLE_ACCRUAL',
    );
    expect(coreOperationsErrorCodeSchema.parse('PAYOUT_CASH_REGISTER_NOT_OPEN')).toBe(
      'PAYOUT_CASH_REGISTER_NOT_OPEN',
    );
    expect(coreOperationsErrorCodeSchema.safeParse('FINANCE_DATA_LEAK').success).toBe(false);

    expect(
      apiErrorSchema.parse({
        error: {
          code: 'FINANCE_PERMISSION_DENIED',
          message: 'Permission denied.',
          requestId: 'request-finance-a',
        },
      }).error.code,
    ).toBe('FINANCE_PERMISSION_DENIED');
  });

  it('rejects invalid service duration and price', () => {
    const result = createServiceCommandSchema.safeParse({
      category: 'Cabelo',
      name: 'Corte',
      durationMinutes: 0,
      priceCents: -1,
    });

    expect(result.success).toBe(false);
  });

  it('accepts the minimal valid manual appointment command', () => {
    const result = createAppointmentCommandSchema.parse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [{ serviceId: 'service-a' }],
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.source).toBe('MANUAL');
  });

  it('rejects appointments without scheduled services', () => {
    const result = createAppointmentCommandSchema.safeParse({
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      services: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects appointment entities whose end is not after start', () => {
    const result = appointmentSchema.safeParse({
      id: 'appointment-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      startsAt: '2026-09-05T13:00:00.000Z',
      endsAt: '2026-09-05T13:00:00.000Z',
      status: 'CONFIRMED',
      source: 'MANUAL',
      services: [
        {
          serviceId: 'service-a',
          serviceName: 'Corte',
          durationMinutes: 40,
          priceCents: 5000,
          sequence: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('validates branch-scoped authorization requirements', () => {
    const requirement = branchScopedAuthorizationRequirementSchema.parse({
      permission: 'appointments.create',
      entitlement: 'core.operations',
      branchId: 'branch-a',
    });

    expect(requirement.branchId).toBe('branch-a');
    const branchId = requirement.branchId ?? '';
    expect(hasBranchAccess({ branchScope: ['branch-a'] }, branchId)).toBe(true);
    expect(hasBranchAccess({ branchScope: ['branch-b'] }, branchId)).toBe(false);
  });

  it('rejects schedule breaks outside working hours', () => {
    const result = professionalScheduleSchema.safeParse({
      id: 'schedule-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      weekday: 1,
      startsAtLocal: '09:00',
      endsAtLocal: '18:00',
      breakStartsAtLocal: '08:00',
      breakEndsAtLocal: '08:30',
      active: true,
    });

    expect(result.success).toBe(false);
  });

  it('documents active appointment statuses for database conflict protection', () => {
    expect(activeAppointmentStatuses).toEqual(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE']);
  });

  it('accepts order and item snapshots for an open Comanda', () => {
    const order = orderDetailSchema.parse({
      id: 'order-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      appointmentId: 'appointment-a',
      customerId: 'customer-a',
      professionalId: 'professional-a',
      status: 'OPEN',
      subtotalAmountCents: 5000,
      discountAmountCents: 500,
      totalAmountCents: 4500,
      openedAt: '2026-09-05T13:00:00.000Z',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-05T13:00:00.000Z',
      updatedAt: '2026-09-05T13:00:00.000Z',
      items: [
        {
          id: 'item-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          orderId: 'order-a',
          sourceType: 'SERVICE',
          sourceId: 'service-a',
          nameSnapshot: 'Corte',
          quantity: 1,
          unitPriceAmountCents: 5000,
          discountAmountCents: 500,
          finalAmountCents: 4500,
          professionalId: 'professional-a',
          createdBy: 'user-a',
          createdAt: '2026-09-05T13:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'history-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          orderId: 'order-a',
          eventType: 'CHECK_IN',
          actorId: 'user-a',
          createdAt: '2026-09-05T13:00:00.000Z',
        },
      ],
    });

    expect(order.status).toBe(orderStatusSchema.parse('OPEN'));
    expect(order.items[0]?.nameSnapshot).toBe('Corte');
    expect(order.history[0]?.metadata).toEqual({});
  });

  it('rejects invalid order status transitions', () => {
    expect(canTransitionOrderStatus('OPEN', 'IN_SERVICE')).toBe(true);
    expect(canTransitionOrderStatus('CANCELLED', 'OPEN')).toBe(false);

    const result = updateOrderStatusCommandSchema.safeParse({
      id: 'order-a',
      fromStatus: 'CANCELLED',
      toStatus: 'OPEN',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid order item quantity, discount and final amount', () => {
    expect(
      createOrderItemCommandSchema.safeParse({
        orderId: 'order-a',
        sourceType: 'MANUAL',
        name: 'Desconto indevido',
        quantity: 0,
        unitPriceAmountCents: 5000,
      }).success,
    ).toBe(false);

    expect(
      createOrderItemCommandSchema.safeParse({
        orderId: 'order-a',
        sourceType: 'MANUAL',
        name: 'Desconto indevido',
        quantity: 1,
        unitPriceAmountCents: 5000,
        discountAmountCents: 6000,
      }).success,
    ).toBe(false);

    expect(
      orderItemSchema.safeParse({
        id: 'item-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        sourceType: 'SERVICE',
        nameSnapshot: 'Corte',
        quantity: 2,
        unitPriceAmountCents: 5000,
        discountAmountCents: 1000,
        finalAmountCents: 8000,
        createdBy: 'user-a',
        createdAt: '2026-09-05T13:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('recognizes payment and cash register enums', () => {
    expect(paymentMethodSchema.parse('PIX')).toBe('PIX');
    expect(paymentMethodSchema.parse('CASH')).toBe('CASH');
    expect(paymentStatusSchema.parse('PARTIALLY_REFUNDED')).toBe('PARTIALLY_REFUNDED');
    expect(refundStatusSchema.parse('COMPLETED')).toBe('COMPLETED');
    expect(cashRegisterSessionStatusSchema.parse('OPEN')).toBe('OPEN');
    expect(cashMovementTypeSchema.parse('WITHDRAWAL')).toBe('WITHDRAWAL');
  });
  it('recognizes finance and commission enums', () => {
    expect(financialEntryDirectionSchema.parse('IN')).toBe('IN');
    expect(financialEntryTypeSchema.parse('SERVICE_REVENUE')).toBe('SERVICE_REVENUE');
    expect(financialEntryTypeSchema.parse('PAYOUT')).toBe('PAYOUT');
    expect(financialEntryStatusSchema.parse('POSTED')).toBe('POSTED');
    expect(expenseStatusSchema.parse('OVERDUE')).toBe('OVERDUE');
    expect(commissionRuleTypeSchema.parse('PERCENTAGE')).toBe('PERCENTAGE');
    expect(commissionRuleScopeSchema.parse('MANUAL_ITEM')).toBe('MANUAL_ITEM');
    expect(commissionRuleStatusSchema.parse('ARCHIVED')).toBe('ARCHIVED');
    expect(commissionAccrualStatusSchema.parse('ADJUSTED')).toBe('ADJUSTED');
    expect(payoutStatusSchema.parse('CORRECTED')).toBe('CORRECTED');

    expect(financialEntryDirectionSchema.safeParse('SIDEWAYS').success).toBe(false);
    expect(financialEntryTypeSchema.safeParse('PAYMENT').success).toBe(false);
    expect(expenseStatusSchema.safeParse('DELETED').success).toBe(false);
    expect(commissionRuleTypeSchema.safeParse('TIERED').success).toBe(false);
    expect(commissionRuleScopeSchema.safeParse('GLOBAL').success).toBe(false);
    expect(commissionAccrualStatusSchema.safeParse('PAID').success).toBe(false);
    expect(payoutStatusSchema.safeParse('SETTLED').success).toBe(false);
  });

  it('accepts finance and commission records with tenant and branch scope', () => {
    const entry = financialEntrySchema.parse({
      id: 'entry-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      direction: 'IN',
      type: 'SERVICE_REVENUE',
      amountCents: 4500,
      signedAmountCents: 4500,
      competenceDate: '2026-09-05',
      cashDate: '2026-09-05',
      sourceType: 'PAYMENT',
      sourceId: 'payment-a',
      createdBy: 'user-a',
      createdAt: '2026-09-05T14:00:00.000Z',
    });
    const category = expenseCategorySchema.parse({
      id: 'expense-category-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      name: 'Aluguel',
      createdBy: 'user-a',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });
    const expense = expenseSchema.parse({
      id: 'expense-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      categoryId: category.id,
      description: 'Conta de energia',
      status: 'PAID',
      amountCents: 84000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      cashDate: '2026-09-10',
      paymentMethod: 'PIX',
      documentMetadata: { storagePath: 'tenant-a/expenses/energia.pdf' },
      financialEntryId: 'entry-expense-a',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      paidBy: 'user-a',
      paidAt: '2026-09-10T14:00:00.000Z',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-10T14:00:00.000Z',
    });
    const rule = commissionRuleSchema.parse({
      id: 'rule-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      status: 'ACTIVE',
      professionalId: 'professional-a',
      sourceType: 'SERVICE',
      sourceId: 'service-a',
      percentageBps: 5000,
      effectiveFrom: '2026-09-01',
      createdBy: 'user-a',
      updatedBy: 'user-a',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });
    const accrual = commissionAccrualSchema.parse({
      id: 'accrual-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      orderId: 'order-a',
      orderItemId: 'item-a',
      paymentId: 'payment-a',
      ruleId: rule.id,
      ruleTypeSnapshot: 'PERCENTAGE',
      ruleScopeSnapshot: 'SERVICE',
      rulePercentageBpsSnapshot: 5000,
      baseAmountCents: 4500,
      commissionAmountCents: 2250,
      status: 'OPEN',
      accruedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const payout = payoutSchema.parse({
      id: 'payout-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      status: 'PAID',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      totalAmountCents: 2250,
      sources: [{ accrualId: accrual.id, amountCents: 2250 }],
      paymentMethod: 'PIX',
      financialEntryId: 'entry-payout-a',
      closedBy: 'user-a',
      closedAt: '2026-09-15T20:00:00.000Z',
      paidBy: 'user-a',
      paidAt: '2026-09-16T12:00:00.000Z',
      createdAt: '2026-09-15T20:00:00.000Z',
      updatedAt: '2026-09-16T12:00:00.000Z',
    });
    const allocation = payoutAllocationSchema.parse({
      id: 'payout-allocation-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      payoutId: payout.id,
      accrualId: accrual.id,
      amountCents: 2250,
      createdAt: '2026-09-15T20:00:00.000Z',
    });

    expect(entry.status).toBe('POSTED');
    expect(category.status).toBe('ACTIVE');
    expect(expense.documentMetadata).toEqual({ storagePath: 'tenant-a/expenses/energia.pdf' });
    expect(accrual.rulePercentageBpsSnapshot).toBe(5000);
    expect(payout.sources).toHaveLength(1);
    expect(allocation.amountCents).toBe(2250);
  });

  it('accepts finance and commission read model responses', () => {
    const financeSummary = financeSummarySchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      revenueAmountCents: 0,
      expenseAmountCents: 0,
      resultAmountCents: 0,
      commissionLiabilityAmountCents: 0,
      paidPayoutAmountCents: 0,
      cashInAmountCents: 0,
      cashOutAmountCents: 0,
      entriesCount: 0,
    });
    const expenseList = expenseListResponseSchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      expenses: [],
      openAmountCents: 0,
      overdueAmountCents: 0,
      paidAmountCents: 0,
      totalAmountCents: 0,
    });
    const commissionSummary = commissionSummarySchema.parse({
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      openAccrualAmountCents: 2250,
      settledAccrualAmountCents: 0,
      reversedAccrualAmountCents: 0,
      paidPayoutAmountCents: 0,
      professionalCount: 1,
      accrualCount: 1,
    });
    const accrual = commissionAccrualSchema.parse({
      id: 'accrual-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      orderId: 'order-a',
      orderItemId: 'item-a',
      paymentId: 'payment-a',
      ruleTypeSnapshot: 'FIXED_AMOUNT',
      ruleScopeSnapshot: 'PROFESSIONAL',
      ruleFixedAmountCentsSnapshot: 2250,
      baseAmountCents: 4500,
      commissionAmountCents: 2250,
      status: 'OPEN',
      accruedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const payout = payoutSchema.parse({
      id: 'payout-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      professionalId: 'professional-a',
      status: 'CLOSED',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      totalAmountCents: 2250,
      sources: [{ accrualId: accrual.id, amountCents: 2250 }],
      closedBy: 'user-a',
      closedAt: '2026-09-15T20:00:00.000Z',
      createdAt: '2026-09-15T20:00:00.000Z',
      updatedAt: '2026-09-15T20:00:00.000Z',
    });
    const payoutDetail = payoutDetailSchema.parse({
      payout,
      allocations: [
        {
          id: 'allocation-a',
          tenantId: 'tenant-a',
          branchId: 'branch-a',
          payoutId: payout.id,
          accrualId: accrual.id,
          amountCents: 2250,
          createdAt: '2026-09-15T20:00:00.000Z',
        },
      ],
      accruals: [accrual],
    });
    const wallet = professionalWalletSchema.parse({
      tenantId: 'tenant-a',
      professionalId: 'professional-a',
      branchIds: ['branch-a'],
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      productionAmountCents: 4500,
      openCommissionAmountCents: 2250,
      paidPayoutAmountCents: 0,
      expectedBalanceAmountCents: 2250,
      accruals: [accrual],
      payouts: [payout],
    });

    expect(financeSummary.entriesCount).toBe(0);
    expect(expenseList.expenses).toEqual([]);
    expect(commissionSummary.branchId).toBe('branch-a');
    expect(payoutDetail.allocations[0]?.accrualId).toBe(accrual.id);
    expect(wallet.professionalId).toBe('professional-a');
  });
  it('rejects invalid finance and commission records', () => {
    expect(
      financialEntrySchema.safeParse({
        id: 'entry-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        direction: 'OUT',
        type: 'EXPENSE',
        amountCents: 5000,
        signedAmountCents: 5000,
        competenceDate: '2026-09-05',
        sourceType: 'EXPENSE',
        sourceId: 'expense-a',
        createdBy: 'user-a',
        createdAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      expenseSchema.safeParse({
        id: 'expense-a',
        tenantId: 'tenant-a',
        description: 'Sem filial',
        status: 'OPEN',
        amountCents: 1000,
        competenceDate: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      expenseSchema.safeParse({
        id: 'expense-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        description: 'Despesa paga incompleta',
        status: 'PAID',
        amountCents: 1000,
        competenceDate: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      commissionRuleSchema.safeParse({
        id: 'rule-a',
        tenantId: 'tenant-a',
        scope: 'SERVICE',
        type: 'PERCENTAGE',
        status: 'ACTIVE',
        percentageBps: 5000,
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-01',
        createdBy: 'user-a',
        updatedBy: 'user-a',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      commissionAccrualSchema.safeParse({
        id: 'accrual-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        professionalId: 'professional-a',
        orderId: 'order-a',
        orderItemId: 'item-a',
        ruleTypeSnapshot: 'FIXED_AMOUNT',
        ruleScopeSnapshot: 'SERVICE',
        rulePercentageBpsSnapshot: 5000,
        baseAmountCents: 4500,
        commissionAmountCents: 2250,
        status: 'OPEN',
        accruedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      payoutSchema.safeParse({
        id: 'payout-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        professionalId: 'professional-a',
        status: 'PAID',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-15',
        totalAmountCents: 3000,
        sources: [{ accrualId: 'accrual-a', amountCents: 2250 }],
        paymentMethod: 'PIX',
        closedBy: 'user-a',
        closedAt: '2026-09-15T20:00:00.000Z',
        paidBy: 'user-a',
        paidAt: '2026-09-16T12:00:00.000Z',
        createdAt: '2026-09-15T20:00:00.000Z',
        updatedAt: '2026-09-16T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
  it('accepts payment and cash records with tenant and branch scope', () => {
    const payment = paymentSchema.parse({
      id: 'payment-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      orderId: 'order-a',
      method: 'CASH',
      status: 'PAID',
      amountCents: 4500,
      cashReceivedAmountCents: 5000,
      changeDueAmountCents: 500,
      idempotencyKey: 'payment-order-a',
      receivedBy: 'user-a',
      receivedAt: '2026-09-05T14:00:00.000Z',
      createdAt: '2026-09-05T14:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const allocation = paymentAllocationSchema.parse({
      id: 'allocation-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      paymentId: payment.id,
      orderId: 'order-a',
      amountCents: 4500,
      createdAt: '2026-09-05T14:00:00.000Z',
    });
    const session = cashRegisterSessionSchema.parse({
      id: 'cash-session-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      status: 'OPEN',
      openedBy: 'user-a',
      openedAt: '2026-09-05T11:00:00.000Z',
      openingBalanceAmountCents: 20000,
      expectedBalanceAmountCents: 24500,
      createdAt: '2026-09-05T11:00:00.000Z',
      updatedAt: '2026-09-05T14:00:00.000Z',
    });
    const movement = cashMovementSchema.parse({
      id: 'movement-a',
      tenantId: 'tenant-a',
      branchId: 'branch-a',
      sessionId: session.id,
      type: 'SALE',
      amountCents: 4500,
      signedAmountCents: 4500,
      orderId: 'order-a',
      paymentId: payment.id,
      createdBy: 'user-a',
      createdAt: '2026-09-05T14:00:00.000Z',
    });

    expect(payment.changeDueAmountCents).toBe(500);
    expect(allocation.amountCents).toBe(4500);
    expect(session.status).toBe('OPEN');
    expect(movement.signedAmountCents).toBe(4500);
  });

  it('rejects invalid payment and cash records', () => {
    expect(
      paymentSchema.safeParse({
        id: 'payment-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        method: 'PIX',
        status: 'PAID',
        amountCents: -1,
        receivedBy: 'user-a',
        receivedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      paymentSchema.safeParse({
        id: 'payment-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        orderId: 'order-a',
        method: 'PIX',
        status: 'PAID',
        amountCents: 4500,
        cashReceivedAmountCents: 5000,
        receivedBy: 'user-a',
        receivedAt: '2026-09-05T14:00:00.000Z',
        createdAt: '2026-09-05T14:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      cashRegisterSessionSchema.safeParse({
        id: 'cash-session-a',
        tenantId: 'tenant-a',
        branchId: 'branch-a',
        status: 'CLOSED',
        openedBy: 'user-a',
        openedAt: '2026-09-05T11:00:00.000Z',
        openingBalanceAmountCents: 20000,
        expectedBalanceAmountCents: 24500,
        actualBalanceAmountCents: 24500,
        createdAt: '2026-09-05T11:00:00.000Z',
        updatedAt: '2026-09-05T14:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('validates receive, refund and cash command shapes', () => {
    const receive = receivePaymentCommandSchema.parse({
      orderId: 'order-a',
      idempotencyKey: 'receive-order-a',
      payments: [
        { method: 'PIX', amountCents: 7000 },
        { method: 'CASH', amountCents: 3000, cashReceivedAmountCents: 5000 },
      ],
    });
    const refund = refundPaymentCommandSchema.parse({
      paymentId: 'payment-a',
      amountCents: 1000,
      reason: 'Cliente retornou para correcao.',
      idempotencyKey: 'refund-payment-a',
    });
    const openCash = openCashRegisterCommandSchema.parse({
      branchId: 'branch-a',
      openingBalanceAmountCents: 20000,
      idempotencyKey: 'open-cash-a',
    });
    const movement = cashRegisterMovementCommandSchema.parse({
      branchId: 'branch-a',
      type: 'WITHDRAWAL',
      amountCents: 5000,
      reason: 'Deposito bancario.',
      idempotencyKey: 'cash-withdrawal-a',
    });
    const closeCash = closeCashRegisterCommandSchema.parse({
      sessionId: 'cash-session-a',
      actualBalanceAmountCents: 19900,
      expectedBalanceAmountCents: 20000,
      differenceReason: 'Falta de troco conferida no fechamento.',
      idempotencyKey: 'close-cash-a',
    });

    expect(receive.payments).toHaveLength(2);
    expect(refund.amountCents).toBe(1000);
    expect(openCash.branchId).toBe('branch-a');
    expect(movement.reason).toContain('Deposito');
    expect(closeCash.differenceReason).toContain('troco');

    expect(
      receivePaymentCommandSchema.safeParse({
        orderId: 'order-a',
        idempotencyKey: 'receive-order-a',
        payments: [{ method: 'CASH', amountCents: 3000, cashReceivedAmountCents: 2000 }],
      }).success,
    ).toBe(false);
    expect(
      cashRegisterMovementCommandSchema.safeParse({
        branchId: 'branch-a',
        type: 'WITHDRAWAL',
        amountCents: 5000,
        idempotencyKey: 'cash-withdrawal-a',
      }).success,
    ).toBe(false);
    expect(
      closeCashRegisterCommandSchema.safeParse({
        sessionId: 'cash-session-a',
        actualBalanceAmountCents: 19900,
        expectedBalanceAmountCents: 20000,
        idempotencyKey: 'close-cash-a',
      }).success,
    ).toBe(false);
  });
  it('validates finance, commission and payout command shapes', () => {
    const createExpense = createExpenseCommandSchema.parse({
      branchId: 'branch-a',
      categoryId: 'category-a',
      description: 'Aluguel da unidade',
      vendorName: 'Imobiliaria Centro',
      amountCents: 400000,
      competenceDate: '2026-09-01',
      dueDate: '2026-09-10',
      recurrence: { frequency: 'MONTHLY' },
    });
    const updateExpense = updateExpenseCommandSchema.parse({
      id: 'expense-a',
      dueDate: '2026-09-12',
    });
    const payExpense = payExpenseCommandSchema.parse({
      expenseId: 'expense-a',
      paymentMethod: 'CASH',
      cashDate: '2026-09-10',
      cashRegisterSessionId: 'cash-session-a',
      idempotencyKey: 'pay-expense-a',
    });
    const cancelExpense = cancelExpenseCommandSchema.parse({
      expenseId: 'expense-b',
      reason: 'Lancamento duplicado.',
      idempotencyKey: 'cancel-expense-b',
    });
    const createRule = createCommissionRuleCommandSchema.parse({
      branchId: 'branch-a',
      scope: 'SERVICE',
      type: 'PERCENTAGE',
      professionalId: 'professional-a',
      sourceType: 'SERVICE',
      sourceId: 'service-a',
      percentageBps: 5000,
      effectiveFrom: '2026-09-01',
    });
    const updateRule = updateCommissionRuleCommandSchema.parse({
      id: 'rule-a',
      status: 'INACTIVE',
    });
    const generateAccruals = generateCommissionAccrualsCommandSchema.parse({
      orderId: 'order-a',
      paymentId: 'payment-a',
      idempotencyKey: 'generate-accruals-a',
    });
    const closePayout = closePayoutCommandSchema.parse({
      professionalId: 'professional-a',
      branchId: 'branch-a',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-15',
      accrualIds: ['accrual-a'],
      idempotencyKey: 'close-payout-a',
    });
    const payPayout = payPayoutCommandSchema.parse({
      payoutId: 'payout-a',
      paymentMethod: 'CASH',
      cashRegisterSessionId: 'cash-session-a',
      idempotencyKey: 'pay-payout-a',
    });
    const correctPayout = correctPayoutCommandSchema.parse({
      payoutId: 'payout-a',
      amountCents: 500,
      direction: 'OUT',
      reason: 'Ajuste de repasse conferido.',
      idempotencyKey: 'correct-payout-a',
    });

    expect(createExpense.recurrence?.frequency).toBe(
      expenseRecurrenceFrequencySchema.parse('MONTHLY'),
    );
    expect(updateExpense.dueDate).toBe('2026-09-12');
    expect(payExpense.cashRegisterSessionId).toBe('cash-session-a');
    expect(cancelExpense.reason).toContain('duplicado');
    expect(createRule.percentageBps).toBe(5000);
    expect(updateRule.status).toBe('INACTIVE');
    expect(generateAccruals.paymentId).toBe('payment-a');
    expect(closePayout.accrualIds).toEqual(['accrual-a']);
    expect(payPayout.paymentMethod).toBe('CASH');
    expect(correctPayout.direction).toBe('OUT');

    expect(
      createExpenseCommandSchema.safeParse({
        branchId: 'branch-a',
        description: 'Aluguel da unidade',
        amountCents: 400000,
        competenceDate: '2026-09-01',
        recurrence: { frequency: 'MONTHLY', endsOn: '2026-08-31' },
      }).success,
    ).toBe(false);
    expect(updateExpenseCommandSchema.safeParse({ id: 'expense-a' }).success).toBe(false);
    expect(
      payExpenseCommandSchema.safeParse({
        expenseId: 'expense-a',
        paymentMethod: 'CASH',
        cashDate: '2026-09-10',
        idempotencyKey: 'pay-expense-a',
      }).success,
    ).toBe(false);
    expect(
      createCommissionRuleCommandSchema.safeParse({
        scope: 'SERVICE',
        type: 'PERCENTAGE',
        percentageBps: 5000,
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-01',
      }).success,
    ).toBe(false);
    expect(
      createCommissionRuleCommandSchema.safeParse({
        scope: 'SERVICE',
        type: 'FIXED_AMOUNT',
        fixedAmountCents: 1000,
        effectiveFrom: '2026-09-15',
        effectiveUntil: '2026-09-01',
      }).success,
    ).toBe(false);
    expect(
      closePayoutCommandSchema.safeParse({
        professionalId: 'professional-a',
        branchId: 'branch-a',
        periodStart: '2026-09-15',
        periodEnd: '2026-09-01',
        idempotencyKey: 'close-payout-a',
      }).success,
    ).toBe(false);
    expect(
      payPayoutCommandSchema.safeParse({
        payoutId: 'payout-a',
        paymentMethod: 'CASH',
        idempotencyKey: 'pay-payout-a',
      }).success,
    ).toBe(false);
  });
  it('validates check-in, walk-in and item mutation command shapes', () => {
    const checkIn = checkInAppointmentCommandSchema.parse({
      appointmentId: 'appointment-a',
      idempotencyKey: 'checkin-appointment-a',
    });
    const walkIn = createWalkInOrderCommandSchema.parse({ branchId: 'branch-a' });
    const updateItem = updateOrderItemCommandSchema.parse({
      orderId: 'order-a',
      itemId: 'item-a',
      notes: 'Cliente pediu acabamento extra.',
    });

    expect(checkIn.appointmentId).toBe('appointment-a');
    expect(walkIn.branchId).toBe('branch-a');
    expect(updateItem.notes).toContain('acabamento');
    expect(
      updateOrderItemCommandSchema.safeParse({ orderId: 'order-a', itemId: 'item-a' }).success,
    ).toBe(false);
  });
});
