import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CoreOperationsApplicationError } from '../application/errors';
import { jsonFromError } from './api';

describe('shared API error responses', () => {
  it('returns stable validation errors with the request id', async () => {
    let validationError: unknown;
    try {
      z.object({ tenantId: z.string() }).parse({ tenantId: 123 });
    } catch (error) {
      validationError = error;
    }

    const response = jsonFromError(validationError, 'request-1');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_VALIDATION_ERROR',
        message: 'Request payload is invalid.',
        requestId: 'request-1',
      },
    });
  });

  it('does not leak tenant or branch ids from order not-found messages', async () => {
    const response = jsonFromError(
      new CoreOperationsApplicationError(
        'ORDER_NOT_FOUND',
        'Order order-tenant-a belongs to tenant-1 and branch-2.',
      ),
      'request-tenant-b',
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: 'ORDER_NOT_FOUND',
        message: 'Order was not found.',
        requestId: 'request-tenant-b',
      },
    });
  });

  it('does not leak tenant or branch ids from authorization and branch-scope errors', async () => {
    const branchResponse = jsonFromError(
      new CoreOperationsApplicationError(
        'ORDER_BRANCH_SCOPE_DENIED',
        'Order order-1 is in tenant-1/branch-2.',
      ),
      'request-1',
    );
    const permissionResponse = jsonFromError(
      Object.assign(new Error('User user-1 cannot access tenant-1.'), {
        code: 'PERMISSION_DENIED',
      }),
      'request-2',
    );

    expect(branchResponse.status).toBe(403);
    expect(await branchResponse.json()).toEqual({
      error: {
        code: 'ORDER_BRANCH_SCOPE_DENIED',
        message: 'Order is outside the authorized scope.',
        requestId: 'request-1',
      },
    });
    expect(permissionResponse.status).toBe(403);
    expect(await permissionResponse.json()).toEqual({
      error: {
        code: 'CORE_PERMISSION_DENIED',
        message: 'Permission denied.',
        requestId: 'request-2',
      },
    });
  });

  it('maps finance and commission failures to stable sanitized error envelopes', async () => {
    const cases = [
      {
        error: new CoreOperationsApplicationError(
          'FINANCE_PERMISSION_DENIED',
          'User user-1 cannot access tenant-1 finance.',
        ),
        requestId: 'request-finance-permission',
        status: 403,
        body: {
          code: 'FINANCE_PERMISSION_DENIED',
          message: 'Permission denied.',
          requestId: 'request-finance-permission',
        },
      },
      {
        error: new CoreOperationsApplicationError(
          'COMMISSION_BRANCH_SCOPE_DENIED',
          'Commission accrual accrual-1 is in tenant-1/branch-2.',
        ),
        requestId: 'request-commission-branch',
        status: 403,
        body: {
          code: 'COMMISSION_BRANCH_SCOPE_DENIED',
          message: 'Commission data is outside the authorized scope.',
          requestId: 'request-commission-branch',
        },
      },
      {
        error: new CoreOperationsApplicationError(
          'FINANCE_IDEMPOTENCY_CONFLICT',
          'Duplicate key expense-pay:tenant-1:branch-2.',
        ),
        requestId: 'request-finance-duplicate',
        status: 409,
        body: {
          code: 'FINANCE_IDEMPOTENCY_CONFLICT',
          message: 'Finance request conflicts with an existing idempotency key.',
          requestId: 'request-finance-duplicate',
        },
      },
      {
        error: new CoreOperationsApplicationError(
          'PAYOUT_CASH_REGISTER_NOT_OPEN',
          'No open cash session for tenant-1/branch-2.',
        ),
        requestId: 'request-payout-cash',
        status: 409,
        body: {
          code: 'PAYOUT_CASH_REGISTER_NOT_OPEN',
          message: 'Cash register session is not open.',
          requestId: 'request-payout-cash',
        },
      },
      {
        error: new CoreOperationsApplicationError(
          'COMMISSION_IMMUTABLE_ACCRUAL',
          'Paid accrual accrual-1 cannot be edited for tenant-1.',
        ),
        requestId: 'request-commission-immutable',
        status: 409,
        body: {
          code: 'COMMISSION_IMMUTABLE_ACCRUAL',
          message: 'Commission history cannot be changed destructively.',
          requestId: 'request-commission-immutable',
        },
      },
    ] as const;

    for (const item of cases) {
      const response = jsonFromError(item.error, item.requestId);

      expect(response.status).toBe(item.status);
      expect(await response.json()).toEqual({ error: item.body });
    }
  });
  it('sanitizes all finance, commission and payout public error messages', async () => {
    const cases = [
      ['FINANCE_PERMISSION_DENIED', 403, 'Permission denied.'],
      ['FINANCE_BRANCH_SCOPE_DENIED', 403, 'Financial data is outside the authorized scope.'],
      ['FINANCE_ENTITLEMENT_DENIED', 403, 'Entitlement denied.'],
      ['FINANCE_NOT_FOUND', 404, 'Financial record was not found.'],
      [
        'FINANCE_IDEMPOTENCY_CONFLICT',
        409,
        'Finance request conflicts with an existing idempotency key.',
      ],
      ['FINANCE_IMMUTABLE_ENTRY', 409, 'Financial history cannot be changed destructively.'],
      ['FINANCE_CASH_REGISTER_NOT_OPEN', 409, 'Cash register session is not open.'],
      ['FINANCE_VALIDATION_ERROR', 400, 'Finance request payload is invalid.'],
      ['COMMISSION_PERMISSION_DENIED', 403, 'Permission denied.'],
      ['COMMISSION_BRANCH_SCOPE_DENIED', 403, 'Commission data is outside the authorized scope.'],
      ['COMMISSION_ENTITLEMENT_DENIED', 403, 'Entitlement denied.'],
      ['COMMISSION_NOT_FOUND', 404, 'Commission record was not found.'],
      ['COMMISSION_RULE_NOT_FOUND', 404, 'Commission rule was not found.'],
      [
        'COMMISSION_IDEMPOTENCY_CONFLICT',
        409,
        'Commission request conflicts with an existing idempotency key.',
      ],
      ['COMMISSION_IMMUTABLE_ACCRUAL', 409, 'Commission history cannot be changed destructively.'],
      ['COMMISSION_VALIDATION_ERROR', 400, 'Commission request payload is invalid.'],
      ['PAYOUT_PERMISSION_DENIED', 403, 'Permission denied.'],
      ['PAYOUT_BRANCH_SCOPE_DENIED', 403, 'Payout is outside the authorized scope.'],
      ['PAYOUT_ENTITLEMENT_DENIED', 403, 'Entitlement denied.'],
      ['PAYOUT_NOT_FOUND', 404, 'Payout was not found.'],
      [
        'PAYOUT_IDEMPOTENCY_CONFLICT',
        409,
        'Payout request conflicts with an existing idempotency key.',
      ],
      ['PAYOUT_IMMUTABLE', 409, 'Payout history cannot be changed destructively.'],
      ['PAYOUT_CASH_REGISTER_NOT_OPEN', 409, 'Cash register session is not open.'],
      ['PAYOUT_VALIDATION_ERROR', 400, 'Payout request payload is invalid.'],
      ['PAYOUT_INVALID_STATUS', 400, 'Payout status does not allow this operation.'],
    ] as const;

    for (const [code, status, message] of cases) {
      const response = jsonFromError(
        new CoreOperationsApplicationError(
          code,
          `${code} leaked tenant-secret branch-secret payout-secret`,
        ),
        `request-${code}`,
      );
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).toEqual({ error: { code, message, requestId: `request-${code}` } });
      expect(JSON.stringify(body)).not.toContain('tenant-secret');
      expect(JSON.stringify(body)).not.toContain('branch-secret');
      expect(JSON.stringify(body)).not.toContain('payout-secret');
    }
  });

  it('sanitizes all catalog and inventory public error messages', async () => {
    const cases = [
      ['CATALOG_PERMISSION_DENIED', 403, 'Permission denied.'],
      ['CATALOG_BRANCH_SCOPE_DENIED', 403, 'Catalog data is outside the authorized scope.'],
      ['CATALOG_ENTITLEMENT_DENIED', 403, 'Entitlement denied.'],
      ['CATALOG_NOT_FOUND', 404, 'Catalog record was not found.'],
      [
        'CATALOG_IDEMPOTENCY_CONFLICT',
        409,
        'Catalog request conflicts with an existing idempotency key.',
      ],
      ['CATALOG_VALIDATION_ERROR', 400, 'Catalog request payload is invalid.'],
      ['PRODUCT_UNAVAILABLE', 400, 'Product is unavailable for sale.'],
      ['INVENTORY_PERMISSION_DENIED', 403, 'Permission denied.'],
      ['INVENTORY_BRANCH_SCOPE_DENIED', 403, 'Inventory data is outside the authorized scope.'],
      ['INVENTORY_ENTITLEMENT_DENIED', 403, 'Entitlement denied.'],
      ['INVENTORY_NOT_FOUND', 404, 'Inventory record was not found.'],
      ['INVENTORY_PRODUCT_UNAVAILABLE', 400, 'Inventory product is unavailable.'],
      ['INVENTORY_INSUFFICIENT_STOCK', 400, 'Insufficient stock for this product and branch.'],
      [
        'INVENTORY_IDEMPOTENCY_CONFLICT',
        409,
        'Inventory request conflicts with an existing idempotency key.',
      ],
      ['INVENTORY_IMMUTABLE_MOVEMENT', 409, 'Inventory history cannot be changed destructively.'],
      ['INVENTORY_VALIDATION_ERROR', 400, 'Inventory request payload is invalid.'],
    ] as const;

    for (const [code, status, message] of cases) {
      const response = jsonFromError(
        new CoreOperationsApplicationError(
          code,
          `${code} leaked tenant-secret branch-secret product-secret`,
        ),
        `request-${code}`,
      );
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).toEqual({ error: { code, message, requestId: `request-${code}` } });
      expect(JSON.stringify(body)).not.toContain('tenant-secret');
      expect(JSON.stringify(body)).not.toContain('branch-secret');
      expect(JSON.stringify(body)).not.toContain('product-secret');
    }
  });
  it('keeps domain validation messages that do not identify forbidden tenant data', async () => {
    const response = jsonFromError(
      new CoreOperationsApplicationError(
        'ORDER_INVALID_STATUS',
        'Cancelled orders cannot be mutated.',
      ),
      'request-1',
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'ORDER_INVALID_STATUS',
        message: 'Cancelled orders cannot be mutated.',
        requestId: 'request-1',
      },
    });
  });
});
