## ADDED Requirements

### Requirement: Financial Navigation

The system SHALL expose Financeiro, Despesas, Comissoes/Repasses and Minha carteira entry points only when the authenticated context has the matching permission, role scope and entitlement.

#### Scenario: Finance area available

- **WHEN** an authenticated actor has finance read permission and the finance entitlement
- **THEN** the shell exposes Financeiro in the appropriate desktop, tablet or mobile navigation surface.

#### Scenario: Expense creation action available

- **WHEN** an actor has finance write permission and the finance entitlement
- **THEN** the shell or central action can expose Nova despesa without showing it to unauthorized actors.

#### Scenario: Professional wallet available

- **WHEN** a professional has permission to view own commission or wallet data
- **THEN** the shell exposes Minha carteira scoped to that professional.

#### Scenario: Financial area unavailable

- **WHEN** an actor lacks the required finance, commission or payout permission
- **THEN** the shell hides the unavailable entry point when possible
- **AND** direct route access returns a permission-denied state without exposing protected financial data.
