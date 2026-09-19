## ADDED Requirements

### Requirement: Inventory Navigation

The system SHALL expose Produtos, Estoque and product sale entry points only when the authenticated context has matching inventory/order permissions, branch scope and inventory entitlement.

#### Scenario: Inventory area available

- **WHEN** an authenticated actor has inventory read permission and the inventory entitlement
- **THEN** the shell exposes Produtos e Estoque in the appropriate desktop, tablet or mobile navigation surface.

#### Scenario: Product sale action available

- **WHEN** an actor has order item permission and can access active catalog products for the Comanda branch
- **THEN** the shell or Comanda surface can expose product sale actions scoped to that Comanda.

#### Scenario: Inventory area unavailable

- **WHEN** an actor lacks inventory permission, branch scope or entitlement
- **THEN** the shell hides the unavailable entry point when possible
- **AND** direct route access returns a permission-denied state without exposing protected product or stock data.