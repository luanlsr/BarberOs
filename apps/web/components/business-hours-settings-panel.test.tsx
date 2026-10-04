import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { getStoreOperationsSettingsStorageKey } from '../lib/store-operations-settings';
import type { StoreOperationsSettings } from '../lib/store-operations-settings';
import { BusinessHoursSettingsPanel } from './business-hours-settings-panel';

type RenderResult = { container: HTMLDivElement; root: Root };

const settings: StoreOperationsSettings = {
  openingHours: {
    branchId: 'branch-test',
    startTime: '08:00',
    endTime: '18:00',
    slotMinutes: 30,
    timezone: 'America/Sao_Paulo',
  },
  blocks: [],
};

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  return { container, root };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((item) =>
    item.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  flushSync(() => button?.click());
}

describe('BusinessHoursSettingsPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  test('shows a toast and persists local settings after saving opening hours', () => {
    const { container } = render(
      <BusinessHoursSettingsPanel branchName="Unidade Teste" settings={settings} />,
    );

    clickButton(container, 'Salvar horários');

    expect(container.textContent).toContain('Horário de funcionamento salvo com sucesso.');

    const stored = window.localStorage.getItem(
      getStoreOperationsSettingsStorageKey(settings.openingHours.branchId),
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? '{}')).toMatchObject({
      openingHours: {
        branchId: 'branch-test',
        startTime: '08:00',
        endTime: '18:00',
      },
      blocks: [],
    });
  });
});
