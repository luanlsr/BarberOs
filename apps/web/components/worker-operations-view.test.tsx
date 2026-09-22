import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { developmentSession } from '../lib/dev-session';
import { getDevelopmentWorkerOperationsViewModel } from '../lib/worker-operations-data';
import { WorkerOperationsView } from './worker-operations-view';

const viewports = [
  ['mobile', 390],
  ['tablet', 834],
  ['desktop', 1280],
] as const;

describe('WorkerOperationsView', () => {
  it.each(viewports)('renders compact operational failures on %s', (_label, width) => {
    Object.defineProperty(globalThis, 'innerWidth', {
      configurable: true,
      value: width,
    });

    const model = getDevelopmentWorkerOperationsViewModel(developmentSession);
    const html = renderToStaticMarkup(<WorkerOperationsView model={model} />);

    expect(html).toContain('Operações do worker');
    expect(html).toContain('Outbox pendente');
    expect(html).toContain('Jobs em retry');
    expect(html).toContain('Dead letters');
    expect(html).toContain('Notificações com falha');
    expect(html).toContain('Correlação: worker-correlation-notification-failed');
    expect(html).toContain('Tentativas: 5');
    expect(html).toContain('class="worker-workspace"');
    expect(html).toContain('class="worker-issue-row"');
  });

  it('renders empty, offline and loading states without critical rows', () => {
    const emptyHtml = renderToStaticMarkup(
      <WorkerOperationsView
        model={getDevelopmentWorkerOperationsViewModel(developmentSession, { state: 'empty' })}
      />,
    );
    const offlineHtml = renderToStaticMarkup(
      <WorkerOperationsView
        model={getDevelopmentWorkerOperationsViewModel(developmentSession, { state: 'offline' })}
      />,
    );
    const loadingHtml = renderToStaticMarkup(
      <WorkerOperationsView
        model={getDevelopmentWorkerOperationsViewModel(developmentSession, { state: 'loading' })}
      />,
    );

    expect(emptyHtml).toContain('Nenhuma falha assíncrona encontrada');
    expect(emptyHtml).toContain('Sem itens críticos nesta fila');
    expect(offlineHtml).toContain('Modo offline');
    expect(loadingHtml).toContain('Carregando worker');
    expect(loadingHtml).not.toContain('worker-correlation-notification-failed');
  });

  it('renders permission denied and error boundaries without queue data', () => {
    const deniedHtml = renderToStaticMarkup(
      <WorkerOperationsView
        model={getDevelopmentWorkerOperationsViewModel(
          { ...developmentSession, permissions: [] },
          { state: 'populated' },
        )}
      />,
    );
    const errorHtml = renderToStaticMarkup(
      <WorkerOperationsView
        model={getDevelopmentWorkerOperationsViewModel(developmentSession, { state: 'error' })}
      />,
    );

    expect(deniedHtml).toContain('Acesso restrito');
    expect(deniedHtml).toContain('Operações indisponíveis');
    expect(errorHtml).toContain('Falha ao carregar');
    expect(errorHtml).toContain('Monitor de worker indisponível neste ambiente');
    expect(deniedHtml).not.toContain('worker-correlation-notification-failed');
    expect(errorHtml).not.toContain('worker-correlation-notification-failed');
  });
});
