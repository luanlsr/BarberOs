import { describe, expect, test } from 'vitest';
import type { SessionContext } from '@barberos/contracts';
import { developmentSession } from './dev-session';
import { buildDashboardViewModel, type DashboardSourceModels } from './dashboard-data';
import type { AgendaViewModel } from './agenda-data';
import type { FinanceViewModel } from './finance-data';
import type { InventoryViewModel } from './inventory-data';
import type { ComandaViewModel } from './order-data';

function sessionWith(overrides: Partial<SessionContext>): SessionContext {
  return { ...developmentSession, ...overrides };
}

function sources(overrides: Partial<DashboardSourceModels> = {}): DashboardSourceModels {
  return {
    agenda: {
      branchName: 'Unidade Centro',
      hasReadPermission: true,
      appointments: [
        {
          startLabel: '09:00',
          customerName: 'Cliente Real',
          serviceNames: ['Corte'],
          status: 'CONFIRMED',
          statusLabel: 'Confirmado',
          totalCents: 8500,
        },
        {
          startLabel: '10:30',
          customerName: 'Cliente Pendente',
          serviceNames: ['Barba'],
          status: 'PENDING',
          statusLabel: 'Aguardando',
          totalCents: 7000,
        },
      ],
    } as unknown as AgendaViewModel,
    finance: {
      canRead: true,
      summary: {
        revenueAmountCents: 15500,
        resultAmountCents: 9300,
        entriesCount: 2,
      },
      commission: {
        openAccrualAmountCents: 4250,
        openAccrualAmountLabel: 'R$ 43',
        paidPayoutAmountCents: 3500,
        paidPayoutAmountLabel: 'R$ 35',
      },
    } as unknown as FinanceViewModel,
    inventory: {
      canRead: true,
      summary: {
        trackedProductCount: 8,
        lowStockCount: 2,
      },
    } as unknown as InventoryViewModel,
    comanda: {
      canRead: true,
      openOrders: [{ id: 'order-1' }, { id: 'order-2' }],
      order: {
        paymentSummary: { canReceivePayment: true },
      },
    } as unknown as ComandaViewModel,
    ...overrides,
  };
}

describe('Dashboard data', () => {
  test('builds owner metrics from real module view models instead of fixed dashboard fixtures', () => {
    const model = buildDashboardViewModel(developmentSession, sources());

    expect(model.metrics).toEqual([
      {
        label: 'Atendimentos hoje',
        value: '02',
        note: '1 confirmados',
        positive: true,
      },
      {
        label: 'Faturamento previsto',
        value: 'R$ 155',
        note: '1 aguardando confirmação',
        positive: true,
      },
      {
        label: 'Resultado do período',
        value: 'R$ 93',
        note: '2 lançamentos conciliados',
        positive: true,
      },
      {
        label: 'Estoque baixo',
        value: '02',
        note: '8 produtos monitorados',
      },
    ]);
    expect(model.appointments.map((appointment) => appointment.client)).toEqual([
      'Cliente Real',
      'Cliente Pendente',
    ]);
    expect(model.insights.map((insight) => insight.title)).toEqual([
      '1 clientes aguardando confirmação',
      '2 comandas abertas',
    ]);
  });

  test('renders an honest empty dashboard when modules have no tenant data', () => {
    const model = buildDashboardViewModel(
      developmentSession,
      sources({
        agenda: {
          branchName: 'Unidade Centro',
          hasReadPermission: true,
          appointments: [],
        } as unknown as AgendaViewModel,
        finance: {
          canRead: true,
          summary: { revenueAmountCents: 0, resultAmountCents: 0, entriesCount: 0 },
          commission: {
            openAccrualAmountCents: 0,
            openAccrualAmountLabel: 'R$ 0',
            paidPayoutAmountCents: 0,
            paidPayoutAmountLabel: 'R$ 0',
          },
        } as unknown as FinanceViewModel,
        inventory: {
          canRead: true,
          summary: { trackedProductCount: 0, lowStockCount: 0 },
        } as unknown as InventoryViewModel,
        comanda: {
          canRead: true,
          openOrders: [],
        } as unknown as ComandaViewModel,
      }),
    );

    expect(model.metrics.map((metric) => metric.value)).toEqual(['00', 'R$ 0', 'R$ 0', '00']);
    expect(model.appointments).toEqual([]);
    expect(model.emptyAppointmentsMessage).toBe('Nenhum atendimento agendado para hoje.');
    expect(model.insights).toEqual([
      {
        icon: 'calendar',
        title: 'Operação sem pendências críticas',
        body: 'Os principais sinais da unidade estão estáveis neste momento.',
      },
    ]);
  });

  test('uses the reception workflow when the user role is receptionist', () => {
    const model = buildDashboardViewModel(
      sessionWith({ role: 'RECEPTIONIST', userName: 'Ana Balcão' }),
      sources(),
    );

    expect(model.title).toBe('Bom trabalho, Ana.');
    expect(model.actionHref).toBe('/comandas?mode=walk-in#nova-comanda');
    expect(model.metrics[1]).toMatchObject({
      label: 'Comandas abertas',
      value: '02',
      note: '1 prontas para pagamento',
    });
  });
});
