---
name: barberos-ux-ui
description: Use when designing or implementing BarberOS frontend, PWA behavior, responsive layouts, UI components, design tokens, navigation, or product screens.
---

# BarberOS UX/UI

Use this skill for frontend work, design system work, responsive layouts, PWA behavior, screen design, interaction design and UX acceptance checks.

## Required Context

Read `specs/design.md` before UI work. Read the PWA/mobile addendum in `specs/prd.md` when responsive behavior or PWA requirements are involved.

## Experience Goal

BarberOS should feel like a premium, technological, discreet and operational system for barbershops. It must support a solo barber on a phone, reception on a tablet, and an owner on a desktop without becoming a generic admin dashboard.

## UX Priorities

- Less navigation, more action.
- Show the next useful step, not just raw data.
- Reveal information progressively.
- Touch first, with 44x44px minimum targets and 48px preferred for main actions.
- Mobile is not compressed desktop.
- If beauty conflicts with faster operation for receptionist/barber, operation wins.
- If finance depth conflicts with clarity, clarity wins.
- AI UX must make findings, intended action, affected people and money impact visible.

## Navigation

- Mobile uses bottom navigation with frequent actions and a central `+`.
- Desktop uses sidebar or compact navigation rail.
- Navigation is role-aware and permission-aware.
- Hide unavailable actions when possible; explain permission denial when necessary.

## Responsive Requirements

Design from 320px upward. Test or reason explicitly for:

- 320px
- 390px
- 768px
- 1024px
- 1440px
- 1920px

Use CSS Grid, Flexbox, container queries, `min/max/clamp`, and component-level responsiveness. Avoid horizontal page scroll for core flows.

## Visual System

- Prefer tokens for surfaces, foreground, border, accent, success, warning, danger, spacing, radius, shadow and type.
- Light, dark and system theme support should exist from the beginning.
- Brand accent: modern copper direction from the spec.
- AI accent: distinct violet direction from the spec.
- Avoid ERP oldness, spreadsheet feel, generic SaaS blandness, excessive gold, pure black, vintage barber cliches, skulls, barber poles and novelty typography.
- Use a consistent icon library, preferably Lucide when available.

## Components

Expected foundation includes:

- Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch.
- Badge, Avatar, Card, StatCard, Dialog, Drawer, BottomSheet, DropdownMenu, Tabs, SegmentedControl.
- Toast, Alert, Skeleton, Table, ResponsiveList, DatePicker, TimePicker.
- Calendar, AppointmentCard, OrderItem, ProductCard, CurrencyInput, ChartCard.
- EmptyState, AIInsight, AIActionCard, AIConfirmation.

Domain components should encode real operations: AppointmentCard, CustomerCard, ProfessionalCard, OrderSummary, PaymentMethodCard, CashRegisterSummary, FinancialKPI, StockLevel, CommissionSummary and CustomerRiskBadge.

## Screen Definition Of Done

A P0 screen is not complete unless it covers:

- mobile, tablet, desktop and wide desktop behavior;
- light and dark modes;
- default, loading, empty, error, disabled and offline states when relevant;
- mouse, touch and keyboard;
- permission-aware UI;
- basic WCAG 2.2 AA expectations.
