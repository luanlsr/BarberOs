# Runbook: Database Restore

## Detection

- Data corruption, accidental destructive migration or provider outage requires restore.
- Restore decision is approved by platform owner.

## Containment

- Freeze writes where possible.
- Preserve current database snapshot before restore.
- Stop workers that could replay side effects into an inconsistent state.

## Investigation

1. Identify restore point objective and affected tenants.
2. Identify migrations applied after the target restore point.
3. Identify external side effects already sent to providers.

## Recovery

- Restore to staging first when time allows.
- Validate migrations and RLS.
- Reconcile outbox/jobs and provider side effects before restarting workers.
- Run `npm run validate:production` against the restored environment when feasible.

## Audit and Customer Impact

- Record restore time, operator, reason and affected tenants.
- Notify impacted tenant admins if data visibility or writes were rolled back.
