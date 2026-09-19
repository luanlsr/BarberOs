import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { OperationsDirectoryView } from './operations-directory-view';
import { developmentSession } from '../lib/dev-session';
import { getOperationsDirectoryModel } from '../lib/operations-directory-data';

describe('OperationsDirectoryView', () => {
  test('renders list and form for an allowed operations area', () => {
    const model = getOperationsDirectoryModel(developmentSession, 'servicos');
    const html = renderToStaticMarkup(<OperationsDirectoryView model={model} />);

    expect(html).toContain('Servicos');
    expect(html).toContain('Corte classico');
    expect(html).toContain('Novo servico');
    expect(html).not.toContain('CRUD habilitado');
    expect(html).toContain('Editar');
    expect(html).toContain('Arquivar');
  });

  test('renders permission denied without protected records', () => {
    const model = getOperationsDirectoryModel(
      {
        ...developmentSession,
        permissions: ['dashboard.read'],
        entitlements: ['core.operations'],
      },
      'clientes',
    );
    const html = renderToStaticMarkup(<OperationsDirectoryView model={model} />);

    expect(html).toContain('Acesso restrito');
    expect(html).toContain('Seu perfil nao pode visualizar clientes');
    expect(html).not.toContain('Marcos Vinicius');
  });

  test('renders disabled and offline form states', () => {
    const disabledHtml = renderToStaticMarkup(
      <OperationsDirectoryView
        model={getOperationsDirectoryModel(developmentSession, 'equipe', { state: 'disabled' })}
      />,
    );
    const offlineHtml = renderToStaticMarkup(
      <OperationsDirectoryView
        model={getOperationsDirectoryModel(developmentSession, 'equipe', { state: 'offline' })}
      />,
    );

    expect(disabledHtml).toContain('Formulario bloqueado');
    expect(offlineHtml).toContain('Acoes de escrita ficam indisponiveis');
  });
});
