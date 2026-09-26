import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  OrderDetail,
  OrderItem,
  OrderItemSourceType,
  OrderStatus,
  Payment,
  PaymentMethod,
  Permission,
  RequestContext,
  SessionContext,
} from '@barberos/contracts';

import { createSupabaseServerClient, getRequestContext } from './auth/server';
import { OrderApplicationService } from '../src/modules/orders/application/order-service';
import {
  SupabaseOrderAuditSink,
  SupabaseOrderRepository,
} from '../src/modules/orders/infrastructure';
import { calculateAmountDue, calculatePaidAmount } from '../src/modules/payments/application';
import { SupabasePaymentRepository } from '../src/modules/payments/infrastructure';
import {
  getDevelopmentProductPickerViewModel,
  type ProductPickerViewModel,
} from './product-picker-data';

export type OrderTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ComandaItemModel = {
  id: string;
  name: string;
  sourceType: OrderItemSourceType;
  sourceId?: string;
  typeLabel: string;
  sourceLabel: string;
  sourceDescription: string;
  isCatalogProduct: boolean;
  quantity: number;
  unitPriceAmountCents: number;
  costAmountCents?: number;
  discountAmountCents: number;
  finalAmountCents: number;
  quantityLabel: string;
  unitPriceLabel: string;
  discountLabel: string;
  finalLabel: string;
  professionalName: string;
  notes?: string;
};

export type ComandaItemSuggestionModel = {
  id: string;
  name: string;
  sourceType: OrderItemSourceType;
  sourceId?: string;
  typeLabel: string;
  sourceLabel: string;
  helperLabel: string;
  disabledReason?: string;
  unitPriceAmountCents: number;
  unitPriceLabel: string;
};

export type ComandaHistoryModel = {
  id: string;
  label: string;
  atLabel: string;
  actorLabel: string;
  reason?: string;
};

export type ComandaSummaryModel = {
  id: string;
  title: string;
  customerName: string;
  totalLabel: string;
  statusLabel: string;
  statusTone: OrderTone;
  href: string;
};

export type ComandaItemBreakdownModel = {
  serviceCount: number;
  productCount: number;
  manualCount: number;
  serviceTotalLabel: string;
  productTotalLabel: string;
  manualTotalLabel: string;
};

export type ComandaPaymentMethodSummaryModel = {
  method: PaymentMethod;
  methodLabel: string;
  amountCents: number;
  amountLabel: string;
};

export type ComandaPaymentState = 'unpaid' | 'partially-paid' | 'paid';

export type ComandaSettlementUpdateModel = {
  id: 'finance' | 'commission' | 'cash';
  label: string;
  tone: OrderTone;
};

export type ComandaPaymentSummaryModel = {
  state: ComandaPaymentState;
  stateLabel: string;
  totalAmountCents: number;
  totalLabel: string;
  paidAmountCents: number;
  paidLabel: string;
  amountDueCents: number;
  amountDueLabel: string;
  methodTotals: readonly ComandaPaymentMethodSummaryModel[];
  settlementUpdates: readonly ComandaSettlementUpdateModel[];
  canReceivePayment: boolean;
  receivePaymentLabel: string;
  unavailableReason?: string;
};

export type ComandaDetailModel = {
  id: string;
  title: string;
  statusLabel: string;
  statusTone: OrderTone;
  customerName: string;
  customerPhone?: string;
  professionalName: string;
  originLabel: string;
  branchName: string;
  openedAtLabel: string;
  itemCountLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  totalLabel: string;
  itemBreakdown: ComandaItemBreakdownModel;
  paymentSummary: ComandaPaymentSummaryModel;
  notes?: string;
  items: readonly ComandaItemModel[];
  history: readonly ComandaHistoryModel[];
};

