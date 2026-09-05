---
name: barberos-product-context
description: Use when planning BarberOS features, MVP scope, backlog, personas, product tradeoffs, or interpreting PRD requirements.
---

# BarberOS Product Context

Use this skill for product planning, feature slicing, backlog creation, acceptance criteria, user stories, or decisions that depend on the BarberOS PRD.

## Required Context

Read `specs/prd.md` before making product decisions. If architecture or UX implications matter, also read `specs/architecture.md` and `specs/design.md`. For full-product sequencing after the PRD, also read `PRODUCT_COMPLETION_ROADMAP.md`.

## Product Positioning

BarberOS is not just appointment scheduling. It is the intelligent operating system for a barbershop, combining operation, CRM, finance, team management, automation, WhatsApp and AI.

The product should help owners answer:

- What is happening in my barbershop?
- How much am I really earning?
- Where am I losing money or clients?
- What should I do now to improve the business?

## Personas To Preserve

Prioritize the needs of:

- Owner of a small barbershop with 2-5 professionals.
- Receptionist who needs speed and low-error workflows.
- Professional/barber who mostly needs own agenda, customers and earnings.
- Solo barber who needs simplicity and automation.
- Final customer who may interact through WhatsApp and public booking.
- Platform master admin, separate from tenant operations.

## Product Principles

- Simplicity before depth.
- Mobile first.
- One important action in few clicks.
- Data before opinion.
- AI as an interface, not a database.
- Security by default.
- Automation with human control.
- Modularity that scales from solo barber to multi-unit networks.

## MVP Bias

When slicing work, favor the shortest path to a usable operational loop:

1. Tenant, branch, membership and permissions.
2. Services, professionals, customers and schedules.
3. Appointment creation and agenda.
4. Check-in that opens an order.
5. Order/payment completion.
6. Basic financial, stock and commission outputs from real transactions.

Do not require advanced inventory, campaigns, subscriptions, full AI autonomy or complete finance setup before the first scheduling and POS value is usable.

## Acceptance Criteria Style

Tie acceptance criteria to observable outcomes and domain invariants. Include role/permission behavior, tenant isolation, responsive behavior, empty/error/loading states when relevant, and any audit/history requirement.
