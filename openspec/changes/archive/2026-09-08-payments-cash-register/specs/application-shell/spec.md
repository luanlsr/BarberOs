## ADDED Requirements

### Requirement: POS Cash Navigation

The system SHALL expose payment and cash register entry points in the operational shell only when the authenticated context has matching permissions and entitlements.

#### Scenario: Cash area available

- **WHEN** an authenticated actor has cash register permissions in the active branch
- **THEN** the shell exposes the Caixa area in the appropriate desktop or mobile navigation surface.

#### Scenario: Receive payment action available

- **WHEN** an authenticated actor has payment permission and a payable Comanda context
- **THEN** the shell or central action can expose a payment entry point scoped to that Comanda.

#### Scenario: Payment or cash area unavailable

- **WHEN** an actor lacks the required payment or cash permission
- **THEN** the shell hides the unavailable entry point when possible
- **AND** direct route access returns a permission-denied state without exposing protected cash or payment data.