export type ComandaViewModel = {
  state: 'ready' | 'empty' | 'permission-denied' | 'error';
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  canManageItems: boolean;
  canCreateWalkIn: boolean;
  canQuickCreateCustomer: boolean;
  canReceivePayment: boolean;
  isOnline: boolean;
  selectedOrderId?: string;
  order?: ComandaDetailModel;
  openOrders: readonly ComandaSummaryModel[];
  itemSuggestions: readonly ComandaItemSuggestionModel[];
  productPicker: ProductPickerViewModel;
  error?: { code: string; message: string; requestId: string };
};

type PersonLabels = {
  customerName?: string;
  customerPhone?: string;
  professionalName?: string;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const statusLabels: Record<OrderStatus, string> = {
  OPEN: 'Aberta',
  IN_SERVICE: 'Em atendimento',
  READY_FOR_PAYMENT: 'Pronta para receber',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

const statusTones: Record<OrderStatus, OrderTone> = {
  OPEN: 'warning',
  IN_SERVICE: 'neutral',
  READY_FOR_PAYMENT: 'success',
  PAID: 'success',
  CANCELLED: 'danger',
};

const itemTypeLabels: Record<OrderItemSourceType, string> = {
  SERVICE: 'Serviço',
  PRODUCT: 'Produto',
  MANUAL: 'Manual',
};

const itemSourceLabels: Record<OrderItemSourceType, string> = {
  SERVICE: 'Serviço do catálogo',
  PRODUCT: 'Produto de catálogo',
  MANUAL: 'Item manual',
};

const itemSourceDescriptions: Record<OrderItemSourceType, string> = {
  SERVICE: 'Preço congelado do serviço no atendimento.',
  PRODUCT: 'Preço e custo congelados do catálogo; estoque so baixa no pagamento.',
  MANUAL: 'Lancamento avulso sem vinculo com produto de estoque.',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  DEBIT_CARD: 'Debito',
  CREDIT_CARD: 'Credito',
  OTHER: 'Outro',
};

const devPeople = {
  customers: new Map([
    ['dev-customer-joao', { name: 'João Silva', phone: '(11) 98888-0301' }],
    ['dev-customer-pedro', { name: 'Pedro Souza', phone: '(11) 98888-0302' }],
    ['00000000-0000-0000-0000-000000000301', { name: 'João Silva', phone: '+55 11 98888-0301' }],
  ]),
  professionals: new Map([
    ['dev-professional-carlos', 'Carlos Andrade'],
    ['dev-professional-lucas', 'Lucas Pereira'],
    ['00000000-0000-0000-0000-000000000101', 'Carlos Andrade'],
  ]),
};

const developmentItemSuggestions: readonly ComandaItemSuggestionModel[] = [
  {
    id: 'manual-water',
    name: 'Agua mineral',
    sourceType: 'MANUAL',
    typeLabel: itemTypeLabels.MANUAL,
    sourceLabel: itemSourceLabels.MANUAL,
    helperLabel: itemSourceDescriptions.MANUAL,
    unitPriceAmountCents: 500,
    unitPriceLabel: formatCurrency(500),
  },
  {
    id: 'manual-coffee',
    name: 'Cafe especial',
    sourceType: 'MANUAL',
    typeLabel: itemTypeLabels.MANUAL,
    sourceLabel: itemSourceLabels.MANUAL,
    helperLabel: itemSourceDescriptions.MANUAL,
    unitPriceAmountCents: 700,
    unitPriceLabel: formatCurrency(700),
  },
  {
    id: 'product-pomade',
    name: 'Pomada matte',
    sourceType: 'PRODUCT',
    sourceId: 'dev-product-pomade',
    typeLabel: itemTypeLabels.PRODUCT,
    sourceLabel: itemSourceLabels.PRODUCT,
    helperLabel: 'Catálogo ativo nesta unidade.',
    unitPriceAmountCents: 3200,
    unitPriceLabel: formatCurrency(3200),
  },
  {
    id: 'product-inactive',
    name: 'Shampoo indisponível',
    sourceType: 'PRODUCT',
    sourceId: 'dev-product-inactive',
    typeLabel: itemTypeLabels.PRODUCT,
    sourceLabel: itemSourceLabels.PRODUCT,
    helperLabel: 'Produto fora do catálogo ativo desta unidade.',
    disabledReason: 'Indisponível para esta filial',
    unitPriceAmountCents: 2800,
    unitPriceLabel: formatCurrency(2800),
  },
  {
    id: 'service-finish',
    name: 'Acabamento',
    sourceType: 'SERVICE',
    sourceId: 'dev-service-finish',
    typeLabel: itemTypeLabels.SERVICE,
    sourceLabel: itemSourceLabels.SERVICE,
    helperLabel: itemSourceDescriptions.SERVICE,
    unitPriceAmountCents: 2500,
    unitPriceLabel: formatCurrency(2500),
  },
];

const developmentPayments: readonly Payment[] = [
  {
    id: 'dev-payment-pix',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    orderId: 'dev-order-1001',
    method: 'PIX',
    status: 'PAID',
    amountCents: 7000,
    changeDueAmountCents: 0,
    idempotencyKey: 'dev-payment-pix-1',
    receivedBy: 'dev-user',
    receivedAt: '2026-09-07T15:10:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-07T15:10:00.000Z',
    updatedAt: '2026-09-07T15:10:00.000Z',
  },
];

const developmentPaidPayments: readonly Payment[] = [
  ...developmentPayments,
  {
    id: 'dev-payment-cash',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    orderId: 'dev-order-1001',
    method: 'CASH',
    status: 'PAID',
    amountCents: 5700,
    cashReceivedAmountCents: 6000,
    changeDueAmountCents: 300,
    idempotencyKey: 'dev-payment-cash-1',
    receivedBy: 'dev-user',
    receivedAt: '2026-09-07T15:20:00.000Z',
    refundedAmountCents: 0,
    createdAt: '2026-09-07T15:20:00.000Z',
    updatedAt: '2026-09-07T15:20:00.000Z',
  },
];

const developmentOrder: OrderDetail = {
  id: 'dev-order-1001',
  tenantId: 'dev-tenant',
  branchId: 'dev-branch',
  appointmentId: 'dev-appointment-0900',
  customerId: 'dev-customer-joao',
  professionalId: 'dev-professional-carlos',
  status: 'OPEN',
  subtotalAmountCents: 13700,
  discountAmountCents: 1000,
  totalAmountCents: 12700,
  notes: 'Cliente pediu acabamento mais discreto na nuca.',
  openedAt: '2026-09-07T14:30:00.000Z',
  createdBy: 'dev-user',
  updatedBy: 'dev-user',
  createdAt: '2026-09-07T14:30:00.000Z',
  updatedAt: '2026-09-07T14:45:00.000Z',
  items: [
    {
      id: 'dev-order-item-cut',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      sourceType: 'SERVICE',
      sourceId: 'dev-service-cut',
      nameSnapshot: 'Corte Masculino',
      quantity: 1,
      unitPriceAmountCents: 6000,
      discountAmountCents: 0,
      finalAmountCents: 6000,
      professionalId: 'dev-professional-carlos',
      createdBy: 'dev-user',
      createdAt: '2026-09-07T14:31:00.000Z',
    },
    {
      id: 'dev-order-item-beard',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      sourceType: 'SERVICE',
      sourceId: 'dev-service-beard',
      nameSnapshot: 'Barba',
      quantity: 1,
      unitPriceAmountCents: 4500,
      discountAmountCents: 1000,
      finalAmountCents: 3500,
      professionalId: 'dev-professional-carlos',
      notes: 'Desconto de fidelidade aplicado no item.',
      createdBy: 'dev-user',
      createdAt: '2026-09-07T14:32:00.000Z',
    },
    {
      id: 'dev-order-item-pomade',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      sourceType: 'PRODUCT',
      sourceId: 'dev-product-pomade',
      nameSnapshot: 'Pomada matte',
      quantity: 1,
      unitPriceAmountCents: 3200,
      costAmountCents: 1800,
      discountAmountCents: 0,
      finalAmountCents: 3200,
      createdBy: 'dev-user',
      createdAt: '2026-09-07T14:40:00.000Z',
    },
  ],
  history: [
    {
      id: 'dev-order-history-created',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      eventType: 'ORDER_CREATED',
      actorId: 'dev-user',
      reason: 'Check-in realizado pela recepção.',
      metadata: { source: 'check_in' },
      createdAt: '2026-09-07T14:30:00.000Z',
    },
    {
      id: 'dev-order-history-item',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      eventType: 'ITEM_ADDED',
      actorId: 'dev-user',
      reason: 'Produto consumido durante atendimento.',
      metadata: { itemId: 'dev-order-item-pomade' },
      createdAt: '2026-09-07T14:40:00.000Z',
    },
  ],
};

export async function getComandaViewModel(
  session: SessionContext,
  options: { orderId?: string; state?: string } = {},
): Promise<ComandaViewModel> {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return {
      ...base,
      state: 'permission-denied',
      openOrders: [],
      description: 'Seu perfil não possui acesso de leitura para Comandas nesta unidade.',
    };
  }

  if (options.state === 'error') {
    return {
      ...base,
      state: 'error',
      openOrders: [],
      error: {
        code: 'ORDER_VALIDATION_ERROR',
        message: 'Não conseguimos carregar esta Comanda agora.',
        requestId: 'local-comanda-error',
      },
    };
  }

  const client = await createSupabaseServerClient();
  const requestContext = client
    ? await getRequestContext(crypto.randomUUID(), session.tenantId, branchId)
    : null;

  if (client && requestContext) {
    try {
      return await getPersistentComandaViewModel(client, requestContext, session, options);
    } catch (error) {
      return {
        ...base,
        state: 'error',
        openOrders: [],
        error: {
          code:
            error instanceof Error && 'code' in error ? String(error.code) : 'ORDER_LOAD_FAILED',
          message: 'Não conseguimos carregar esta Comanda agora.',
          requestId: requestContext.requestId,
        },
      };
    }
  }

  return getDevelopmentComandaViewModel(session, options);
}

export function getDevelopmentComandaViewModel(
  session: SessionContext,
  options: { orderId?: string; state?: string } = {},
): ComandaViewModel {
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return {
      ...base,
      state: 'permission-denied',
      openOrders: [],
      description: 'Seu perfil não possui acesso de leitura para Comandas nesta unidade.',
    };
  }

  if (options.state === 'error') {
    return {
      ...base,
      state: 'error',
      openOrders: [],
      error: {
        code: 'ORDER_VALIDATION_ERROR',
        message: 'Não conseguimos carregar esta Comanda agora.',
        requestId: 'local-comanda-error',
      },
    };
  }

  if (options.state === 'empty' || (options.orderId && !isDevelopmentOrderId(options.orderId))) {
    return {
      ...base,
      state: 'empty',
      selectedOrderId: options.orderId,
      openOrders: [],
      description: 'Nenhuma Comanda aberta foi encontrada para os filtros atuais.',
    };
  }

  const payments = developmentPaymentsFor(options.state);
  const orderStatus = options.state === 'paid' ? 'PAID' : developmentOrder.status;
  const order = toComandaDetailModel(
    session,
    { ...developmentOrder, status: orderStatus, history: developmentHistoryFor(options.state) },
    {
      customerName: devPeople.customers.get(developmentOrder.customerId ?? '')?.name,
      customerPhone: devPeople.customers.get(developmentOrder.customerId ?? '')?.phone,
      professionalName: devPeople.professionals.get(developmentOrder.professionalId ?? ''),
    },
    payments,
    options.state !== 'offline',
  );

  return {
    ...base,
    state: 'ready',
    selectedOrderId: order.id,
    order,
    openOrders: [toComandaSummaryModel(order)],
    description:
      order.paymentSummary.state === 'paid'
        ? 'Comanda paga, com histórico e resumo de recebimento.'
        : 'Atendimento em andamento com itens, descontos, totais e observacoes.',
  };
}

