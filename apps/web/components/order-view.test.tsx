import * as React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentComandaViewModel } from '../lib/order-data';
import { OrderView } from './order-view';

type RenderResult = {
  container: HTMLDivElement;
  root: Root;
};

function render(ui: React.ReactElement): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  return { container, root };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (item) => item.textContent?.includes(label) || item.getAttribute('aria-label')?.includes(label),
  );

  expect(button).toBeTruthy();
  flushSync(() => {
    button?.click();
  });
}

describe('OrderView', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  test('renders the responsive Comanda surface with identity, items and modal detail entry points', () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Comanda #1001');
    expect(html).toContain('João Silva');
    expect(html).toContain('Carlos Andrade');
    expect(html).toContain('Agendamento');
    expect(html).toContain('Corte Masculino');
    expect(html).toContain('Pomada matte');
    expect(html).toContain('Produto de catálogo');
    expect(html).toContain('Estoque será baixado apenas no pagamento.');
    expect(html).toContain('Resumo e pagamento');
    expect(html).toContain('Observacoes');
    expect(html).toContain('Histórico');
    expect(html).not.toContain('Subtotal');
    expect(html).not.toContain('Descontos');
    expect(html).not.toContain('Cliente pediu acabamento');
    expect(html).toContain('Adicionar item');
    expect(html).toContain('Serviços, produtos e ajustes manuais abrem em modal');
    expect(html).not.toContain('Agua mineral');
    expect(html).toContain('Editar item');
    expect(html).toContain('Remover');
    expect(html).toContain('Nova Comanda');
    expect(html).toContain('Abra uma Comanda sem agendamento usando consumidor avulso');
    expect(html).not.toContain('Consumidor avulso');
    expect(html).not.toContain('Cadastro rápido');
  });

  test('renders product catalog controls and disabled suggestions inside the add item modal', () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const { container } = render(<OrderView model={model} />);

    clickButton(container, 'Adicionar item');
    const dialogText = container.querySelector('[role="dialog"]')?.textContent ?? '';

    expect(dialogText).toContain('Pomada matte');
    expect(dialogText).toContain('Produto de catálogo');
    expect(dialogText).toContain('Catálogo ativo nesta unidade.');
    expect(dialogText).toContain('Shampoo indisponível');
    expect(dialogText).toContain('Indisponível para esta filial');

    const disabledSuggestion = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.order-suggestion-button'),
    ).find((button) => button.textContent?.includes('Shampoo indisponível'));

    expect(disabledSuggestion?.disabled).toBe(true);
  });
  test('renders read-only item state for actors without item permissions', () => {
    const model = getDevelopmentComandaViewModel({
      ...developmentSession,
      permissions: ['orders.read'],
      entitlements: ['core.operations'],
    });
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Itens somente leitura');
    expect(html).toContain('Comanda #1001');
  });

  test('renders compact payment state on the Comanda surface and keeps payment details in modal', () => {
    const partial = renderToStaticMarkup(
      <OrderView
        model={getDevelopmentComandaViewModel(developmentSession, { state: 'partial' })}
      />,
    );
    expect(partial).toContain('Parcial');
    expect(partial).toContain('em aberto');
    expect(partial).not.toContain('Ja recebido');
    expect(partial).not.toContain('PIX R$');
    expect(partial).not.toContain('Falta receber');

    const paid = renderToStaticMarkup(
      <OrderView model={getDevelopmentComandaViewModel(developmentSession, { state: 'paid' })} />,
    );
    expect(paid).toContain('Paga');
    expect(paid).toContain('Comanda quitada');
    expect(paid).not.toContain('Total pago');
    expect(paid).not.toContain('Financeiro atualizado');
    expect(paid).not.toContain('Caixa sincronizado');

    const offline = renderToStaticMarkup(
      <OrderView
        model={getDevelopmentComandaViewModel(developmentSession, { state: 'offline' })}
      />,
    );
    expect(offline).toContain('Resumo e pagamento');
    expect(offline).not.toContain('Pagamentos exigem conexão ativa.');
  });

  test('opens Comanda detail sections in modals instead of lateral panels', () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const { container } = render(<OrderView model={model} />);

    expect(container.querySelector('.order-summary-pane')).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    clickButton(container, 'Resumo e pagamento');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Subtotal');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Receber pagamento');

    clickButton(container, 'Fechar detalhe');
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    clickButton(container, 'Observacoes');
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      'Cliente pediu acabamento',
    );
  });

  test('renders the walk-in flow when no Comanda is selected', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { state: 'empty' });
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Abra uma Comanda para continuar');
    expect(html).toContain('Nova Comanda');
    expect(html).toContain('Abra uma Comanda sem agendamento usando consumidor avulso');
    expect(html).not.toContain('Consumidor avulso');
    expect(html).not.toContain('Cliente existente');
    expect(html).not.toContain('Cadastro rápido');
    expect(html).toContain('Abrir walk-in');
  });

  test('renders recoverable error state without raw tenant data', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { state: 'error' });
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Não foi possível abrir a Comanda');
    expect(html).toContain('Tentar novamente');
    expect(html).not.toContain('dev-tenant');
  });
});
