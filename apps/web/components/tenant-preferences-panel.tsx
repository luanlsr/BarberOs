'use client';

import * as React from 'react';
import { ImageIcon, Palette, RotateCcw, Save } from 'lucide-react';
import type { TenantVisualPreferences } from '@barberos/contracts';
import {
  applyBrandThemePreferences,
  storeBrandThemePreferences,
  type BrandThemePreferences,
} from '../lib/brand-theme';
import { AppToastRegion, useAppToast } from './app-toast';

type TenantPreferencesPanelProps = {
  canManage: boolean;
  initialPreferences: TenantVisualPreferences | null;
};

export function TenantPreferencesPanel({
  canManage,
  initialPreferences,
}: Readonly<TenantPreferencesPanelProps>) {
  const [accentColorHex, setAccentColorHex] = React.useState(
    initialPreferences?.accentColorHex ?? '#F64C72',
  );
  const [saving, setSaving] = React.useState(false);
  const { dismissToast, showToast, toast } = useAppToast();

  React.useEffect(() => {
    const rootStyles = window.getComputedStyle(document.documentElement);
    if (!initialPreferences?.accentColorHex) {
      setAccentColorHex(toColorInputValue(rootStyles.getPropertyValue('--accent'), '#F64C72'));
    }
  }, [initialPreferences]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const preferences: BrandThemePreferences = {
      accentColorHex,
      logoUrl: initialPreferences?.logoUrl ?? null,
    };

    applyBrandThemePreferences(preferences);
    storeBrandThemePreferences(preferences);

    if (!canManage) {
      showToast('Seu perfil pode visualizar, mas não salvar preferências.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/v1/settings/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantPreferences: {
            accentColorHex,
            logoUrl: initialPreferences?.logoUrl ?? null,
          },
        }),
      });

      if (!response.ok) throw new Error('Falha ao salvar preferências.');
      const payload = (await response.json()) as {
        data?: { tenantPreferences?: TenantVisualPreferences };
      };
      const saved = payload.data?.tenantPreferences;
      if (saved) {
        const savedPreferences = {
          accentColorHex: saved.accentColorHex,
          logoUrl: saved.logoUrl ?? null,
        };
        applyBrandThemePreferences(savedPreferences);
        storeBrandThemePreferences(savedPreferences);
      }
      showToast('Preferências visuais salvas com sucesso.');
    } catch {
      showToast(
        'Não foi possível salvar no servidor. A cor ficou aplicada nesta sessão.',
        'warning',
      );
    } finally {
      setSaving(false);
    }
  }

  function restoreCurrentTheme() {
    const rootStyles = window.getComputedStyle(document.documentElement);
    setAccentColorHex(toColorInputValue(rootStyles.getPropertyValue('--accent'), '#F64C72'));
    showToast('Cor de destaque sincronizada com o tema atual.');
  }

  return (
    <>
      <form className="settings-brand-preview preferences-panel" onSubmit={handleSubmit}>
        <div className="settings-logo-drop">
          <ImageIcon size={22} aria-hidden="true" />
          <span>Selecionar logomarca</span>
        </div>
        <label>
          Cor de destaque
          <input
            aria-label="Cor de destaque"
            disabled={!canManage || saving}
            onChange={(event) => setAccentColorHex(event.target.value)}
            type="color"
            value={accentColorHex}
          />
        </label>
        <div className="preferences-preview" aria-label="Prévia das cores escolhidas">
          <Palette size={18} aria-hidden="true" />
          <div>
            <strong>Texto do sistema</strong>
            <span style={{ color: accentColorHex }}>Ação principal</span>
          </div>
        </div>
        <div className="preferences-actions">
          <button
            className="button button-secondary"
            disabled={saving}
            onClick={restoreCurrentTheme}
            type="button"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Usar tema atual
          </button>
          <button className="button button-primary" disabled={!canManage || saving} type="submit">
            <Save size={16} aria-hidden="true" />
            {saving ? 'Salvando...' : 'Salvar preferências'}
          </button>
        </div>
      </form>
      <AppToastRegion onDismiss={dismissToast} toast={toast} />
    </>
  );
}

function toColorInputValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}
