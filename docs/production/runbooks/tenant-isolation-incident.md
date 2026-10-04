# Runbook: Tenant Isolation Incident

## Detection

- Cross-tenant read/write test fails.
- User reports seeing another tenant's data.
- Logs show tenant id mismatch, branch-scope denial or unexpected platform access.

## Containment

- Disable affected route, job or platform action if active leakage is possible.
- Revoke suspicious sessions and support scopes.
- Preserve logs, audit rows and request ids.

## Investigation

1. Identify affected tenant ids, user ids, membership ids and request ids.
2. Determine whether data was read, written or only attempted.
3. Check application authorization, repository tenant filters and RLS policy.
4. Compare against [tenant-isolation-matrix.md](../tenant-isolation-matrix.md).

## Recovery

- Patch authorization/query/RLS defect.
- Add regression test before re-enabling the path.
- Re-run affected migration validator and `npm run validate:production`.

## Audit and Customer Impact

- Preserve immutable audit evidence.
- Notify impacted tenant owners according to legal/support policy.
- Document post-incident validation and follow-up owner.
