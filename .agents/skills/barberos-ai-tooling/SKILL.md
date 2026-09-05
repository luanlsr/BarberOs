---
name: barberos-ai-tooling
description: Use when designing or implementing BarberOS Barber AI, FastAPI orchestration, Tool Gateway, function calling, tool policies, confirmations, or AI audit.
---

# BarberOS AI Tooling

Use this skill for Barber AI, tool calling, the FastAPI AI service, Tool Gateway design, AI safety policies, confirmations, evaluations and AI audit trails.

## Required Context

Read `specs/architecture.md` sections about AI, Tool Gateway and Function Calling. Read `specs/prd.md` Barber AI sections for product capabilities and risk levels. Read `specs/design.md` AI UX sections when user-facing confirmation or chat UI is involved.

## Architectural Boundary

The AI service never accesses the operational database directly.

Correct flow:

```text
FastAPI AI Service
↓
Tool Gateway
↓
Authorization
↓
Application Service
↓
Domain
↓
Database
```

The AI receives only authorized context through a short-lived service token. It must not choose arbitrary `tenant_id`, `branch_id`, permissions or actor identity.

## Tool Registry

Each tool should declare:

- stable name and version strategy;
- input schema;
- output schema where practical;
- required permission;
- risk level;
- handler;
- audit behavior;
- idempotency requirements for writes.

Representative tool domains:

- customers search/get/create;
- appointments availability/create/reschedule/cancel;
- services and professionals list/get;
- finance summaries and comparisons;
- CRM at-risk/inactive discovery;
- inventory stock lookup;
- campaigns draft/create/send;
- WhatsApp message send.

## Risk Policy

- Level 0/read: may run automatically after authorization.
- Level 1/low operational write: may run when intent is clear, such as creating a requested appointment.
- Level 2/relevant change: requires confirmation, such as bulk cancellation or campaign dispatch.
- Level 3/financial or sensitive: always requires explicit confirmation and authorization, such as refunds or payout changes.
- Level 4/prohibited autonomous action: never run autonomously, such as owner permission changes, tenant removal or permanent deletion of critical records.

When impact is meaningful, show what will happen, who or what is affected, relevant money/time, and the exact message/content when applicable.

## Confirmation Pattern

For sensitive or high-impact actions:

1. Create a pending action server-side with actor, tenant, expiration and payload hash.
2. Present a clear confirmation UI.
3. Execute only the confirmed payload through a confirmation token.
4. Audit both proposal and execution.

The AI must not silently alter the payload after confirmation.

## Evaluation

AI tests should validate behavior, not prose:

- detected intent;
- selected tool;
- tool arguments;
- permission decision;
- confirmation requirement;
- side effect or absence of side effect;
- audit record.
