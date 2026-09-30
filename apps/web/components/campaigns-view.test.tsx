import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { developmentSession } from '../lib/dev-session';
import { getDevelopmentCampaignsViewModel } from '../lib/campaigns-view-data';
import { CampaignsView } from './campaigns-view';

describe('CampaignsView', () => {
  test('renders responsive list, editor, audience and lifecycle regions', () => {
    const html = renderToStaticMarkup(
      <CampaignsView model={getDevelopmentCampaignsViewModel(developmentSession)} />,
    );

    expect(html).toContain('campaigns-workspace');
    expect(html).toContain('campaigns-primary');
    expect(html).toContain('campaigns-side');
    expect(html).toContain('Lista operacional');
    expect(html).toContain('Editor');
    expect(html).toContain('Prévia segura');
    expect(html).toContain('Aprovar e enviar');
  });

  test('renders permission denied without campaign audience or content leakage', () => {
    const html = renderToStaticMarkup(
      <CampaignsView
        model={getDevelopmentCampaignsViewModel({
          ...developmentSession,
          permissions: ['dashboard.read'],
          entitlements: ['core.operations'],
        })}
      />,
    );

    expect(html).toContain('Campanhas indisponíveis');
    expect(html).not.toContain('Reativação de clientes');
    expect(html).not.toContain('Oferta plano mensal');
    expect(html).not.toContain('Elegíveis');
  });

  test('renders offline state with send and schedule controls disabled', () => {
    const html = renderToStaticMarkup(
      <CampaignsView
        model={getDevelopmentCampaignsViewModel(developmentSession, {
          campaignId: 'campaign-scheduled-weekend',
          state: 'offline',
        })}
      />,
    );

    expect(html).toContain('Modo offline');
    expect(html).toContain('Agendar');
    expect(html).toContain('Enviar agora');
    expect(html).toContain('disabled=""');
  });

  test('renders partial failure presentation without implying full success', () => {
    const html = renderToStaticMarkup(
      <CampaignsView
        model={getDevelopmentCampaignsViewModel(developmentSession, {
          campaignId: 'campaign-partial-birthday',
        })}
      />,
    );

    expect(html).toContain('Falha parcial');
    expect(html).toContain('Falharam');
    expect(html).toContain('7');
    expect(html).toContain('Bloqueadas');
    expect(html).not.toContain('100% entregue');
  });
});