function baseModel(
  session: SessionContext,
  branchId: string,
): Omit<ComandaViewModel, 'state' | 'openOrders'> {
  const entitlements = session.entitlements ?? [];
  return {
    title: 'Comandas',
    description: 'Atendimentos abertos da unidade.',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead:
      hasPermission(session, 'orders.read') &&
      entitlements.includes('core.operations') &&
      session.branchScope.includes(branchId),
    canManageItems:
      ['orders.item.add', 'orders.item.update', 'orders.item.remove'].every((permission) =>
        hasPermission(session, permission as Permission),
      ) && entitlements.includes('core.operations'),
    canCreateWalkIn:
      hasPermission(session, 'orders.create') &&
      entitlements.includes('core.operations') &&
      session.branchScope.includes(branchId),
    canQuickCreateCustomer:
      hasPermission(session, 'customers.create') &&
      entitlements.includes('core.operations') &&
      session.branchScope.includes(branchId),
    canReceivePayment:
      hasPermission(session, 'payments.receive') &&
      entitlements.includes('core.operations') &&
      session.branchScope.includes(branchId),
    isOnline: true,
    itemSuggestions: developmentItemSuggestions,
    productPicker: getDevelopmentProductPickerViewModel(session, { branchId }),
  };
}

async function getPersistentComandaViewModel(
  client: SupabaseClient,
  context: RequestContext,
  session: SessionContext,
  options: { orderId?: string },
): Promise<ComandaViewModel> {
  const service = new OrderApplicationService(
    new SupabaseOrderRepository(client),
    new SupabaseOrderAuditSink(client),
  );
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const base = baseModel(session, branchId);
  const openOrders = await service.list(context, { branchId, limit: 12 });
  const selected = options.orderId ? await service.get(context, options.orderId) : null;

  if (!selected) {
    if (!openOrders.length) {
      return {
        ...base,
        state: 'empty',
        selectedOrderId: options.orderId,
        openOrders: [],
        description: 'Nenhuma Comanda aberta foi encontrada para os filtros atuais.',
      };
    }
    return {
      ...base,
      state: 'ready',
      selectedOrderId: undefined,
      openOrders: openOrders.map((item) =>
        toComandaSummaryModel(
          toComandaDetailModel(session, { ...item, items: [], history: [] }, {}, [], true),
        ),
      ),
      description: 'Selecione uma Comanda para expandir os detalhes do atendimento.',
    };
  }
  const labels = await resolvePersonLabels(client, context, selected);
  const payments = await new SupabasePaymentRepository(client).list(context, {
    branchId,
    orderId: selected.id,
    limit: 100,
  });
  const order = toComandaDetailModel(session, selected, labels, payments, true);

  return {
    ...base,
    state: 'ready',
    selectedOrderId: selected.id,
    order,
    openOrders: openOrders.map((item) =>
      toComandaSummaryModel(
        toComandaDetailModel(session, { ...item, items: [], history: [] }, {}, [], true),
      ),
    ),
    description:
      order.paymentSummary.state === 'paid'
        ? 'Comanda paga, com histórico e resumo de recebimento.'
        : 'Atendimento em andamento com itens, descontos, totais e observacoes.',
  };
}

