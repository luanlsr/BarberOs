# Runbook: WhatsApp or Messaging Provider Failure

## Detection

- Provider send latency or rejection metrics increase.
- Webhook acceptance drops or signature failures spike.
- Messaging operations endpoint shows delayed events or failed deliveries.

## Containment

- Pause campaign dispatch if provider rejects or rate-limits sends.
- Keep opt-out processing prioritized.
- Do not log raw message bodies, tokens or provider payloads.

## Investigation

1. Capture request/correlation id and provider event id.
2. Confirm provider status and token validity.
3. Check webhook signature, timestamp tolerance and idempotency key.
4. Review campaign recipient outcomes and retry counts.

## Recovery

- Resume dispatch in batches after provider health returns.
- Requeue retryable jobs.
- Mark non-retryable outcomes with sanitized reason.

## Audit and Customer Impact

- Record delayed or failed campaign runs.
- Notify tenant admins if reminders/campaigns were delayed.
- Preserve opt-out audit evidence.
