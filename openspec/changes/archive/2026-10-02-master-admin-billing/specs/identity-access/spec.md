## ADDED Requirements

### Requirement: Platform-scoped authorization

The system SHALL distinguish platform-scoped access from tenant-scoped membership access, requiring explicit platform membership and platform permissions for Master Admin, SaaS billing, support and cross-tenant metadata operations.

#### Scenario: Platform master authorized

- **WHEN** a user with active platform membership and required platform permission requests a Master Admin operation
- **THEN** the system authorizes the operation without requiring tenant membership for every tenant in the result set

#### Scenario: Tenant owner not platform authorized

- **WHEN** a tenant owner without platform membership requests a platform operation
- **THEN** the system rejects the operation even if the user owns their tenant

#### Scenario: Platform support has limited scope

- **WHEN** a platform support user requests tenant-private data
- **THEN** the system requires a valid support scope in addition to platform membership and permission

### Requirement: Effective entitlement resolution

The system SHALL resolve tenant feature access from active tenant subscription plan entitlements plus audited tenant-specific overrides before allowing a protected feature.

#### Scenario: Plan grants feature

- **WHEN** a tenant's active plan grants a feature entitlement
- **THEN** protected APIs and pages can allow the feature when user permissions also match

#### Scenario: Plan denies feature

- **WHEN** a tenant's active plan does not grant a feature entitlement
- **THEN** protected APIs and pages deny the feature regardless of user role permissions

#### Scenario: Override changes effective access

- **WHEN** a tenant-specific entitlement override exists
- **THEN** effective entitlement checks apply the override and expose the source of the decision for audit/debug views
