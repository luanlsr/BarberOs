import type {
  LowStockAlert,
  Permission,
  Product,
  SessionContext,
  StockBalance,
  StockMovement,
  StockMovementType,
} from '@barberos/contracts';

export type InventoryViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline';
export type InventoryTone = 'neutral' | 'success' | 'warning' | 'danger';

export type InventoryActionId =
  | 'inventory.refresh'
  | 'inventory.record-entry'
  | 'inventory.record-loss'
  | 'inventory.adjust-stock'
  | 'inventory.transfer-stock';

export type InventoryActionModel = {
  id: InventoryActionId;
  label: string;
  enabled: boolean;
  reason?: string;
};

export type StockBalanceItemModel = {
  productId: string;
  productName: string;
  branchId: string;
  currentQuantity: number;
  minimumStockQuantity: number;
  quantityLabel: string;
  lowStock: boolean;
  zeroStock: boolean;
  tone: InventoryTone;
  supplierName: string;
  lastMovementLabel: string;
  canAdjust: boolean;
};

export type LowStockAlertModel = {
  id: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  minimumStockQuantity: number;
  label: string;
  tone: InventoryTone;
};

export type StockMovementModel = {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  typeLabel: string;
  typeTone: InventoryTone;
  quantity: number;
  quantityLabel: string;
  sourceLabel: string;
  reason: string;
  createdAtLabel: string;
};

export type InventoryViewModel = {
  state: InventoryViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  canWrite: boolean;
  balances: readonly StockBalanceItemModel[];
  lowStockAlerts: readonly LowStockAlertModel[];
  movements: readonly StockMovementModel[];
  allowedActions: readonly InventoryActionModel[];
  summary: {
    trackedProductCount: number;
    lowStockCount: number;
    zeroStockCount: number;
  };
  error?: { code: string; message: string; requestId: string };
};

type InventoryOptions = {
  branchId?: string;
  state?: string;
};

type DevelopmentInventoryOptions = {
  branchId?: string;
  state?: 'loading' | 'populated' | 'empty' | 'error' | 'offline' | 'branch-empty' | 'restocked';
};

type InventoryBaseModel = ReturnType<typeof baseModel>;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const movementLabels: Record<StockMovementType, string> = {
  ENTRY: 'Entrada',
  SALE: 'Venda',
  LOSS: 'Perda',
  CONSUMPTION: 'Consumo interno',
  ADJUSTMENT: 'Ajuste',
  TRANSFER_IN: 'Transferencia recebida',
  TRANSFER_OUT: 'Transferencia enviada',
};

const movementTones: Record<StockMovementType, InventoryTone> = {
  ENTRY: 'success',
  SALE: 'neutral',
  LOSS: 'danger',
  CONSUMPTION: 'warning',
  ADJUSTMENT: 'warning',
  TRANSFER_IN: 'success',
  TRANSFER_OUT: 'neutral',
};

const developmentProducts: readonly Product[] = [
  {
    id: 'dev-product-pomade',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch', 'dev-branch-north'],
    categoryId: 'dev-product-category-finishers',
    sku: 'POM-MATTE-80G',
    barcode: '7890000000001',
    name: 'Pomada Matte 80g',
    status: 'ACTIVE',
    salePriceAmountCents: 4500,
    costAmountCents: 1800,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 5,
    supplierMetadata: { supplierName: 'Barber Supply' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-soda',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    categoryId: 'dev-product-category-beverages',
    sku: 'COCA-350',
    name: 'Coca-Cola lata',
    status: 'ACTIVE',
    salePriceAmountCents: 800,
    costAmountCents: 450,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 12,
    supplierMetadata: { supplierName: 'Distribuidora Centro' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-product-zero',
    tenantId: 'dev-tenant',
    branchIds: ['dev-branch'],
    categoryId: 'dev-product-category-finishers',
    name: 'Lamina Derby',
    status: 'ACTIVE',
    salePriceAmountCents: 1200,
    costAmountCents: 700,
    stockTrackingPolicy: 'TRACKED',
    allowNegativeStock: false,
    minimumStockQuantity: 10,
    supplierMetadata: { supplierName: 'Barber Supply' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
    updatedAt: '2026-09-07T09:00:00.000Z',
  },
];

const developmentBalances: readonly StockBalance[] = [
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-pomade',
    currentQuantity: 18,
    minimumStockQuantity: 5,
    lowStock: false,
    lastMovementAt: '2026-09-07T12:00:00.000Z',
    updatedAt: '2026-09-07T12:00:00.000Z',
  },
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    currentQuantity: 4,
    minimumStockQuantity: 12,
    lowStock: true,
    lastMovementAt: '2026-09-07T12:30:00.000Z',
    updatedAt: '2026-09-07T12:30:00.000Z',
  },
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-zero',
    currentQuantity: 0,
    minimumStockQuantity: 10,
    lowStock: true,
    lastMovementAt: '2026-09-07T11:40:00.000Z',
    updatedAt: '2026-09-07T11:40:00.000Z',
  },
  {
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    productId: 'dev-product-pomade',
    currentQuantity: 7,
    minimumStockQuantity: 5,
    lowStock: false,
    lastMovementAt: '2026-09-07T10:30:00.000Z',
    updatedAt: '2026-09-07T10:30:00.000Z',
  },
];

