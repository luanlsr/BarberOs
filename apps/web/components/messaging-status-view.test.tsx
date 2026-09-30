import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentMessagingStatusViewModel } from '../lib/messaging-status-data';
import { MessagingStatusView } from './messaging-status-view';

describe('MessagingStatusView', () => {
  test('renders responsive connection, conversation and delivery regions', () => {
    const html = renderToStaticMarkup(
      <MessagingStatusView model={getDevelopmentMessagingStatusViewModel(developmentSession)} />,
    );

    expect(html).toContain('messaging-workspace');
    expect(html).toContain('messaging-primary');
    expect(html).toContain('messaging-side');
    expect(html).toContain('Conexão da unidade');
    expect(html).toContain('Atendimento WhatsApp');
    expect(html).toContain('Saúde de entregas');
    expect(html).toContain('Ana P.');
  });

  test('renders permission denied without leaking connection or conversation rows', () => {
    const html = renderToStaticMarkup(
      <MessagingStatusView
        model={getDevelopmentMessagingStatusViewModel({
          ...developmentSession,
          permissions: ['dashboard.read'],
          entitlements: ['core.operations'],
        })}
      />,
    );

    expect(html).toContain('Mensagens indisponíveis');
    expect(html).not.toContain('WhatsApp Centro');
    expect(html).not.toContain('Ana P.');
    expect(html).not.toContain('Carlos M.');
  });

  test('renders offline state with send and campaign actions disabled', () => {
    const html = renderToStaticMarkup(
      <MessagingStatusView
        model={getDevelopmentMessagingStatusViewModel(developmentSession, { state: 'offline' })}
      />,
    );

    expect(html).toContain('Modo offline');
    expect(html).toContain('Abrir campanhas');
    expect(html).toContain('disabled=""');
  });

  test('renders sanitized message previews and branch-scoped conversations', () => {
    const sanitizedHtml = renderToStaticMarkup(
      <MessagingStatusView
        model={getDevelopmentMessagingStatusViewModel(developmentSession, {
          conversationId: 'conversation-carlos',
        })}
      />,
    );

    expect(sanitizedHtml).toContain('[link removido]');
    expect(sanitizedHtml).not.toContain('https://barberos.local/agenda');

    const northHtml = renderToStaticMarkup(
      <MessagingStatusView
        model={getDevelopmentMessagingStatusViewModel(developmentSession, {
          branchId: 'dev-branch-north',
          state: 'offline',
        })}
      />,
    );

    expect(northHtml).toContain('Cliente Norte');
    expect(northHtml).not.toContain('Ana P.');
    expect(northHtml).not.toContain('Carlos M.');
  });
});
