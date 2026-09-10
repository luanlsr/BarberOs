import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentComandaViewModel } from '../lib/order-data';
import { OrderView } from './order-view';

describe('OrderView', () => {
  test('renders the responsive Comanda surface with identity, items, totals and notes', () => {
    const model = getDevelopmentComandaViewModel(developmentSession);
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Comanda #1001');
    expect(html).toContain('Joao Silva');
    expect(html).toContain('Carlos Andrade');
    expect(html).toContain('Agendamento');
    expect(html).toContain('Corte Masculino');
    expect(html).toContain('Pomada matte');
    expect(html).toContain('Subtotal');
    expect(html).toContain('Descontos');
    expect(html).toContain('Total');
    expect(html).toContain('Cliente pediu acabamento');
    expect(html).toContain('Adicionar item');
    expect(html).toContain('Agua mineral');
    expect(html).toContain('Atualizar');
    expect(html).toContain('Remover');
    expect(html).toContain('Nova Comanda');
    expect(html).toContain('Consumidor avulso');
    expect(html).toContain('Cadastro rapido');
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

  test('renders payment summaries for partial, paid and offline Comandas', () => {
    const partial = renderToStaticMarkup(
      <OrderView
        model={getDevelopmentComandaViewModel(developmentSession, { state: 'partial' })}
      />,
    );
    expect(partial).toContain('Pagamento parcial');
    expect(partial).toContain('Ja recebido');
    expect(partial).toContain('PIX R$ 70,00');
    expect(partial).toContain('Pagamento recebido');
    expect(partial).toContain('Falta receber');
    expect(partial).toContain('R$ 57,00');

    const paid = renderToStaticMarkup(
      <OrderView model={getDevelopmentComandaViewModel(developmentSession, { state: 'paid' })} />,
    );
    expect(paid).toContain('Total pago');
    expect(paid).toContain('Quitado');
    expect(paid).toContain('Comanda ja esta paga.');
    expect(paid).toContain('Comanda paga');
    expect(paid).toContain('disabled=""');
    expect(paid).not.toContain('Total aberto');

    const offline = renderToStaticMarkup(
      <OrderView
        model={getDevelopmentComandaViewModel(developmentSession, { state: 'offline' })}
      />,
    );
    expect(offline).toContain('Pagamentos exigem conexao ativa.');
  });
  test('renders the walk-in flow when no Comanda is selected', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { state: 'empty' });
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Abra uma Comanda para continuar');
    expect(html).toContain('Nova Comanda');
    expect(html).toContain('Consumidor avulso');
    expect(html).toContain('Cliente existente');
    expect(html).toContain('Cadastro rapido');
    expect(html).toContain('Abrir walk-in');
  });
  test('renders recoverable error state without raw tenant data', () => {
    const model = getDevelopmentComandaViewModel(developmentSession, { state: 'error' });
    const html = renderToStaticMarkup(<OrderView model={model} />);

    expect(html).toContain('Nao foi possivel abrir a Comanda');
    expect(html).toContain('Tentar novamente');
    expect(html).not.toContain('dev-tenant');
  });
});
