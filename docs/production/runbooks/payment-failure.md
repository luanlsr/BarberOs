# Runbook: Payment Failure

## Detection

- Payment API returns stable error responses.
- Provider webhook fails signature, idempotency or lifecycle validation.
- Cash/payment dashboards show unpaid or partially paid Comandas unexpectedly.

## Containment

- Disable new provider-dependent payment attempts if provider outage is confirmed.
- Keep cash/manual payment operations available only when authorized.
- Do not mutate paid transactions in place; use refund, reversal or adjustment flows.

## Investigation

1. Capture request id, tenant id, branch id, order id and provider event id.
2. Check webhook signature/timestamp logs.
3. Check payment idempotency key and financial entry source.
4. Verify cash movement and financial entry were or were not created.

## Recovery

- Retry idempotent webhook processing when safe.
- Reconcile provider state against local payment state.
- Create audited corrective movement for financial mismatch.

## Audit and Customer Impact

- Record impacted tenants/orders.
- Record any manual correction with actor, reason and request id.
- Notify affected tenant admins when money movement visibility changed.
