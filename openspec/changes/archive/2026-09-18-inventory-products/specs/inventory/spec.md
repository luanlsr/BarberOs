## Purpose

Define branch-scoped stock control for BarberOS products through immutable movements, balance projections and low-stock alerts tied to auditable business events.

## ADDED Requirements

### Requirement: Inventory Locations And Balances

The system SHALL maintain branch-scoped inventory locations and stock balances for inventory-tracked products without relying on destructive direct stock edits.

#### Scenario: Branch stock is viewed

- **WHEN** an authorized actor opens Estoque for a branch
- **THEN** the system shows current stock balance, minimum stock, last movement and low-stock state for products in the actor's tenant and branch scope.

#### Scenario: Non-tracked product is sold

- **WHEN** a product marked as not inventory-tracked is sold
- **THEN** the system may include it in catalog and finance results
- **AND** does not require stock balance or stock movement records for that product.

### Requirement: Immutable Stock Movements

The system SHALL record stock changes as immutable tenant-scoped and branch-scoped movements with type, signed quantity, source reference, actor and reason when applicable.

#### Scenario: Manual stock entry is recorded

- **WHEN** an authorized actor records a purchase or stock entry for a tracked product
- **THEN** the system creates a positive stock movement linked to the product and branch
- **AND** the projected balance increases by the movement quantity.

#### Scenario: Loss or adjustment is recorded

- **WHEN** an authorized actor records loss, consumption or adjustment with a reason
- **THEN** the system creates an auditable stock movement
- **AND** does not mutate or delete prior movements.

#### Scenario: Duplicate movement request is retried

- **WHEN** a critical stock write is retried with the same idempotency key
- **THEN** the system returns the original result
- **AND** does not duplicate the stock movement.

### Requirement: Paid Product Sale Stock Effects

The system SHALL create stock sale movements for tracked product items only when payment completion makes a Comanda paid.

#### Scenario: Paid Comanda includes product item

- **WHEN** payment completion succeeds for a Comanda containing inventory-tracked product items
- **THEN** the system records stock `SALE` movements for each paid product item quantity
- **AND** links each movement to the Comanda, payment and source order item.

#### Scenario: Product is removed before payment

- **WHEN** a product item is added to and later removed from an unpaid Comanda
- **THEN** the system does not create sale or reversal stock movements for that transient item.

#### Scenario: Insufficient stock blocks tracked sale

- **WHEN** payment completion would sell more quantity than available for a tracked product that does not allow negative stock
- **THEN** the system rejects payment completion with a stable error
- **AND** no partial paid, finance or stock state is exposed as successful.

#### Scenario: Stock effect fails during payment completion

- **WHEN** a required stock sale movement cannot be persisted during payment completion
- **THEN** the whole payment completion is rolled back or reported as not completed
- **AND** no partial paid, finance or stock state is exposed as successful.

### Requirement: Low Stock Alerts

The system SHALL identify products whose projected branch balance is at or below their configured minimum stock and expose those alerts in inventory views.

#### Scenario: Product falls below minimum

- **WHEN** a stock movement makes a tracked product balance less than or equal to its minimum stock
- **THEN** the system marks the product as low stock for that branch
- **AND** exposes the alert to authorized inventory viewers.

#### Scenario: Stock is replenished

- **WHEN** a later positive stock movement raises the balance above minimum stock
- **THEN** the system clears the low-stock alert for that branch.

### Requirement: Inventory Authorization And Audit

The system SHALL enforce inventory permissions, entitlement and branch scope server-side and audit all stock-affecting mutations.

#### Scenario: Actor lacks inventory permission

- **WHEN** an actor without inventory write permission attempts to record a stock movement
- **THEN** the system denies the operation without changing stock state.

#### Scenario: Stock mutation succeeds

- **WHEN** a stock movement is recorded successfully
- **THEN** the system records actor, tenant, branch, product, movement type, signed quantity, source, result and timestamp in the audit trail.