const developmentAlerts: readonly LowStockAlert[] = [
  {
    id: 'dev-low-stock-soda',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    state: 'ACTIVE',
    currentQuantity: 4,
    minimumStockQuantity: 12,
    triggeredAt: '2026-09-07T12:30:00.000Z',
  },
  {
    id: 'dev-low-stock-zero',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-zero',
    state: 'ACTIVE',
    currentQuantity: 0,
    minimumStockQuantity: 10,
    triggeredAt: '2026-09-07T11:40:00.000Z',
  },
];

const developmentMovements: readonly StockMovement[] = [
  {
    id: 'dev-stock-entry-pomade',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-pomade',
    type: 'ENTRY',
    quantity: 20,
    balanceAfterQuantity: 20,
    sourceType: 'MANUAL',
    idempotencyKey: 'dev-entry-pomade-1',
    reason: 'Compra inicial',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T09:00:00.000Z',
  },
  {
    id: 'dev-stock-sale-pomade',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-pomade',
    type: 'SALE',
    quantity: -1,
    balanceAfterQuantity: 18,
    sourceType: 'ORDER_ITEM',
    sourceId: 'dev-order-item-pomade',
    orderId: 'dev-order-1001',
    orderItemId: 'dev-order-item-pomade',
    paymentId: 'dev-payment-pix',
    idempotencyKey: 'dev-sale-pomade-1',
    reason: 'Venda na Comanda #1001',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T12:00:00.000Z',
  },
  {
    id: 'dev-stock-loss-zero',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-zero',
    type: 'LOSS',
    quantity: -3,
    balanceAfterQuantity: 0,
    sourceType: 'MANUAL',
    idempotencyKey: 'dev-loss-zero-1',
    reason: 'Produto danificado',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T11:40:00.000Z',
  },
  {
    id: 'dev-stock-entry-soda-restock',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    productId: 'dev-product-soda',
    type: 'ENTRY',
    quantity: 16,
    balanceAfterQuantity: 20,
    sourceType: 'MANUAL',
    idempotencyKey: 'dev-entry-soda-restock',
    reason: 'Entrada de reposicao',
    createdBy: 'dev-user',
    createdAt: '2026-09-07T13:10:00.000Z',
  },
];

export async function getInventoryViewModel(
  session: SessionContext,
  options: InventoryOptions = {},
): Promise<InventoryViewModel> {
  return getDevelopmentInventoryViewModel(session, {
    branchId: options.branchId,
    state: developmentStateFrom(options.state),
  });
}

export function getDevelopmentInventoryViewModel(
  session: SessionContext,
  options: DevelopmentInventoryOptions = {},
): InventoryViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildInventoryModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar estoque.',
      [],
      [],
      [],
    );
  }

  if (options.state === 'loading') {
    return buildInventoryModel(
      base,
      'loading',
      'Carregando saldos e alertas de estoque.',
      [],
      [],
      [],
    );
  }

  if (options.state === 'error') {
    return buildInventoryModel(
      base,
      'error',
      'Não foi possível carregar estoque agora.',
      [],
      [],
      [],
      {
        code: 'INVENTORY_VALIDATION_ERROR',
        message: 'Estoque local indisponível.',
        requestId: 'local-inventory-error',
      },
    );
  }

  if (options.state === 'offline') {
    return buildInventoryModel(
      base,
      'offline',
      'Você está offline. Entradas, perdas e ajustes ficam pausados.',
      balancesForBranch(branchId),
      alertsForBranch(branchId),
      movementsForBranch(branchId),
    );
  }

  if (options.state === 'empty' || options.state === 'branch-empty') {
    return buildInventoryModel(base, 'empty', 'Nenhum saldo de estoque nesta unidade.', [], [], []);
  }

  if (options.state === 'restocked') {
    return buildInventoryModel(
      base,
      'ready',
      'Entrada registrada e alertas de estoque baixo resolvidos nesta unidade.',
      restockedBalancesForBranch(branchId),
      [],
      restockedMovementsForBranch(branchId),
    );
  }

  const balances = balancesForBranch(branchId);
  return buildInventoryModel(
    base,
    balances.length ? 'ready' : 'empty',
    balances.length
      ? 'Saldos, alertas de estoque baixo e histórico recente da unidade.'
      : 'Nenhum saldo de estoque nesta unidade.',
    balances,
    alertsForBranch(branchId),
    movementsForBranch(branchId),
  );
}

