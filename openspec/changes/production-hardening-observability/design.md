## Context

The repo already has a broad functional MVP and validation baseline: `npm run validate`, per-domain migration validators, client-secret validation, Vitest, Playwright, axe dependency, GitHub Actions for Node and AI, worker structured logging, request-id fields in contracts, and OpenSpec specs for the implemented domains. The final epic should harden and connect those pieces rather than introduce a new platform layer.

## Goals / Non-Goals

**Goals:**

- Make production readiness auditable through one release gate plus focused supporting scripts/docs.
- Strengthen cross-tenant and platform/tenant isolation confidence across the modules already implemented.
- Standardize safe observability for web, worker and AI without logging sensitive payloads.
- Add the highest-value E2E/readiness coverage for the PRD critical flows.
- Document deploy environments and runbooks so the MVP can be operated by a small team.

**Non-Goals:**

- Replace the existing monorepo, CI provider, hosting targets or test framework.
- Add a full external observability vendor integration before the core structured events and request ids are consistent.
- Build exhaustive browser automation for every role and screen; this change prioritizes P0 flows and production blockers.
- Introduce destructive migrations or break compatibility with existing demo/seed data.

## Decisions

### Production readiness gate composes existing commands

Use an additive script such as `validate:production` that composes existing checks (`validate`, `validate:client-secrets`, migration validators, OpenSpec validation and E2E where feasible) instead of duplicating logic in CI.

Rationale: the repo already has stable command boundaries and domain validators. A wrapper makes local and CI behavior easier to compare.

Alternative considered: move all validation logic into GitHub Actions only. Rejected because release readiness should be reproducible locally and not tied to one CI runner.

### Tenant isolation uses a matrix plus focused automated tests

Create a production isolation matrix that lists each tenant-scoped module, read/write surfaces, side effects, RLS/migration coverage and test evidence. Add focused tests for the riskiest gaps rather than rewriting every module test in one pass.

Rationale: the product spans many modules, and the matrix prevents hidden gaps while allowing implementation to prioritize business risk.

Alternative considered: declare readiness only from existing tests. Rejected because existing coverage is broad but not organized as release evidence.

### Observability starts with shared event shape and sanitization

Add or consolidate lightweight web/worker/AI observability helpers around a common event shape: service, environment, event, request/correlation id, tenant-safe context, result, sanitized error and metadata. Reuse the worker logger's redaction model as the baseline.

Rationale: this gives useful production signals without forcing a vendor dependency or leaking sensitive provider payloads.

Alternative considered: instrument directly for a specific external APM vendor. Deferred until core event shape and request propagation are stable.

### E2E coverage targets critical release paths first

Use Playwright for smoke paths and route/access checks that can run against seeded/demo state. Where external providers or AI/WhatsApp calls are not deterministic locally, document a manual readiness check and keep provider boundaries mocked or contract-tested.

Rationale: the critical flows must be validated, but production readiness should not depend on live third-party side effects in CI.

Alternative considered: full live provider E2E for WhatsApp, payment and AI. Rejected for CI reliability and secret-boundary reasons.

### Runbooks live in repo documentation

Create concise runbooks under a repo docs path, covering detection, containment, investigation, recovery, audit and customer impact. Link them from the production readiness checklist.

Rationale: the small operating team needs versioned, searchable instructions close to the code and deployment configuration.

Alternative considered: keep runbooks only in an external wiki. Rejected because this would make readiness non-reproducible from the repo.

## Risks / Trade-offs

- [Risk] Production validation becomes slow or flaky → Mitigation: split a deterministic `validate:production` gate from provider-dependent manual checks and keep long-running E2E scoped to P0 paths.
- [Risk] Logs expose private customer/payment/message data → Mitigation: centralize redaction, add tests for sensitive keys and document forbidden metadata.
- [Risk] Rate limiting requires real Redis behavior not available in all local runs → Mitigation: define an adapter boundary and test policy behavior with in-memory fakes while documenting production Redis configuration.
- [Risk] E2E seed data diverges from product behavior → Mitigation: reuse existing demo seed scripts and validate flows through public APIs or UI states rather than brittle implementation details.
- [Risk] CI runtime increases sharply → Mitigation: keep existing `validate` as the default fast gate and reserve full production readiness for release/PR checks where appropriate.

## Migration Plan

1. Add docs and readiness matrices first; no runtime behavior changes.
2. Add validation scripts and CI references that compose existing checks.
3. Add observability helpers and rate-limit boundaries in expand-only fashion.
4. Add tests/E2E coverage incrementally, keeping deterministic mocks for external providers.
5. Run `npm run validate`, `npm run validate:production`, `npm run test:e2e` where feasible and `npx openspec validate production-hardening-observability --strict`.

Rollback is straightforward for docs/scripts/tests. Runtime helper changes should be additive; if a production issue appears, disable the new wrapper command or route-specific rate-limit adapter while preserving existing authorization and validation.
