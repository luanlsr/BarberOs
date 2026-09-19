import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentInventoryViewModel } from '../lib/inventory-data';
import { InventoryView } from './inventory-view';

type RenderResult = { container: HTMLDivElement; root: Root };

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(ui));
  return { container, root };
}

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.textContent?.includes(label) || item.getAttribute('aria-label')?.includes(label),
  );
  expect(button).toBeTruthy();
  flushSync(() => button?.click());
}

describe('InventoryView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders low-stock alerts, balances and movement history', () => {
    const html = renderToStaticMarkup(
      <InventoryView model={getDevelopmentInventoryViewModel(developmentSession)} />,
    );

    expect(html).toContain('Estoque');
    expect(html).toContain('Produtos controlados');
    expect(html).toContain('Estoque baixo');
    expect(html).toContain('Coca-Cola lata');
    expect(html).toContain('Lamina Derby');
    expect(html).toContain('Pomada Matte 80g');
    expect(html).toContain('Entrada');
    expect(html).toContain('Venda');
    expect(html).toContain('Perda');
  });

  test('opens manual entry, adjustment and movement detail dialogs', () => {
    const { container } = render(
      <InventoryView model={getDevelopmentInventoryViewModel(developmentSession)} />,
    );

    clickButton(container, 'Entrada');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Entrada de estoque');

    clickButton(container, 'Fechar');
    clickButton(container, 'Ajustar');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Registrar');

    clickButton(container, 'Fechar');
    clickButton(container, 'Ver');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      'Movimentacoes de estoque',
    );
  });

  test('renders loading, empty, offline and permission-denied states', () => {
    expect(
      renderToStaticMarkup(
        <InventoryView
          model={getDevelopmentInventoryViewModel(developmentSession, { state: 'loading' })}
        />,
      ),
    ).toContain('Carregando estoque');

    expect(
      renderToStaticMarkup(
        <InventoryView
          model={getDevelopmentInventoryViewModel(developmentSession, { state: 'empty' })}
        />,
      ),
    ).toContain('Nenhum saldo');

    expect(
      renderToStaticMarkup(
        <InventoryView
          model={getDevelopmentInventoryViewModel(developmentSession, { state: 'offline' })}
        />,
      ),
    ).toContain('Modo offline');

    const denied = getDevelopmentInventoryViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );
    const deniedHtml = renderToStaticMarkup(<InventoryView model={denied} />);
    expect(deniedHtml).toContain('Estoque indisponivel');
    expect(deniedHtml).not.toContain('Pomada Matte 80g');
  });
});
