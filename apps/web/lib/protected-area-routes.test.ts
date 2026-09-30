import { describe, expect, it } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { canAccessProtectedArea, getProtectedAreaRoute } from './protected-area-routes';

const baseSession: Pick<SessionContext, 'permissions' | 'entitlements'> = {
  permissions: [],
  entitlements: [],
};

describe('protected area routes', () => {
  it('requires permission and entitlement for messaging, campaigns and delivery status', () => {
    const cases = [
      ['mensagens', 'messaging.read', 'messaging'],
      ['campanhas', 'campaigns.read', 'campaigns'],
      ['entregas', 'notifications.status.read', 'notifications'],
    ] as const;

    for (const [area, permission, entitlement] of cases) {
      expect(
        canAccessProtectedArea(
          {
            ...baseSession,
            permissions: [permission],
            entitlements: [],
          },
          getProtectedAreaRoute(area),
        ),
      ).toBe(false);
      expect(
        canAccessProtectedArea(
          {
            ...baseSession,
            permissions: [],
            entitlements: [entitlement],
          },
          getProtectedAreaRoute(area),
        ),
      ).toBe(false);
      expect(
        canAccessProtectedArea(
          {
            ...baseSession,
            permissions: [permission],
            entitlements: [entitlement],
          },
          getProtectedAreaRoute(area),
        ),
      ).toBe(true);
    }
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