async function resolvePersonLabels(
  client: SupabaseClient,
  context: RequestContext,
  order: OrderDetail,
): Promise<PersonLabels> {
  const [customer, professional] = await Promise.all([
    order.customerId ? findCustomer(client, context, order.customerId) : null,
    order.professionalId ? findProfessional(client, context, order.professionalId) : null,
  ]);

  return {
    customerName: customer?.name,
    customerPhone: customer?.phone ?? undefined,
    professionalName: professional?.display_name,
  };
}

async function findCustomer(client: SupabaseClient, context: RequestContext, customerId: string) {
  const { data, error } = await client
    .from('customers')
    .select('name, phone')
    .eq('tenant_id', context.tenantId)
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data as { name: string; phone?: string | null } | null;
}

async function findProfessional(
  client: SupabaseClient,
  context: RequestContext,
  professionalId: string,
) {
  const { data, error } = await client
    .from('professionals')
    .select('display_name')
    .eq('tenant_id', context.tenantId)
    .eq('id', professionalId)
    .maybeSingle();

  if (error) throw error;
  return data as { display_name: string } | null;
}

function toComandaDetailModel(
  session: SessionContext,
  order: OrderDetail,
  labels: PersonLabels,
  payments: readonly Payment[] = [],
  isOnline = true,
): ComandaDetailModel {
  const items = order.items.map((item) => toComandaItemModel(item));
  return {
    id: order.id,
    title: 'Comanda #' + shortOrderId(order.id),
    statusLabel: statusLabels[order.status],
    statusTone: statusTones[order.status],
    customerName:
      labels.customerName ??
      (order.customerId ? 'Cliente ' + shortOrderId(order.customerId) : 'Consumidor avulso'),
    customerPhone: labels.customerPhone ?? undefined,
    professionalName:
      labels.professionalName ??
      (order.professionalId
        ? 'Profissional ' + shortOrderId(order.professionalId)
        : 'Sem profissional definido'),
    originLabel: order.appointmentId ? 'Agendamento' : 'Walk-in',
    branchName: branchNameFor(session, order.branchId),
    openedAtLabel: dateTimeFormatter.format(new Date(order.openedAt)),
    itemCountLabel: itemCountLabel(items.length),
    subtotalLabel: formatCurrency(order.subtotalAmountCents),
    discountLabel: formatCurrency(order.discountAmountCents),
    totalLabel: formatCurrency(order.totalAmountCents),
    itemBreakdown: toItemBreakdownModel(items),
    paymentSummary: toPaymentSummaryModel(session, order, payments, isOnline),
    notes: order.notes ?? undefined,
    items,
    history: order.history.map((item) => ({
      id: item.id,
      label: historyLabel(item.eventType),
      atLabel: dateTimeFormatter.format(new Date(item.createdAt)),
      actorLabel: item.actorId === session.userId ? session.userName : 'Equipe',
      reason: item.reason ?? undefined,
    })),
  };
}

