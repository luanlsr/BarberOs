# Runbook: Worker Failure

## Detection

- Worker process is down or cannot claim jobs.
- Job retries or dead letters spike.
- Outbox events age beyond SLA.

## Containment

- Stop duplicate worker instances if lock behavior is suspect.
- Pause high-volume campaign or notification enqueueing if backlog is growing.
- Keep synchronous APIs returning stable responses.

## Investigation

1. Check worker boot logs and config.
2. Capture job id, outbox event id, tenant id, correlation id and attempt count.
3. Inspect retryability and sanitized error code.
4. Verify Redis/Supabase connectivity.

## Recovery

- Restart worker after config/connectivity fix.
- Requeue retryable jobs.
- Leave non-retryable dead letters visible for operator review.

## Audit and Customer Impact

- Record delayed notification/payment/provider effects.
- Notify affected tenants if customer-facing delivery was delayed.
