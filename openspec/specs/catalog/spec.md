# catalog Specification

## Purpose

Define the operational product catalog used by BarberOS to sell products in Comandas while preserving tenant scope, sale snapshots and inventory-relevant product metadata.

## Requirements

### Requirement: Product Catalog Records

The system SHALL let authorized actors manage tenant-scoped product categories and products with branch applicability, sellable status, inventory tracking, sale price, cost metadata and optional supplier metadata.

#### Scenario: Product is created

- **WHEN** an authorized actor creates a product for a tenant branch or all permitted branches
- **THEN** the system stores the product with tenant scope, branch applicability, category, name, sale price, optional cost, stock tracking flag, negative-stock policy and active status
- **AND** the product can be used only inside branches allowed by that scope.

#### Scenario: Product category is archived

- **WHEN** an authorized actor archives a product category
- **THEN** the system prevents new active products from being assigned to the archived category
- **AND** existing product sale snapshots remain readable for historical Comandas.

#### Scenario: Supplier metadata is recorded

- **WHEN** a product has supplier or purchase contact information
- **THEN** the system stores that metadata without requiring advanced procurement automation.

### Requirement: Product Search And Visibility

The system SHALL expose product list, search and detail views filtered by tenant, branch scope, status and inventory entitlement.

#### Scenario: Authorized actor searches products

- **WHEN** an actor with inventory read permission searches products in an entitled tenant
- **THEN** the system returns only products in the actor's tenant and allowed branch scope
- **AND** includes stock and low-stock summaries when available.

#### Scenario: Archived product hidden from sale

- **WHEN** a product is archived or inactive
- **THEN** the product is excluded from new Comanda catalog selection
- **AND** historical orders still show the original product snapshot.

#### Scenario: Cross-tenant product access is denied

- **WHEN** a Tenant B actor requests a Tenant A product or category
- **THEN** the system returns not found or forbidden without leaking Tenant A catalog data.

### Requirement: Catalog Authorization And Audit

The system SHALL enforce catalog permissions server-side and audit product/category mutations that affect sale availability, price or cost.

#### Scenario: Actor lacks catalog write permission

- **WHEN** an actor without inventory write permission attempts to create, update or archive a product
- **THEN** the system denies the operation without changing catalog state.

#### Scenario: Product mutation succeeds

- **WHEN** a product or category mutation succeeds
- **THEN** the system records actor, tenant, branch scope, action, result, changed sale/cost fields and timestamp in the audit trail.