function toComandaItemModel(item: OrderItem): ComandaItemModel {
  const professionalName = item.professionalId
    ? (devPeople.professionals.get(item.professionalId) ??
      'Profissional ' + shortOrderId(item.professionalId))
    : 'Sem profissional definido';

  return {
    id: item.id,
    name: item.nameSnapshot,
    sourceType: item.sourceType,
    sourceId: item.sourceId ?? undefined,
    typeLabel: itemTypeLabels[item.sourceType],
    sourceLabel: itemSourceLabels[item.sourceType],
    sourceDescription: itemSourceDescriptions[item.sourceType],
    isCatalogProduct: item.sourceType === 'PRODUCT' && Boolean(item.sourceId),
    quantity: item.quantity,
    unitPriceAmountCents: item.unitPriceAmountCents,
    costAmountCents: item.costAmountCents,
    discountAmountCents: item.discountAmountCents,
    finalAmountCents: item.finalAmountCents,
    quantityLabel: String(item.quantity) + ' x ' + formatCurrency(item.unitPriceAmountCents),
    unitPriceLabel: formatCurrency(item.unitPriceAmountCents),
    discountLabel: formatCurrency(item.discountAmountCents),
    finalLabel: formatCurrency(item.finalAmountCents),
    professionalName,
    notes: item.notes ?? undefined,
  };
}
function toItemBreakdownModel(items: readonly ComandaItemModel[]): ComandaItemBreakdownModel {
  const service = summarizeItemsByType(items, 'SERVICE');
  const product = summarizeItemsByType(items, 'PRODUCT');
  const manual = summarizeItemsByType(items, 'MANUAL');

  return {
    serviceCount: service.count,
    productCount: product.count,
    manualCount: manual.count,
    serviceTotalLabel: formatCurrency(service.totalAmountCents),
    productTotalLabel: formatCurrency(product.totalAmountCents),
    manualTotalLabel: formatCurrency(manual.totalAmountCents),
  };
}

