## ADDED Requirements

### Requirement: Product Catalog Order Items

The system SHALL allow authorized actors to add active catalog products to Comandas while preserving product sale snapshots and without creating stock movements before payment completion.

#### Scenario: Product item is added from catalog

- **WHEN** an authorized actor adds an active product from the catalog to an open Comanda
- **THEN** the order item stores product source type, product source id, name snapshot, quantity, unit sale price, optional cost snapshot, discount and final amount
- **AND** the item remains tenant-scoped and branch-scoped to the Comanda.

#### Scenario: Product unavailable for branch

- **WHEN** an actor attempts to add a product outside the Comanda branch scope or tenant
- **THEN** the system rejects the item without exposing out-of-scope product data.

#### Scenario: Unpaid product item is changed

- **WHEN** a product item is updated or removed before payment completion
- **THEN** the system recalculates Comanda totals server-side
- **AND** does not create stock movement history for the unpaid transient state.