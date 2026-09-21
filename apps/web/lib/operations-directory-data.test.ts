import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { getOperationsDirectoryModel } from './operations-directory-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

describe('operations directory data', () => {
  test('builds customer directory with create and update permissions', () => {
    const model = getOperationsDirectoryModel(developmentSession, 'clientes');

    expect(model.title).toBe('Clientes');
    expect(model.canRead).toBe(true);
    expect(model.canCreate).toBe(true);
    expect(model.canUpdate).toBe(true);
    expect(model.items.map((item) => item.title)).toContain('Marcos Vinicius');
    expect(model.fields.map((field) => field.id)).toEqual(['name', 'phone', 'email', 'source']);
  });

  test('builds service directory with explicit empty state', () => {
    const model = getOperationsDirectoryModel(developmentSession, 'servicos', { state: 'empty' });

    expect(model.state).toBe('empty');
    expect(model.items).toEqual([]);
    expect(model.emptyTitle).toContain('Nenhum serviço');
  });

  test('denies read when permission or entitlement is missing', () => {
    const missingPermission = getOperationsDirectoryModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
      'equipe',
    );
    const missingEntitlement = getOperationsDirectoryModel(
      sessionWith({ permissions: ['services.read'], entitlements: [] }),
      'servicos',
    );

    expect(missingPermission.state).toBe('permission-denied');
    expect(missingPermission.items).toEqual([]);
    expect(missingEntitlement.state).toBe('permission-denied');
  });

  test('keeps creation disabled when write permission is absent', () => {
    const model = getOperationsDirectoryModel(
      sessionWith({
        permissions: ['customers.read'],
        entitlements: ['core.operations'],
      }),
      'clientes',
    );

    expect(model.canRead).toBe(true);
    expect(model.canCreate).toBe(false);
    expect(model.canUpdate).toBe(false);
  });
});
