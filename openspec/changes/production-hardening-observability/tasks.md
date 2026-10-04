## 1. Release Readiness Baseline

- [x] 1.1 Create a production readiness checklist under repo docs covering validation gates, owners, release blockers and manual checks, and verify the checklist links to the relevant scripts/runbooks.
- [x] 1.2 Add a tenant isolation matrix covering all tenant-scoped modules, read/write surfaces, side effects, RLS/migration evidence and test evidence, and verify every implemented module has an explicit status.
- [x] 1.3 Add a P0 UI readiness matrix for Agenda, Comanda, Caixa, Financeiro, Estoque, Mensagens, Barber AI and Master Admin covering supported viewports, states, permission denial and WCAG basics, and verify every P0 surface has evidence or a documented gap.

## 2. Validation Commands and CI

- [x] 2.1 Add `validate:production` to compose format/lint/typecheck/tests/build, client-secret validation, migration validators and OpenSpec validation, and verify the command fails fast with the failing step visible.
- [x] 2.2 Add or update validation scripts so all current migration validators are included in the production gate, and verify each `validate:*` migration script still passes independently.
- [x] 2.3 Update GitHub Actions to run the production readiness gate or its CI-safe equivalent, and verify `.github/workflows/ci.yml` remains valid YAML and `npm run format:check` covers it.
- [x] 2.4 Add release documentation for when to run `npm run test:e2e`, provider manual checks and OpenSpec strict validation, and verify the docs distinguish deterministic CI checks from external-provider checks.

## 3. Observability and Sanitization

- [x] 3.1 Add a shared observability event contract/helper for web, worker and AI-compatible events with service, environment, event, request/correlation id, tenant-safe context, result, sanitized error and metadata, and verify unit tests cover event shape.
- [x] 3.2 Extend or reuse the worker logger sanitization rules for shared sensitive metadata redaction, and verify tests redact tokens, service role keys, payment fields, message bodies and raw provider payloads.
- [x] 3.3 Add request/correlation id propagation tests for at least one web route, one worker job path and one AI/tool-gateway or documented AI boundary path, and verify logs/audit-safe records preserve the id where available.
- [x] 3.4 Add operational failure logging/readiness coverage for worker, webhook, AI/tool or billing failures, and verify the emitted or documented signal includes module, sanitized error code, retryability and tenant-safe context.

## 4. Security, Rate Limits and Secret Boundaries

- [x] 4.1 Implement or document rate-limit policy boundaries for auth, AI, public booking, WhatsApp/campaigns, search, webhooks and platform support, and verify tests cover at least one allow path and one exceeded-limit path.
- [x] 4.2 Extend client-secret validation to cover newly introduced public config and observability/deploy docs, and verify `npm run validate:client-secrets` passes.
- [x] 4.3 Add focused tenant-isolation tests for the highest-risk uncovered modules from the isolation matrix, and verify Tenant B cannot read or mutate Tenant A records.
- [x] 4.4 Review RLS/policy/index readiness for production-sensitive tables, record findings in the readiness checklist, and verify no blocker is left without an owner or follow-up task.

## 5. Critical E2E and UI Readiness

- [x] 5.1 Add or update Playwright smoke coverage for permission-aware navigation and direct-route denial across tenant and platform areas, and verify `npm run test:e2e` passes or the blocking external dependency is documented.
- [x] 5.2 Add E2E or documented readiness coverage for login -> agenda -> check-in -> Comanda -> payment -> commission, and verify the release checklist records the automated or manual evidence.
- [x] 5.3 Add E2E or documented readiness coverage for walk-in -> new Comanda -> service/product -> payment -> stock -> finance, and verify the release checklist records the automated or manual evidence.
- [x] 5.4 Add E2E or documented readiness coverage for WhatsApp or AI -> availability -> appointment, and verify provider-dependent steps are mocked, contract-tested or explicitly manual.
- [x] 5.5 Add accessibility/readiness checks for P0 surfaces using existing Playwright/axe capability where feasible, and verify at least one mobile and one desktop run are covered.

## 6. Deployment and Runbooks

- [x] 6.1 Add production deployment readiness docs for Vercel web, Railway worker, Railway AI, Supabase and Redis, and verify required environment variables, health checks and secret ownership are listed.
- [x] 6.2 Add runbooks for payment failure, WhatsApp/provider failure, worker failure, tenant isolation incident, database restore and platform support access, and verify each includes detection, containment, investigation, recovery, audit and customer impact.
- [x] 6.3 Add a production rollback and expand/migrate/contract note for future migrations, and verify it aligns with `specs/architecture.md` deployment guidance.
- [x] 6.4 Update `PRODUCT_COMPLETION_ROADMAP.md` to mark `production-hardening-observability` in progress or completed according to implementation status, and verify the PRD progress/status text remains accurate.

## 7. Final Validation

- [x] 7.1 Run focused tests added by this change and verify all pass.
- [x] 7.2 Run `npm run validate:production` and verify production readiness checks pass or document any intentionally manual external-provider checks.
- [x] 7.3 Run `npm run test:e2e` where feasible and verify critical flow readiness evidence is recorded.
- [x] 7.4 Run `npx openspec validate production-hardening-observability --strict` and fix any planning/spec issues.
- [x] 7.5 Run final `npm run validate` and verify format, lint, typecheck, tests and build pass.