function summarizeItemsByType(items: readonly ComandaItemModel[], sourceType: OrderItemSourceType) {
  return items.reduce(
    (summary, item) => {
      if (item.sourceType !== sourceType) return summary;
      return {
        count: summary.count + item.quantity,
        totalAmountCents: summary.totalAmountCents + item.finalAmountCents,
      };
    },
    { count: 0, totalAmountCents: 0 },
  );
}
function toComandaSummaryModel(order: ComandaDetailModel): ComandaSummaryModel {
  return {
    id: order.id,
    title: order.title,
    customerName: order.customerName,
    totalLabel: order.totalLabel,
    statusLabel: order.statusLabel,
    statusTone: order.statusTone,
    href: '/comandas?orderId=' + encodeURIComponent(order.id),
  };
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function isDevelopmentOrderId(orderId: string) {
  return orderId === developmentOrder.id || orderId === '00000000-0000-0000-0000-000000000701';
}

function itemCountLabel(count: number) {
  return count === 1 ? '1 item' : String(count) + ' itens';
}

function historyLabel(eventType: OrderDetail['history'][number]['eventType']) {
  const labels: Record<OrderDetail['history'][number]['eventType'], string> = {
    ORDER_CREATED: 'Comanda aberta',
    CHECK_IN: 'Check-in realizado',
    STATUS_CHANGED: 'Status atualizado',
    ITEM_ADDED: 'Item adicionado',
    ITEM_UPDATED: 'Item atualizado',
    ITEM_REMOVED: 'Item removido',
    PAYMENT_RECEIVED: 'Pagamento recebido',
    PAYMENT_REFUNDED: 'Pagamento estornado',
    ORDER_PAID: 'Comanda paga',
  };
  return labels[eventType];
}

function shortOrderId(id: string) {
  if (id.startsWith('dev-order-')) return '1001';
  const normalized = id.replace(/-/g, '');
  return normalized.slice(-4).toUpperCase();
}

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}

