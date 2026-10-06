import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getTenantVisualPreferences,
  getUserInterfacePreferences,
  mapTenantVisualPreferences,
} from './settings-preferences';

const authMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  isDevelopmentAuthEnabled: vi.fn(),
}));

vi.mock('./auth/server', () => authMocks);

describe('settings preferences data access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSupabaseServerClient.mockResolvedValue(null);
    authMocks.isDevelopmentAuthEnabled.mockReturnValue(true);
  });

  test('returns an empty tenant preference state when persistence is not configured', async () => {
    await expect(getTenantVisualPreferences('tenant-1')).resolves.toBeNull();
  });

  test('returns an empty user preference state when persistence is not configured', async () => {
    await expect(getUserInterfacePreferences('tenant-1', 'user-1')).resolves.toBeNull();
  });

  test('maps persisted tenant visual preferences without injecting defaults', () => {
    expect(
      mapTenantVisualPreferences({
        tenant_id: 'tenant-1',
        logo_url: null,
        accent_color_hex: '#123456',
        updated_by: null,
        created_at: '2026-10-01T10:00:00.000Z',
        updated_at: '2026-10-02T10:00:00.000Z',
      }),
    ).toEqual({
      tenantId: 'tenant-1',
      logoUrl: null,
      accentColorHex: '#123456',
      updatedBy: undefined,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
  });
});
