import type { TenantVisualPreferences } from '@barberos/contracts';

export const BARBEROS_BRAND_PREFERENCES_STORAGE_KEY = 'barberos-brand-preferences';

export type BrandThemePreferences = Pick<TenantVisualPreferences, 'accentColorHex' | 'logoUrl'>;

export function normalizeBrandThemePreferences(
  preferences: Partial<BrandThemePreferences> | null | undefined,
): BrandThemePreferences | null {
  if (!preferences?.accentColorHex && !preferences?.logoUrl) {
    return null;
  }

  return {
    accentColorHex: preferences.accentColorHex ?? '',
    logoUrl: preferences.logoUrl ?? null,
  };
}

export function applyBrandThemePreferences(
  preferences: Partial<BrandThemePreferences> | null | undefined,
  target: HTMLElement = document.documentElement,
) {
  const normalized = normalizeBrandThemePreferences(preferences);
  if (!normalized) return;

  if (normalized.accentColorHex) {
    target.style.setProperty('--accent', normalized.accentColorHex);
    target.style.setProperty('--color-accent', normalized.accentColorHex);
    target.style.setProperty(
      '--accent-strong',
      `color-mix(in srgb, ${normalized.accentColorHex} 64%, var(--foreground))`,
    );
    target.style.setProperty(
      '--accent-soft',
      `color-mix(in srgb, ${normalized.accentColorHex} 14%, var(--surface))`,
    );
    target.style.setProperty(
      '--accent-gradient',
      `linear-gradient(135deg, ${normalized.accentColorHex} 0%, color-mix(in srgb, ${normalized.accentColorHex} 72%, #ffffff) 100%)`,
    );
    target.style.setProperty('--on-accent', getReadableTextColor(normalized.accentColorHex));
  }
}

export function readStoredBrandThemePreferences(): BrandThemePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(BARBEROS_BRAND_PREFERENCES_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<BrandThemePreferences>;
    return normalizeBrandThemePreferences(parsed);
  } catch {
    return null;
  }
}

export function storeBrandThemePreferences(preferences: BrandThemePreferences) {
  window.localStorage.setItem(BARBEROS_BRAND_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function getReadableTextColor(color: string) {
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? '#17191C' : '#FFFFFF';
}