function developmentPaymentsFor(state?: string) {
  if (state === 'paid') return developmentPaidPayments;
  if (state === 'partial') return developmentPayments;
  return [];
}

function developmentHistoryFor(state?: string): OrderDetail['history'] {
  if (state !== 'paid' && state !== 'partial') return developmentOrder.history;
  const paymentHistory: OrderDetail['history'] = [
    {
      id: 'dev-order-history-payment-received',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      eventType: 'PAYMENT_RECEIVED',
      actorId: 'dev-user',
      reason: state === 'paid' ? 'Pagamento final recebido.' : 'Pagamento parcial recebido.',
      metadata: { source: 'payment' },
      createdAt: '2026-09-07T15:20:00.000Z',
    },
  ];
  if (state === 'paid') {
    paymentHistory.push({
      id: 'dev-order-history-order-paid',
      tenantId: 'dev-tenant',
      branchId: 'dev-branch',
      orderId: 'dev-order-1001',
      eventType: 'ORDER_PAID',
      actorId: 'dev-user',
      reason: 'Comanda quitada.',
      metadata: { source: 'payment' },
      createdAt: '2026-09-07T15:21:00.000Z',
    });
  }
  return [...developmentOrder.history, ...paymentHistory];
}

function toPaymentSummaryModel(
  session: SessionContext,
  order: OrderDetail,
  payments: readonly Payment[],
  isOnline: boolean,
): ComandaPaymentSummaryModel {
  const paidAmountCents = calculatePaidAmount(payments);
  const amountDueCents = calculateAmountDue(order.totalAmountCents, payments);
  const state: ComandaPaymentState =
    amountDueCents === 0 || order.status === 'PAID'
      ? 'paid'
      : paidAmountCents > 0
        ? 'partially-paid'
        : 'unpaid';
  const canReceivePayment = canReceivePaymentFor(session, order, amountDueCents, isOnline);
  return {
    state,
    stateLabel: paymentStateLabel(state),
    totalAmountCents: order.totalAmountCents,
    totalLabel: formatCurrency(order.totalAmountCents),
    paidAmountCents,
    paidLabel: formatCurrency(paidAmountCents),
    amountDueCents,
    amountDueLabel: formatCurrency(amountDueCents),
    methodTotals: paymentMethodTotals(payments),
    settlementUpdates: settlementUpdatesFor(order, payments, state, paidAmountCents),
    canReceivePayment,
    receivePaymentLabel: canReceivePayment
      ? 'Receber ' + formatCurrency(amountDueCents)
      : 'Pagamento indisponível',
    unavailableReason: canReceivePayment
      ? undefined
      : paymentUnavailableReason(session, order, amountDueCents, isOnline),
  };
}

