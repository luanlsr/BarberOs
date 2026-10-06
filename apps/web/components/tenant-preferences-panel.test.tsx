import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BARBEROS_BRAND_PREFERENCES_STORAGE_KEY } from '../lib/brand-theme';
import { TenantPreferencesPanel } from './tenant-preferences-panel';

type RenderResult = { container: HTMLDivElement; root: Root };

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  return { container, root };
}

function submitPreferences(container: HTMLElement) {
  const form = container.querySelector('form');
  expect(form).toBeTruthy();
  flushSync(() => form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

describe('TenantPreferencesPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'not configured' }), { status: 503 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    window.localStorage.clear();
  });

  test('does not persist brand preferences locally when the server save fails', async () => {
    const { container } = render(<TenantPreferencesPanel canManage initialPreferences={null} />);

    submitPreferences(container);

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Não foi possível salvar no servidor.');
    });
    expect(window.localStorage.getItem(BARBEROS_BRAND_PREFERENCES_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#F64C72');
  });
});
