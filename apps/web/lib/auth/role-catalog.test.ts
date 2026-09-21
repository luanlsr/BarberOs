import { describe, expect, it } from 'vitest';
import { accessProfiles, roleEntitlements, rolePermissions } from './role-catalog';

describe('BarberOS role catalog', () => {
  it('maps product profile names to internal RBAC roles', () => {
    expect(accessProfiles.superAdmin.role).toBe('PLATFORM_MASTER');
    expect(accessProfiles.admin.role).toBe('OWNER');
    expect(accessProfiles.user.role).toBe('RECEPTIONIST');
    expect(accessProfiles.barber.role).toBe('PROFESSIONAL');
  });

  it('gives receptionists operational sales, cash, stock and appointment access without admin-only controls', () => {
    expect(rolePermissions.RECEPTIONIST).toEqual(
      expect.arrayContaining([
        'appointments.read',
        'appointments.create',
        'orders.create',
        'payments.receive',
        'cash.open',
        'cash.close',
        'finance.read',
        'inventory.read',
      ]),
    );
    expect(roleEntitlements.RECEPTIONIST).toEqual(
      expect.arrayContaining(['core.operations', 'finance', 'inventory']),
    );
    expect(rolePermissions.RECEPTIONIST).not.toContain('finance.write');
    expect(rolePermissions.RECEPTIONIST).not.toContain('memberships.manage');
    expect(rolePermissions.RECEPTIONIST).not.toContain('commission.manage');
  });

  it('gives barbers their own operational and wallet access without tenant administration', () => {
    expect(rolePermissions.PROFESSIONAL).toEqual(
      expect.arrayContaining([
        'appointments.read',
        'customers.read',
        'orders.read',
        'commission.read',
      ]),
    );
    expect(roleEntitlements.PROFESSIONAL).toEqual(
      expect.arrayContaining(['core.operations', 'finance']),
    );
    expect(rolePermissions.PROFESSIONAL).not.toContain('payments.receive');
    expect(rolePermissions.PROFESSIONAL).not.toContain('inventory.write');
    expect(rolePermissions.PROFESSIONAL).not.toContain('memberships.manage');
  });

  it('keeps owner and platform master as elevated roles', () => {
    expect(rolePermissions.OWNER).toEqual(
      expect.arrayContaining(['memberships.manage', 'finance.write', 'inventory.write']),
    );
    expect(rolePermissions.PLATFORM_MASTER).toEqual(
      expect.arrayContaining(['audit.read', 'memberships.manage', 'finance.read']),
    );
    expect(roleEntitlements.PLATFORM_MASTER).toEqual(
      expect.arrayContaining(['core.operations', 'finance', 'inventory', 'ai']),
    );
  });
});
