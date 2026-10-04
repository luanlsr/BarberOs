import type {
  TenantVisualPreferences,
  ThemePreference,
  UserInterfacePreferences,
} from '@barberos/contracts';
import { createSupabaseServerClient, isDevelopmentAuthEnabled } from './auth/server';

export const defaultTenantVisualPreferences: TenantVisualPreferences = {
  tenantId: '',
  logoUrl: null,
  accentColorHex: '#F64C72',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export const defaultUserInterfacePreferences: UserInterfacePreferences = {
  tenantId: '',
  userId: '',
  theme: 'system',
  notificationPreferences: {},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

type TenantVisualPreferencesRow = {
  tenant_id: string;
  logo_url: string | null;
  accent_color_hex: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type UserInterfacePreferencesRow = {
  tenant_id: string;
  user_id: string;
  theme: ThemePreference;
  notification_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
};

export async function getTenantVisualPreferences(tenantId: string) {
  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      ...defaultTenantVisualPreferences,
      tenantId,
    };
  }

  const { data, error } = await client
    .from('tenant_visual_preferences')
    .select('tenant_id, logo_url, accent_color_hex, updated_by, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    if (isDevelopmentAuthEnabled()) return { ...defaultTenantVisualPreferences, tenantId };
    throw error;
  }

  return data ? mapTenantVisualPreferences(data as TenantVisualPreferencesRow) : null;
}

export async function getUserInterfacePreferences(tenantId: string, userId: string) {
  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      ...defaultUserInterfacePreferences,
      tenantId,
      userId,
    };
  }

  const { data, error } = await client
    .from('user_interface_preferences')
    .select('tenant_id, user_id, theme, notification_preferences, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isDevelopmentAuthEnabled()) return { ...defaultUserInterfacePreferences, tenantId, userId };
    throw error;
  }

  return data ? mapUserInterfacePreferences(data as UserInterfacePreferencesRow) : null;
}

export function mapTenantVisualPreferences(
  row: TenantVisualPreferencesRow,
): TenantVisualPreferences {
  return {
    tenantId: row.tenant_id,
    logoUrl: row.logo_url,
    accentColorHex: row.accent_color_hex,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserInterfacePreferences(
  row: UserInterfacePreferencesRow,
): UserInterfacePreferences {
  return {
    tenantId: row.tenant_id,
    userId: row.user_id,
    theme: row.theme,
    notificationPreferences: row.notification_preferences ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
