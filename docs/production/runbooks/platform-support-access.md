# Runbook: Platform Support Access

## Detection

- Support user needs tenant-private operational access.
- A support scope is requested, expires or is denied.

## Containment

- Never grant broad tenant-private access without a purpose and expiration.
- Revoke expired or incorrectly scoped support access.
- Deny silent private data access without a valid support scope.

## Investigation

1. Confirm requester platform membership and permission.
2. Confirm tenant, purpose, allowed operation class and expiration.
3. Check platform audit log for prior support actions.

## Recovery

- Create a narrow support scope only when approved.
- Execute support action with request id and audit metadata.
- Expire or revoke scope after the support window.

## Audit and Customer Impact

- Record actor, tenant, purpose, scope, result and request id.
- Notify tenant owner when support policy requires disclosure.
