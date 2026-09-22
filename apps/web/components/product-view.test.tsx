import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentProductsViewModel } from '../lib/product-data';
import { ProductView } from './product-view';

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

describe('ProductView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders product management with filters, prices, costs and stock indicators', () => {
    const html = renderToStaticMarkup(
      <ProductView model={getDevelopmentProductsViewModel(developmentSession)} />,
    );

    expect(html).toContain('Produtos');
    expect(html).toContain('Unidade Centro');
    expect(html).toContain('Pomada Matte 80g');
    expect(html).toContain('Coca-Cola lata');
    expect(html).toContain('Kit presente barba');
    expect(html).toContain('R$ 45,00');
    expect(html).toContain('R$ 18,00');
    expect(html).toContain('Controla estoque');
    expect(html).toContain('Estoque não controlado');
    expect(html).toContain('Novo produto');
    expect(html).toContain('Finalizadores');
    expect(html).toContain('Bebidas');
  });

  test('opens product detail/history and stock adjustment surfaces', () => {
    const { container } = render(
      <ProductView model={getDevelopmentProductsViewModel(developmentSession)} />,
    );

    clickButton(container, 'Detalhes');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      'Metadados comerciais',
    );
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Produto cadastrado');

    clickButton(container, 'Fechar');
    clickButton(container, 'Ajustar estoque');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      'Registrar movimento',
    );
  });

  test('renders permission denied and offline states without leaking product rows when forbidden', () => {
    const denied = getDevelopmentProductsViewModel(
      sessionWith({ permissions: ['dashboard.read'], entitlements: ['core.operations'] }),
    );
    const deniedHtml = renderToStaticMarkup(<ProductView model={denied} />);

    expect(deniedHtml).toContain('Produtos indisponíveis');
    expect(deniedHtml).not.toContain('Pomada Matte 80g');

    const offlineHtml = renderToStaticMarkup(
      <ProductView
        model={getDevelopmentProductsViewModel(developmentSession, { state: 'offline' })}
      />,
    );
    expect(offlineHtml).toContain('Modo offline');
    expect(offlineHtml).toContain('cadastro');
  });
});
