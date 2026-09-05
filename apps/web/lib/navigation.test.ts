import { describe, expect, it } from 'vitest';
import { filterNavigation, filterPrimaryActions, navigationItems, primaryActionItems } from './navigation';

describe('filterNavigation', () => {
  it('keeps only areas allowed by permissions and entitlements', () => {
    const visible = filterNavigation(
      navigationItems,
      ['dashboard.read', 'appointments.read', 'customers.read', 'professionals.read', 'services.read'],
      ['core.operations'],
    );

    expect(visible.map((item) => item.href)).toEqual(['/', '/agenda', '/clientes', '/equipe', '/servicos']);
  });

  it('does not infer access from permission when entitlement is missing', () => {
    const visible = filterNavigation(navigationItems, ['appointments.read', 'customers.read'], []);
    expect(visible).toEqual([]);
  });

  it('does not infer access from the tenant identifier', () => {
    const visible = filterNavigation(navigationItems, [], ['core.operations']);
    expect(visible).toEqual([]);
  });
});

describe('filterPrimaryActions', () => {
  it('shows new appointment and customer actions only when allowed', () => {
    const visible = filterPrimaryActions(
      primaryActionItems,
      ['appointments.create', 'customers.create'],
      ['core.operations'],
    );

    expect(visible.map((item) => item.href)).toEqual(['/agenda?mode=new', '/clientes?mode=new']);
  });

  it('hides create actions without the core operations entitlement', () => {
    const visible = filterPrimaryActions(primaryActionItems, ['appointments.create', 'customers.create'], []);
    expect(visible).toEqual([]);
  });
});