function baseModel(session: SessionContext, branchId: string) {
  const hasInventoryEntitlement = (session.entitlements ?? []).includes('inventory');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Estoque',
    description: 'Saldos, alertas e movimentacoes auditáveis.',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead: hasPermission(session, 'inventory.read') && hasInventoryEntitlement && hasBranch,
    canWrite: hasPermission(session, 'inventory.write') && hasInventoryEntitlement && hasBranch,
  };
}

function buildInventoryModel(
  base: InventoryBaseModel,
  state: InventoryViewState,
  description: string,
  balances: readonly StockBalance[],
  alerts: readonly LowStockAlert[],
  movements: readonly StockMovement[],
  error?: InventoryViewModel['error'],
): InventoryViewModel {
  const balanceItems = balances.map((balance) => toBalanceItemModel(balance, base, state));
  const alertItems = alerts.map(toLowStockAlertModel);
  return {
    ...base,
    state,
    description,
    balances: balanceItems,
    lowStockAlerts: alertItems,
    movements: movements.map(toMovementModel),
    allowedActions: actionsFor(base, state, balanceItems),
    summary: {
      trackedProductCount: balanceItems.length,
      lowStockCount: balanceItems.filter((item) => item.lowStock).length,
      zeroStockCount: balanceItems.filter((item) => item.zeroStock).length,
    },
    error,
  };
}

function toBalanceItemModel(
  balance: StockBalance,
  base: InventoryBaseModel,
  state: InventoryViewState,
): StockBalanceItemModel {
  const product = productFor(balance.productId);
  const zeroStock = balance.currentQuantity <= 0;
  const canAdjust = base.canWrite && state === 'ready';
  return {
    productId: balance.productId,
    productName: product?.name ?? 'Produto ' + shortId(balance.productId),
    branchId: balance.branchId,
    currentQuantity: balance.currentQuantity,
    minimumStockQuantity: balance.minimumStockQuantity,
    quantityLabel: `${balance.currentQuantity} un. (min. ${balance.minimumStockQuantity})`,
    lowStock: balance.lowStock,
    zeroStock,
    tone: zeroStock ? 'danger' : balance.lowStock ? 'warning' : 'success',
    supplierName: product?.supplierMetadata?.supplierName ?? 'Fornecedor não informado',
    lastMovementLabel: balance.lastMovementAt
      ? dateTimeFormatter.format(new Date(balance.lastMovementAt))
      : 'Sem movimentos',
    canAdjust,
  };
}

function toLowStockAlertModel(alert: LowStockAlert): LowStockAlertModel {
  const product = productFor(alert.productId);
  const zeroStock = alert.currentQuantity <= 0;
  return {
    id: alert.id,
    productId: alert.productId,
    productName: product?.name ?? 'Produto ' + shortId(alert.productId),
    currentQuantity: alert.currentQuantity,
    minimumStockQuantity: alert.minimumStockQuantity,
    label: `${alert.currentQuantity} de mínimo ${alert.minimumStockQuantity}`,
    tone: zeroStock ? 'danger' : 'warning',
  };
}

function toMovementModel(movement: StockMovement): StockMovementModel {
  const product = productFor(movement.productId);
  return {
    id: movement.id,
    productId: movement.productId,
    productName: product?.name ?? 'Produto ' + shortId(movement.productId),
    type: movement.type,
    typeLabel: movementLabels[movement.type],
    typeTone: movementTones[movement.type],
    quantity: movement.quantity,
    quantityLabel: movement.quantity > 0 ? `+${movement.quantity}` : String(movement.quantity),
    sourceLabel: sourceLabelFor(movement),
    reason: movement.reason ?? 'Sem motivo informado',
    createdAtLabel: dateTimeFormatter.format(new Date(movement.createdAt)),
  };
}

