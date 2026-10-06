import type { SessionContext } from '@barberos/contracts';
import { getAgendaViewModel, type AgendaViewModel } from './agenda-data';
import { getFinanceViewModel, type FinanceViewModel } from './finance-data';
import { getInventoryViewModel, type InventoryViewModel } from './inventory-data';
import { getComandaViewModel, type ComandaViewModel } from './order-data';

export type DashboardAppointmentModel = {
  time: string;
  client: string;
  service: string;
  status: string;
};

export type DashboardInsightModel = {
  icon: 'alert' | 'calendar';
  title: string;
  body: string;
};

export type DashboardMetricModel = {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
};

export type DashboardViewModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
  metrics: readonly DashboardMetricModel[];
  appointments: readonly DashboardAppointmentModel[];
  emptyAppointmentsMessage: string;
  agendaTitle: string;
  agendaCaption: string;
  insightTitle: string;
  insightCaption: string;
  insights: readonly DashboardInsightModel[];
  nextTitle: string;
  nextCaption: string;
  nextBody: string;
  nextActionLabel: string;
  nextHref: string;
};

export type DashboardSourceModels = {
  agenda: AgendaViewModel;
  finance: FinanceViewModel;
  inventory: InventoryViewModel;
  comanda: ComandaViewModel;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export async function getDashboardViewModel(session: SessionContext): Promise<DashboardViewModel> {
  const [agenda, finance, inventory, comanda] = await Promise.all([
    getAgendaViewModel(session),
    getFinanceViewModel(session),
    getInventoryViewModel(session),
    getComandaViewModel(session),
  ]);

  return buildDashboardViewModel(session, { agenda, finance, inventory, comanda });
}

export function buildDashboardViewModel(
  session: SessionContext,
  sources: DashboardSourceModels,
): DashboardViewModel {
  if (session.role === 'PROFESSIONAL') return buildProfessionalDashboard(session, sources);
  if (session.role === 'RECEPTIONIST') return buildReceptionDashboard(session, sources);
  return buildOwnerDashboard(session, sources);
}

function buildOwnerDashboard(
  session: SessionContext,
  sources: DashboardSourceModels,
): DashboardViewModel {
  const agenda = agendaSummary(sources.agenda);
  const finance = financeSummary(sources.finance);
  const inventory = inventorySummary(sources.inventory);

  return {
    eyebrow: 'Hoje na barbearia',
    title: `Bom dia, ${firstName(session.userName)}.`,
    subtitle: 'Visão executiva da operação, financeiro, equipe e oportunidades de crescimento.',
    actionHref: '/agenda?mode=new',
    actionLabel: 'Novo agendamento',
    metrics: [
      {
        label: 'Atendimentos hoje',
        value: twoDigits(agenda.total),
        note: `${agenda.confirmed} confirmados`,
        positive: agenda.confirmed > 0,
      },
      {
        label: 'Faturamento previsto',
        value: formatCurrency(agenda.revenueAmountCents),
        note: `${agenda.pending} aguardando confirmação`,
        positive: agenda.revenueAmountCents > 0,
      },
      {
        label: 'Resultado do período',
        value: formatCurrency(finance.resultAmountCents),
        note: `${finance.entriesCount} lançamentos conciliados`,
        positive: finance.resultAmountCents >= 0 && finance.entriesCount > 0,
      },
      {
        label: 'Estoque baixo',
        value: twoDigits(inventory.lowStockCount),
        note: `${inventory.trackedProductCount} produtos monitorados`,
      },
    ],
    appointments: appointmentRows(sources.agenda),
    emptyAppointmentsMessage: sources.agenda.hasReadPermission
      ? 'Nenhum atendimento agendado para hoje.'
      : 'Seu perfil não tem acesso à agenda desta unidade.',
    agendaTitle: 'Agenda de hoje',
    agendaCaption: `${sources.agenda.branchName} · toda a equipe`,
    insightTitle: 'Barber AI',
    insightCaption: 'Sinais que merecem atenção',
    insights: operationalInsights(sources),
    nextTitle: 'Administração',
    nextCaption: 'Equipe, filiais e permissões',
    nextBody:
      'Gerencie usuários, profissionais, filiais, financeiro, estoque e repasses da barbearia.',
    nextActionLabel: 'Administrar equipe',
    nextHref: '/equipe',
  };
}

function buildReceptionDashboard(
  session: SessionContext,
  sources: DashboardSourceModels,
): DashboardViewModel {
  const agenda = agendaSummary(sources.agenda);
  const inventory = inventorySummary(sources.inventory);
  const comanda = comandaSummary(sources.comanda);

  return {
    eyebrow: 'Balcão e atendimento',
    title: `Bom trabalho, ${firstName(session.userName)}.`,
    subtitle: 'Atalhos para agenda, comandas, pagamentos, caixa e estoque do dia.',
    actionHref: '/comandas?mode=walk-in#nova-comanda',
    actionLabel: 'Nova comanda',
    metrics: [
      {
        label: 'Agendamentos hoje',
        value: twoDigits(agenda.total),
        note: `${agenda.pending} aguardando chegada`,
      },
      {
        label: 'Comandas abertas',
        value: twoDigits(comanda.openOrders),
        note: comanda.readyForPayment + ' prontas para pagamento',
      },
      {
        label: 'Receita prevista',
        value: formatCurrency(agenda.revenueAmountCents),
        note: sources.agenda.branchName,
        positive: agenda.revenueAmountCents > 0,
      },
      {
        label: 'Alertas de estoque',
        value: twoDigits(inventory.lowStockCount),
        note: inventory.lowStockCount ? 'Repor produtos do balcão' : 'Sem alerta ativo',
      },
    ],
    appointments: appointmentRows(sources.agenda),
    emptyAppointmentsMessage: sources.agenda.hasReadPermission
      ? 'Nenhuma chegada prevista para hoje.'
      : 'Seu perfil não tem acesso à agenda desta unidade.',
    agendaTitle: 'Fila operacional',
    agendaCaption: `${sources.agenda.branchName} · recepção`,
    insightTitle: 'Ações rápidas',
    insightCaption: 'Prioridade do turno',
    insights: operationalInsights(sources),
    nextTitle: 'Próximo atendimento',
    nextCaption: 'Fluxo Agenda -> Comanda -> Pagamento',
    nextBody: 'Use check-in para abrir a comanda com os serviços agendados e finalizar no caixa.',
    nextActionLabel: 'Abrir agenda',
    nextHref: '/agenda',
  };
}

function buildProfessionalDashboard(
  session: SessionContext,
  sources: DashboardSourceModels,
): DashboardViewModel {
  const agenda = agendaSummary(sources.agenda);
  const finance = financeSummary(sources.finance);

  return {
    eyebrow: 'Minha operação',
    title: `Sua agenda, ${firstName(session.userName)}.`,
    subtitle: 'Acompanhe seus atendimentos, clientes, produção, comissões, gorjetas e repasses.',
    actionHref: '/minha-carteira',
    actionLabel: 'Minha carteira',
    metrics: [
      {
        label: 'Atendimentos hoje',
        value: twoDigits(agenda.total),
        note: `${agenda.pending} aguardando confirmação`,
      },
      {
        label: 'Produção do período',
        value: formatCurrency(finance.revenueAmountCents),
        note: 'serviços e vendas autorizadas',
        positive: finance.revenueAmountCents > 0,
      },
      {
        label: 'Comissões abertas',
        value: sources.finance.commission.openAccrualAmountLabel,
        note: 'previsto para repasse',
        positive: sources.finance.commission.openAccrualAmountCents > 0,
      },
      {
        label: 'Repasses pagos',
        value: sources.finance.commission.paidPayoutAmountLabel,
        note: 'período atual',
        positive: sources.finance.commission.paidPayoutAmountCents > 0,
      },
    ],
    appointments: appointmentRows(sources.agenda),
    emptyAppointmentsMessage: sources.agenda.hasReadPermission
      ? 'Nenhum atendimento na sua agenda hoje.'
      : 'Seu perfil não tem acesso à agenda desta unidade.',
    agendaTitle: 'Minha agenda de hoje',
    agendaCaption: `${sources.agenda.branchName} · somente seus atendimentos`,
    insightTitle: 'Minha performance',
    insightCaption: 'Acompanhe seus ganhos',
    insights: operationalInsights(sources),
    nextTitle: 'Carteira profissional',
    nextCaption: 'Produção, gorjetas e repasses',
    nextBody:
      'Veja seus cortes realizados, comissões abertas, valores pagos e histórico de repasses.',
    nextActionLabel: 'Ver carteira',
    nextHref: '/minha-carteira',
  };
}

function agendaSummary(agenda: AgendaViewModel) {
  const confirmed = agenda.appointments.filter((item) => item.status === 'CONFIRMED').length;
  const pending = agenda.appointments.filter((item) => item.status === 'PENDING').length;
  const revenueAmountCents = agenda.appointments.reduce(
    (total, item) => total + item.totalCents,
    0,
  );
  return { total: agenda.appointments.length, confirmed, pending, revenueAmountCents };
}

function financeSummary(finance: FinanceViewModel) {
  return {
    revenueAmountCents: finance.canRead ? finance.summary.revenueAmountCents : 0,
    resultAmountCents: finance.canRead ? finance.summary.resultAmountCents : 0,
    entriesCount: finance.canRead ? finance.summary.entriesCount : 0,
  };
}

function inventorySummary(inventory: InventoryViewModel) {
  if (!inventory.canRead) return { trackedProductCount: 0, lowStockCount: 0 };
  return {
    trackedProductCount: inventory.summary.trackedProductCount,
    lowStockCount: inventory.summary.lowStockCount,
  };
}

function comandaSummary(comanda: ComandaViewModel) {
  const openOrders = comanda.canRead ? comanda.openOrders.length : 0;
  const readyForPayment = comanda.order?.paymentSummary.canReceivePayment ? 1 : 0;
  return { openOrders, readyForPayment };
}

function appointmentRows(agenda: AgendaViewModel): DashboardAppointmentModel[] {
  return agenda.appointments.slice(0, 4).map((appointment) => ({
    time: appointment.startLabel,
    client: appointment.customerName,
    service: appointment.serviceNames.join(' + ') || 'Atendimento',
    status: appointment.statusLabel,
  }));
}

function operationalInsights(sources: DashboardSourceModels): DashboardInsightModel[] {
  const agenda = agendaSummary(sources.agenda);
  const inventory = inventorySummary(sources.inventory);
  const comanda = comandaSummary(sources.comanda);
  const insights: DashboardInsightModel[] = [];

  if (agenda.pending > 0) {
    insights.push({
      icon: 'calendar',
      title: `${agenda.pending} clientes aguardando confirmação`,
      body: 'Revise os horários pendentes antes do próximo atendimento.',
    });
  }

  if (comanda.openOrders > 0) {
    insights.push({
      icon: 'calendar',
      title: `${comanda.openOrders} comandas abertas`,
      body: 'Acompanhe itens, pagamento e fechamento para manter caixa e financeiro alinhados.',
    });
  }

  if (inventory.lowStockCount > 0) {
    insights.push({
      icon: 'alert',
      title: `${inventory.lowStockCount} produtos com estoque baixo`,
      body: 'Priorize reposição dos itens críticos da unidade.',
    });
  }

  if (sources.finance.canRead && sources.finance.summary.resultAmountCents < 0) {
    insights.push({
      icon: 'alert',
      title: 'Resultado financeiro negativo',
      body: 'Revise despesas, repasses e receitas do período.',
    });
  }

  return insights.length
    ? insights.slice(0, 2)
    : [
        {
          icon: 'calendar',
          title: 'Operação sem pendências críticas',
          body: 'Os principais sinais da unidade estão estáveis neste momento.',
        },
      ];
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'time';
}
