import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InicioPage from './page';

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getDashboardViewModel: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('../../lib/auth/server', () => ({
  getSessionContext: mocks.getSessionContext,
}));

vi.mock('../../lib/dashboard-data', () => ({
  getDashboardViewModel: mocks.getDashboardViewModel,
}));

const tenantSession = {
  authState: 'authenticated',
  userId: 'user-1',
  email: 'owner@barberos.local',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['dashboard.read'],
  entitlements: ['core.operations'],
  branchScope: ['branch-1'],
  activeBranchId: 'branch-1',
  userName: 'Luan Ribeiro',
  tenantName: 'Barbearia Real',
  branchName: 'Unidade Centro',
};

const dashboardModel = {
  eyebrow: 'Hoje na barbearia',
  title: 'Bom dia, Luan.',
  subtitle: 'Visão real da operação.',
  actionHref: '/agenda?mode=new',
  actionLabel: 'Novo agendamento',
  metrics: [{ label: 'Atendimentos hoje', value: '00', note: '0 confirmados' }],
  appointments: [],
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

describe('InicioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionContext.mockResolvedValue(tenantSession);
    mocks.getDashboardViewModel.mockResolvedValue(dashboardModel);
  });

  it('renders the dashboard from the dashboard data service', async () => {
    const element = await InicioPage();
    const html = renderToStaticMarkup(element);

    expect(mocks.getDashboardViewModel).toHaveBeenCalledWith(tenantSession);
    expect(html).toContain('Bom dia, Luan.');
    expect(html).toContain('Nenhum atendimento agendado para hoje.');
  });

  it('redirects anonymous users to the landing page', async () => {
    mocks.getSessionContext.mockResolvedValueOnce(null);

    await expect(InicioPage()).rejects.toThrow('NEXT_REDIRECT:/');
    expect(mocks.getDashboardViewModel).not.toHaveBeenCalled();
  });

  it('redirects platform users to the platform console', async () => {
    mocks.getSessionContext.mockResolvedValueOnce({ ...tenantSession, role: 'PLATFORM_MASTER' });

    await expect(InicioPage()).rejects.toThrow('NEXT_REDIRECT:/master');
    expect(mocks.getDashboardViewModel).not.toHaveBeenCalled();
  });
});
