# Release and Rollback

## Release Gate

Run:

```bash
npm run validate:production
npm run test:e2e
npx openspec validate production-hardening-observability --strict
```

If provider-dependent checks are required, record them in [readiness-checklist.md](readiness-checklist.md) before approval.

## Migration Discipline

Follow expand/migrate/contract:

1. Expand: add nullable columns, new tables, new indexes and backward-compatible code.
2. Migrate: backfill or dual-write while old reads still work.
3. Contract: remove old code or columns only after the deployed application no longer depends on them.

Avoid `DROP COLUMN`, destructive rewrites or policy removals in the same release that removes application usage.

## Rollback

Prefer application rollback before database rollback when migrations are additive.

Rollback steps:

1. Stop new deploy rollout.
2. Preserve logs, request ids and audit entries.
3. Roll back the application image/version.
4. Keep additive database changes in place unless they are the confirmed cause.
5. If data correction is required, create a versioned corrective migration or audited admin operation.
6. Re-run the affected validator and `npm run validate:production` before resuming rollout.

## Production Incident Freeze

During an active tenant-isolation, payment, provider or database incident:

- pause non-critical deploys;
- preserve audit/log evidence;
- use the relevant runbook;
- record customer impact and remediation.
