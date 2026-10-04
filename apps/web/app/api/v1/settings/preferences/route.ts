import { NextResponse } from 'next/server';
import {
  updateTenantVisualPreferencesCommandSchema,
  updateUserInterfacePreferencesCommandSchema,
  type ThemePreference,
} from '@barberos/contracts';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from '../../../../../lib/auth/server';
import {
  defaultTenantVisualPreferences,
  defaultUserInterfacePreferences,
  getTenantVisualPreferences,
  getUserInterfacePreferences,
  mapTenantVisualPreferences,
  mapUserInterfacePreferences,
} from '../../../../../lib/settings-preferences';
import { jsonError, jsonFromError } from '../../../../../src/modules/shared/presentation/api';

type PreferencesPayload = {
  tenantPreferences?: unknown;
  userPreferences?: unknown;
};

const devTenantPreferences = new Map<string, typeof defaultTenantVisualPreferences>();
const devUserPreferences = new Map<string, typeof defaultUserInterfacePreferences>();

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const context = await resolveContext(request, requestId);
  if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
  if (!context.permissions.includes('settings.read')) {
    return jsonError('CORE_PERMISSION_DENIED', 'Permission denied.', 403, context.requestId);
  }

  try {
    const tenantPreferences = devTenantPreferences.get(context.tenantId) ??
      (await getTenantVisualPreferences(context.tenantId)) ?? {
        ...defaultTenantVisualPreferences,
        tenantId: context.tenantId,
      };
    const userKey = `${context.tenantId}:${context.userId}`;
    const userPreferences = devUserPreferences.get(userKey) ??
      (await getUserInterfacePreferences(context.tenantId, context.userId)) ?? {
        ...defaultUserInterfacePreferences,
        tenantId: context.tenantId,
        userId: context.userId,
      };

    return NextResponse.json({
      data: { tenantPreferences, userPreferences },
      requestId: context.requestId,
    });
  } catch (error) {
    return jsonFromError(error, context.requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const context = await resolveContext(request, requestId);
  if (!context) return jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, requestId);
  if (!context.permissions.includes('settings.manage')) {
    return jsonError('CORE_PERMISSION_DENIED', 'Permission denied.', 403, context.requestId);
  }

  try {
    const payload = (await request.json()) as PreferencesPayload;
    const tenantCommand =
      payload.tenantPreferences === undefined
        ? null
        : updateTenantVisualPreferencesCommandSchema.parse(payload.tenantPreferences);
    const userCommand =
      payload.userPreferences === undefined
        ? null
        : updateUserInterfacePreferencesCommandSchema.parse(payload.userPreferences);

    if (!tenantCommand && !userCommand) {
      return jsonError(
        'CORE_VALIDATION_ERROR',
        'At least one preference group is required.',
        400,
        context.requestId,
      );
    }

    const client = await createSupabaseServerClient();
    if (!client) {
      if (!isDevelopmentAuthEnabled()) {
        throw Object.assign(new Error('Persistence is not configured.'), {
          code: 'PERSISTENCE_NOT_CONFIGURED',
        });
      }
      const saved = saveDevelopmentPreferences(context.tenantId, context.userId, {
        tenantCommand,
        userCommand,
      });
      return NextResponse.json({ data: saved, requestId: context.requestId });
    }

    const [tenantPreferences, userPreferences] = await Promise.all([
      tenantCommand
        ? upsertTenantPreferences(client, context.tenantId, context.userId, tenantCommand)
        : getTenantVisualPreferences(context.tenantId),
      userCommand
        ? upsertUserPreferences(client, context.tenantId, context.userId, userCommand)
        : getUserInterfacePreferences(context.tenantId, context.userId),
    ]);

    return NextResponse.json({
      data: {
        tenantPreferences: tenantPreferences ?? {
          ...defaultTenantVisualPreferences,
          tenantId: context.tenantId,
        },
        userPreferences: userPreferences ?? {
          ...defaultUserInterfacePreferences,
          tenantId: context.tenantId,
          userId: context.userId,
        },
      },
      requestId: context.requestId,
    });
  } catch (error) {
    return jsonFromError(error, context.requestId);
  }
}

async function resolveContext(request: Request, requestId: string) {
  const url = new URL(request.url);
  return getRequestContext(
    requestId,
    url.searchParams.get('tenantId') ?? undefined,
    url.searchParams.get('branchId') ?? undefined,
  );
}

async function upsertTenantPreferences(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  tenantId: string,
  userId: string,
  command: NonNullable<PreferencesPayload['tenantPreferences']>,
) {
  const parsed = updateTenantVisualPreferencesCommandSchema.parse(command);
  const { data, error } = await client
    .from('tenant_visual_preferences')
    .upsert(
      {
        tenant_id: tenantId,
        logo_url: parsed.logoUrl ?? null,
        font_color_hex: parsed.fontColorHex,
        accent_color_hex: parsed.accentColorHex,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    )
    .select(
      'tenant_id, logo_url, font_color_hex, accent_color_hex, updated_by, created_at, updated_at',
    )
    .single();
  if (error) throw error;
  return mapTenantVisualPreferences(data);
}

async function upsertUserPreferences(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  tenantId: string,
  userId: string,
  command: NonNullable<PreferencesPayload['userPreferences']>,
) {
  const parsed = updateUserInterfacePreferencesCommandSchema.parse(command);
  const { data, error } = await client
    .from('user_interface_preferences')
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        theme: parsed.theme,
        notification_preferences: parsed.notificationPreferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,user_id' },
    )
    .select('tenant_id, user_id, theme, notification_preferences, created_at, updated_at')
    .single();
  if (error) throw error;
  return mapUserInterfacePreferences(data);
}

function saveDevelopmentPreferences(
  tenantId: string,
  userId: string,
  {
    tenantCommand,
    userCommand,
  }: {
    tenantCommand: ReturnType<typeof updateTenantVisualPreferencesCommandSchema.parse> | null;
    userCommand: ReturnType<typeof updateUserInterfacePreferencesCommandSchema.parse> | null;
  },
) {
  const now = new Date().toISOString();
  const currentTenant = devTenantPreferences.get(tenantId) ?? {
    ...defaultTenantVisualPreferences,
    tenantId,
  };
  const currentUser = devUserPreferences.get(`${tenantId}:${userId}`) ?? {
    ...defaultUserInterfacePreferences,
    tenantId,
    userId,
  };
  const tenantPreferences = tenantCommand
    ? {
        ...currentTenant,
        logoUrl: tenantCommand.logoUrl ?? currentTenant.logoUrl,
        fontColorHex: tenantCommand.fontColorHex ?? currentTenant.fontColorHex,
        accentColorHex: tenantCommand.accentColorHex ?? currentTenant.accentColorHex,
        updatedBy: userId,
        updatedAt: now,
      }
    : currentTenant;
  const userPreferences = userCommand
    ? {
        ...currentUser,
        theme: (userCommand.theme ?? currentUser.theme) as ThemePreference,
        notificationPreferences:
          userCommand.notificationPreferences ?? currentUser.notificationPreferences,
        updatedAt: now,
      }
    : currentUser;

  devTenantPreferences.set(tenantId, tenantPreferences);
  devUserPreferences.set(`${tenantId}:${userId}`, userPreferences);
  return { tenantPreferences, userPreferences };
}
