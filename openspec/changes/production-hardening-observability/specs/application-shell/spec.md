## ADDED Requirements

### Requirement: Production UI readiness

The system SHALL validate P0 operational surfaces against mobile, tablet and desktop layouts, light and dark themes, loading, empty, error, disabled, offline, permission denied and basic WCAG 2.2 AA interaction expectations before production release.

#### Scenario: P0 surface readiness

- **WHEN** production readiness is evaluated for Agenda, Comanda, Caixa, Financeiro, Estoque, Mensagens, Barber AI and Master Admin surfaces
- **THEN** each covered surface has automated or documented readiness evidence for supported viewports, states, permissions and accessibility basics

#### Scenario: Recoverable UI failure

- **WHEN** a P0 surface cannot load required data
- **THEN** the UI shows a recoverable, non-sensitive error state with a stable action or fallback instead of exposing technical details to the user

### Requirement: Critical E2E route coverage

The system SHALL include critical route coverage for production release that exercises permission-aware navigation and direct-route denial across tenant and platform areas.

#### Scenario: Authorized navigation path

- **WHEN** an authorized user follows a critical operational path from the shell
- **THEN** the route sequence preserves the correct workspace context and exposes only permitted actions

#### Scenario: Direct forbidden route

- **WHEN** a user directly opens a protected route without the required permission, entitlement or platform membership
- **THEN** the system renders a permission denied state or redirects without loading protected data