function actionsFor(
  base: InventoryBaseModel,
  state: InventoryViewState,
  balances: readonly StockBalanceItemModel[],
): readonly InventoryActionModel[] {
  const stateReason = unavailableReasonForState(state);
  const hasBalance = balances.length > 0;
  const canRecordEntryInState = state === 'ready' || state === 'empty';
  return [
    {
      id: 'inventory.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissão para visualizar estoque.',
    },
    {
      id: 'inventory.record-entry',
      label: 'Entrada',
      enabled: base.canWrite && canRecordEntryInState,
      reason: actionReason(
        base.canWrite,
        canRecordEntryInState ? undefined : stateReason,
        'Sem permissão para registrar entrada.',
      ),
    },
    {
      id: 'inventory.record-loss',
      label: 'Perda',
      enabled: base.canWrite && state === 'ready' && hasBalance,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasBalance,
        'Nenhum produto com saldo.',
      ),
    },
    {
      id: 'inventory.adjust-stock',
      label: 'Ajuste',
      enabled: base.canWrite && state === 'ready' && hasBalance,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasBalance,
        'Nenhum produto com saldo.',
      ),
    },
    {
      id: 'inventory.transfer-stock',
      label: 'Transferir',
      enabled: base.canWrite && state === 'ready' && hasBalance,
      reason: selectedActionReason(
        base.canWrite,
        stateReason,
        hasBalance,
        'Nenhum produto com saldo.',
      ),
    },
  ];
}

function balancesForBranch(branchId: string) {
  return developmentBalances.filter((balance) => balance.branchId === branchId);
}

function restockedBalancesForBranch(branchId: string) {
  return developmentBalances
    .filter((balance) => balance.branchId === branchId)
    .map((balance) =>
      balance.productId === 'dev-product-soda'
        ? {
            ...balance,
            currentQuantity: 20,
            lowStock: false,
            lastMovementAt: '2026-09-07T13:10:00.000Z',
            updatedAt: '2026-09-07T13:10:00.000Z',
          }
        : balance.productId === 'dev-product-zero'
          ? {
              ...balance,
              currentQuantity: 12,
              lowStock: false,
              lastMovementAt: '2026-09-07T13:08:00.000Z',
              updatedAt: '2026-09-07T13:08:00.000Z',
            }
          : balance,
    );
}

function alertsForBranch(branchId: string) {
  return developmentAlerts.filter(
    (alert) => alert.branchId === branchId && alert.state === 'ACTIVE',
  );
}

function movementsForBranch(branchId: string) {
  return developmentMovements.filter(
    (movement) => movement.branchId === branchId && movement.id !== 'dev-stock-entry-soda-restock',
  );
}

function restockedMovementsForBranch(branchId: string) {
  return developmentMovements
    .filter((movement) => movement.branchId === branchId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function productFor(productId: string) {
  return developmentProducts.find((product) => product.id === productId);
}

function sourceLabelFor(movement: StockMovement) {
  if (movement.sourceType === 'ORDER_ITEM') return 'Comanda';
  if (movement.sourceType === 'TRANSFER') return 'Transferencia';
  if (movement.sourceType === 'PAYMENT') return 'Pagamento';
  if (movement.sourceType === 'SYSTEM') return 'Sistema';
  return 'Manual';
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function selectedActionReason(
  hasAccess: boolean,
  stateReason: string | undefined,
  hasSelectable: boolean,
  emptyReason: string,
) {
  if (!hasAccess) return 'Sem permissão para alterar estoque.';
  if (stateReason) return stateReason;
  if (!hasSelectable) return emptyReason;
  return undefined;
}

function unavailableReasonForState(state: InventoryViewState) {
  if (state === 'offline') return 'Disponivel quando a conexão voltar.';
  if (state === 'error') return 'Recarregue o estoque antes de executar esta ação.';
  if (state === 'permission-denied') return 'Sem permissão para visualizar estoque.';
  if (state === 'loading') return 'Aguarde o carregamento.';
  return undefined;
}

function developmentStateFrom(state: string | undefined): DevelopmentInventoryOptions['state'] {
  if (
    state === 'loading' ||
    state === 'empty' ||
    state === 'error' ||
    state === 'offline' ||
    state === 'branch-empty' ||
    state === 'restocked'
  ) {
    return state;
  }
  return undefined;
}

function branchNameFor(session: SessionContext, branchId: string) {
  return (
    session.availableWorkspaces?.find((workspace) => workspace.branchId === branchId)?.branchName ??
    (branchId === session.activeBranchId ? session.branchName : 'Unidade autorizada')
  );
}

function hasPermission(session: SessionContext, permission: Permission) {
  return session.permissions.includes(permission);
}

function shortId(id: string) {
  return id.replace(/-/g, '').slice(-4).toUpperCase();
}
