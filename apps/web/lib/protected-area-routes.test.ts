import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { canAccessProtectedArea, getProtectedAreaRoute } from './protected-area-routes';

const baseSession: Pick<SessionContext, 'permissions' | 'entitlements'> = {
  permissions: [],
  entitlements: [],
};

describe('protected area routes', () => {
  it('requires permission and entitlement for messaging, campaigns and delivery status', () => {
    expect(
      canAccessProtectedArea(
        {
          ...baseSession,
          permissions: ['messaging.read'],
          entitlements: [],
        },
        getProtectedAreaRoute('mensagens'),
      ),
    ).toBe(false);
    expect(
      canAccessProtectedArea(
        {
          ...baseSession,
          permissions: ['campaigns.read'],
          entitlements: ['campaigns'],
        },
        getProtectedAreaRoute('campanhas'),
      ),
    ).toBe(true);
    expect(
      canAccessProtectedArea(
        {
          ...baseSession,
          permissions: ['notifications.status.read'],
          entitlements: ['notifications'],
        },
        getProtectedAreaRoute('entregas'),
      ),
    ).toBe(true);
  });

  it('falls back unknown placeholder routes to dashboard permission', () => {
    expect(
      canAccessProtectedArea(
        {
          ...baseSession,
          permissions: ['dashboard.read'],
        },
        getProtectedAreaRoute('qualquer-area'),
      ),
    ).toBe(true);
  });
});
