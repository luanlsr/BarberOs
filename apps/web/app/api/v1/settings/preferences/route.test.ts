import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET, PATCH } from './route';

const authMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getRequestContext: vi.fn(),
}));

const preferenceMocks = vi.hoisted(() => ({
  getTenantVisualPreferences: vi.fn(),
  getUserInterfacePreferences: vi.fn(),
  mapTenantVisualPreferences: vi.fn((row) => ({
    tenantId: row.tenant_id,
    logoUrl: row.logo_url,
    accentColorHex: row.accent_color_hex,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })),
  mapUserInterfacePreferences: vi.fn((row) => ({
    tenantId: row.tenant_id,
    userId: row.user_id,
    theme: row.theme,
    notificationPreferences: row.notification_preferences ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })),
}));

vi.mock('../../../../../lib/auth/server', () => authMocks);
vi.mock('../../../../../lib/settings-preferences', () => preferenceMocks);

const requestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['settings.read', 'settings.manage'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
};

describe('/api/v1/settings/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSupabaseServerClient.mockResolvedValue(null);
    authMocks.getRequestContext.mockResolvedValue(requestContext);
    preferenceMocks.getTenantVisualPreferences.mockResolvedValue(null);
    preferenceMocks.getUserInterfacePreferences.mockResolvedValue(null);
  });

  test('returns null preference groups instead of development persistence when no rows exist', async () => {
    const response = await GET(new Request('http://barberos.test/api/v1/settings/preferences'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        tenantPreferences: null,
        userPreferences: null,
      },
      requestId: 'request-1',
    });
  });

  test('does not save preferences in memory when persistence is unavailable', async () => {
    const response = await PATCH(
      new Request('http://barberos.test/api/v1/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantPreferences: {
            accentColorHex: '#123456',
            logoUrl: null,
          },
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: 'PERSISTENCE_NOT_CONFIGURED',
        message: 'Settings persistence is not configured.',
        requestId: 'request-1',
      },
    });
    expect(preferenceMocks.getTenantVisualPreferences).not.toHaveBeenCalled();
  });

  test('denies writes without settings management permission', async () => {
    authMocks.getRequestContext.mockResolvedValueOnce({
      ...requestContext,
      permissions: ['settings.read'],
    });

    const response = await PATCH(
      new Request('http://barberos.test/api/v1/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantPreferences: {
            accentColorHex: '#123456',
          },
        }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