function canReceivePaymentFor(
  session: SessionContext,
  order: Pick<OrderDetail, 'branchId' | 'status' | 'totalAmountCents'>,
  amountDueCents: number,
  isOnline: boolean,
) {
  return (
    isOnline &&
    amountDueCents > 0 &&
    order.totalAmountCents > 0 &&
    ['OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT'].includes(order.status) &&
    hasPermission(session, 'payments.receive') &&
    (session.entitlements ?? []).includes('core.operations') &&
    session.branchScope.includes(order.branchId)
  );
}

function paymentUnavailableReason(
  session: SessionContext,
  order: Pick<OrderDetail, 'branchId' | 'status' | 'totalAmountCents'>,
  amountDueCents: number,
  isOnline: boolean,
) {
  if (!isOnline) return 'Pagamentos exigem conexão ativa.';
  if (!hasPermission(session, 'payments.receive')) return 'Seu perfil não pode receber pagamentos.';
  if (!(session.entitlements ?? []).includes('core.operations'))
    return 'Modulo operacional indisponível.';
  if (!session.branchScope.includes(order.branchId)) return 'Comanda fora do escopo da unidade.';
  if (order.totalAmountCents <= 0) return 'Comanda sem valor para receber.';
  if (amountDueCents <= 0 || order.status === 'PAID') return 'Comanda já está paga.';
  return 'Status da Comanda não permite recebimento.';
}

function settlementUpdatesFor(
  order: OrderDetail,
  payments: readonly Payment[],
  state: ComandaPaymentState,
  paidAmountCents: number,
): readonly ComandaSettlementUpdateModel[] {
  if (state !== 'paid' || paidAmountCents <= 0) return [];

  const updates: ComandaSettlementUpdateModel[] = [
    { id: 'finance', label: 'Financeiro atualizado', tone: 'success' },
  ];
  if (order.items.some((item) => Boolean(item.professionalId))) {
    updates.push({ id: 'commission', label: 'Comissões calculadas', tone: 'success' });
  }
  if (payments.some((payment) => payment.method === 'CASH')) {
    updates.push({ id: 'cash', label: 'Caixa sincronizado', tone: 'success' });
  }
  return updates;
}

function paymentStateLabel(state: ComandaPaymentState) {
  if (state === 'paid') return 'Paga';
  if (state === 'partially-paid') return 'Parcial';
  return 'Pendente';
}

function paymentMethodTotals(payments: readonly Payment[]) {
  const totals = new Map<PaymentMethod, number>();
  for (const payment of payments) {
    if (!['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status)) continue;
    totals.set(
      payment.method,
      (totals.get(payment.method) ?? 0) + payment.amountCents - payment.refundedAmountCents,
    );
  }
  return Array.from(totals.entries()).map(([method, amountCents]) => ({
    method,
    methodLabel: paymentMethodLabels[method],
    amountCents,
    amountLabel: formatCurrency(amountCents),
  }));
}
