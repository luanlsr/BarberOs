import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { DashboardViewModel } from '../lib/dashboard-data';
import { DashboardView } from './dashboard-view';

const model: DashboardViewModel = {
  eyebrow: 'Hoje na barbearia',
  title: 'Bom dia, Luan.',
  subtitle: 'Visão executiva da operação.',
  actionHref: '/agenda?mode=new',
  actionLabel: 'Novo agendamento',
  metrics: [
    { label: 'Atendimentos hoje', value: '01', note: '1 confirmados', positive: true },
    { label: 'Faturamento previsto', value: 'R$ 85', note: '0 aguardando confirmação' },
    { label: 'Resultado do período', value: 'R$ 50', note: '1 lançamentos conciliados' },
    { label: 'Estoque baixo', value: '00', note: '4 produtos monitorados' },
  ],
  appointments: [
    {
      time: '09:00',
      client: 'Cliente Real',
      service: 'Corte',
      status: 'Confirmado',
    },
  ],
  emptyAppointmentsMessage: 'Nenhum atendimento agendado para hoje.',
  agendaTitle: 'Agenda de hoje',
  agendaCaption: 'Unidade Centro · toda a equipe',
  insightTitle: 'Barber AI',
  insightCaption: 'Sinais que merecem atenção',
  insights: [
    {
      icon: 'calendar',
      title: 'Operação sem pendências críticas',
      body: 'Os principais sinais da unidade estão estáveis neste momento.',
    },
  ],
  nextTitle: 'Administração',
  nextCaption: 'Equipe, filiais e permissões',
  nextBody: 'Gerencie usuários e permissões.',
  nextActionLabel: 'Administrar equipe',
  nextHref: '/equipe',
};

describe('DashboardView', () => {
  test('renders dashboard data from the provided model', () => {
    const html = renderToStaticMarkup(<DashboardView model={model} />);

    expect(html).toContain('Bom dia, Luan.');
    expect(html).toContain('Atendimentos hoje');
    expect(html).toContain('Cliente Real');
    expect(html).toContain('Operação sem pendências críticas');
    expect(html).not.toContain('Marcos Vinicius');
    expect(html).not.toContain('R$ 1.240');
  });

  test('renders an empty agenda state without fake appointments', () => {
    const html = renderToStaticMarkup(<DashboardView model={{ ...model, appointments: [] }} />);

    expect(html).toContain('Nenhum atendimento agendado para hoje.');
    expect(html).not.toContain('Cliente Real');
  });
});
