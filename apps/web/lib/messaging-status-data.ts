import type {
  ConversationStatus,
  MessageDeliveryState,
  MessagingConversation,
  MessagingConnection,
  MessagingMessage,
  Permission,
  RequestContext,
  SessionContext,
} from '@barberos/contracts';
import {
  createSupabaseServerClient,
  getRequestContext,
  isDevelopmentAuthEnabled,
} from './auth/server';
import { formatPhoneForDisplay } from './phone-format';
import { MessagingApplicationService } from '../src/modules/messaging/application/messaging-service';
import { SupabaseMessagingRepository } from '../src/modules/messaging/infrastructure/supabase-messaging-repository';

export type MessagingStatusViewState =
  'loading' | 'ready' | 'empty' | 'permission-denied' | 'error' | 'offline' | 'inactive-provider';

export type MessagingStatusTone = 'neutral' | 'success' | 'warning' | 'danger';

export type MessagingConnectionStatusModel = {
  id: string;
  label: string;
  providerLabel: string;
  phoneLabel: string;
  branchLabel: string;
  statusLabel: string;
  statusTone: MessagingStatusTone;
  fallbackLabel: string;
  updatedAtLabel: string;
};

export type MessagingDeliveryMetricModel = {
  id: MessageDeliveryState;
  label: string;
  count: number;
  tone: MessagingStatusTone;
};

export type MessagingMessageStatusModel = {
  id: string;
  directionLabel: string;
  deliveryState: MessageDeliveryState;
  deliveryStateLabel: string;
  deliveryTone: MessagingStatusTone;
  bodyPreview: string;
  createdAtLabel: string;
};

export type MessagingConversationItemModel = {
  id: string;
  customerLabel: string;
  branchName: string;
  status: ConversationStatus;
  statusLabel: string;
  statusTone: MessagingStatusTone;
  lastMessageAtLabel: string;
  lastMessagePreview: string;
  unreadCount: number;
  messages: readonly MessagingMessageStatusModel[];
};

export type MessagingActionModel = {
  id:
    | 'messaging.refresh'
    | 'messaging.setup'
    | 'messaging.manage'
    | 'messaging.open-campaigns'
    | 'messaging.open-conversations';
  label: string;
  href?: string;
  enabled: boolean;
  reason?: string;
};

export type MessagingStatusViewModel = {
  state: MessagingStatusViewState;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  canRead: boolean;
  canManage: boolean;
  canReadCampaigns: boolean;
  canReadDeliveryHealth: boolean;
  connection?: MessagingConnectionStatusModel;
  deliveryMetrics: readonly MessagingDeliveryMetricModel[];
  conversations: readonly MessagingConversationItemModel[];
  selectedConversation?: MessagingConversationItemModel;
  allowedActions: readonly MessagingActionModel[];
  healthNotes: readonly string[];
  error?: { code: string; message: string; requestId: string };
};

type MessagingStatusOptions = {
  branchId?: string;
  conversationId?: string;
  state?: string;
};

type DevelopmentMessagingStatusOptions = {
  branchId?: string;
  conversationId?: string;
  state?: 'loading' | 'empty' | 'error' | 'offline' | 'inactive-provider';
};

type MessagingStatusBaseModel = ReturnType<typeof baseModel>;

type MessagingStatusDataSet = {
  conversations: readonly MessagingConversation[];
  messagesByConversationId: ReadonlyMap<string, readonly MessagingMessage[]>;
  deliveryCounts: Partial<Record<MessageDeliveryState, number>>;
};

const deliveryLabelByState: Record<MessageDeliveryState, string> = {
  RECEIVED: 'Recebidas',
  QUEUED: 'Na fila',
  SENT: 'Enviadas',
  DELIVERED: 'Entregues',
  READ: 'Lidas',
  FAILED: 'Falharam',
  SKIPPED: 'Ignoradas',
  BLOCKED_BY_CONSENT: 'Bloqueadas por consentimento',
};

const deliveryToneByState: Record<MessageDeliveryState, MessagingStatusTone> = {
  RECEIVED: 'success',
  QUEUED: 'neutral',
  SENT: 'success',
  DELIVERED: 'success',
  READ: 'success',
  FAILED: 'danger',
  SKIPPED: 'warning',
  BLOCKED_BY_CONSENT: 'warning',
};

const conversationStatusLabels: Record<ConversationStatus, string> = {
  OPEN: 'Aberta',
  RESOLVED: 'Resolvida',
  ARCHIVED: 'Arquivada',
};

const conversationStatusTones: Record<ConversationStatus, MessagingStatusTone> = {
  OPEN: 'success',
  RESOLVED: 'neutral',
  ARCHIVED: 'neutral',
};

const developmentConversations: readonly {
  id: string;
  branchId: string;
  customerLabel: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string;
  messages: readonly {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    deliveryState: MessageDeliveryState;
    body: string;
    createdAt: string;
  }[];
}[] = [
  {
    id: 'conversation-ana',
    branchId: 'dev-branch',
    customerLabel: 'Ana P.',
    status: 'OPEN',
    unreadCount: 1,
    lastMessageAt: '2026-09-29T13:05:00.000Z',
    messages: [
      {
        id: 'message-ana-1',
        direction: 'OUTBOUND',
        deliveryState: 'DELIVERED',
        body: 'Oi Ana, seu horário de corte amanhã às 10h está confirmado.',
        createdAt: '2026-09-29T12:55:00.000Z',
      },
      {
        id: 'message-ana-2',
        direction: 'INBOUND',
        deliveryState: 'RECEIVED',
        body: 'Confirmado! Meu telefone alternativo é +55 11 94444-0000 e meu email ana@email.com',
        createdAt: '2026-09-29T13:05:00.000Z',
      },
    ],
  },
  {
    id: 'conversation-carlos',
    branchId: 'dev-branch',
    customerLabel: 'Carlos M.',
    status: 'RESOLVED',
    unreadCount: 0,
    lastMessageAt: '2026-09-29T10:15:00.000Z',
    messages: [
      {
        id: 'message-carlos-1',
        direction: 'OUTBOUND',
        deliveryState: 'SENT',
        body: 'Temos horários livres nesta sexta. Veja detalhes em https://barberos.local/agenda',
        createdAt: '2026-09-29T10:12:00.000Z',
      },
      {
        id: 'message-carlos-2',
        direction: 'INBOUND',
        deliveryState: 'RECEIVED',
        body: 'Pode reservar o corte completo às 17h.',
        createdAt: '2026-09-29T10:15:00.000Z',
      },
    ],
  },
  {
    id: 'conversation-north-hidden',
    branchId: 'dev-branch-north',
    customerLabel: 'Cliente Norte',
    status: 'OPEN',
    unreadCount: 2,
    lastMessageAt: '2026-09-29T09:00:00.000Z',
    messages: [
      {
        id: 'message-north-1',
        direction: 'INBOUND',
        deliveryState: 'RECEIVED',
        body: 'Mensagem de outra unidade.',
        createdAt: '2026-09-29T09:00:00.000Z',
      },
    ],
  },
];

const developmentConnections: readonly MessagingConnection[] = [
  {
    id: 'dev-message-connection-main',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    provider: 'LOCAL',
    status: 'ACTIVE',
    displayName: 'WhatsApp Centro',
    displayPhoneNumber: '+55 11 99999-0101',
    providerPhoneNumberId: 'phone-centro',
    credentialReference: 'vault:messaging/dev/main',
    webhookSecretReference: 'vault:messaging/dev/webhook',
    allowTenantFallback: true,
    metadata: { providerMode: 'noop', lastHealthCheckAt: '2026-09-29T13:30:00.000Z' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-29T13:30:00.000Z',
  },
  {
    id: 'dev-message-connection-north',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch-north',
    provider: 'META_WHATSAPP_CLOUD',
    status: 'INACTIVE',
    displayName: 'WhatsApp Norte',
    displayPhoneNumber: '+55 11 98888-0101',
    providerPhoneNumberId: 'phone-norte',
    credentialReference: 'vault:messaging/dev/north',
    webhookSecretReference: 'vault:messaging/dev/webhook-north',
    allowTenantFallback: false,
    metadata: { providerMode: 'setup' },
    createdBy: 'dev-user',
    updatedBy: 'dev-user',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-28T11:00:00.000Z',
  },
];

const developmentDeliveryCounts: Record<MessageDeliveryState, number> = {
  RECEIVED: 38,
  QUEUED: 7,
  SENT: 126,
  DELIVERED: 112,
  READ: 81,
  FAILED: 3,
  SKIPPED: 5,
  BLOCKED_BY_CONSENT: 9,
};

export async function getMessagingStatusViewModel(
  session: SessionContext,
  options: MessagingStatusOptions = {},
): Promise<MessagingStatusViewModel> {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar mensagens ou configuração de WhatsApp desta unidade.',
      undefined,
      undefined,
      options.conversationId,
      emptyDataSet(),
    );
  }

  if (options.state === 'loading') {
    return buildModel(
      base,
      'loading',
      'Carregando conexão, conversas e status de entrega.',
      undefined,
      undefined,
      options.conversationId,
      emptyDataSet(),
    );
  }

  if (options.state === 'error') {
    return buildModel(
      base,
      'error',
      'Não foi possível carregar o status de mensagens agora.',
      undefined,
      {
        code: 'MESSAGING_VALIDATION_ERROR',
        message: 'Status de mensagens indisponível.',
        requestId: 'local-messaging-status-error',
      },
      options.conversationId,
      emptyDataSet(),
    );
  }

  const client = await createSupabaseServerClient();
  const requestContext = client
    ? await getRequestContext(crypto.randomUUID(), session.tenantId, branchId)
    : null;

  if (client && requestContext) {
    try {
      return await getPersistentMessagingStatusViewModel(client, requestContext, session, {
        branchId,
        conversationId: options.conversationId,
        state: developmentStateFrom(options.state),
      });
    } catch (error) {
      return buildModel(
        base,
        'error',
        'Não foi possível carregar o status de mensagens agora.',
        undefined,
        {
          code:
            error instanceof Error && 'code' in error
              ? String(error.code)
              : 'MESSAGING_STATUS_LOAD_FAILED',
          message: 'Status de mensagens indisponível.',
          requestId: requestContext.requestId,
        },
        options.conversationId,
        emptyDataSet(),
      );
    }
  }

  if (isDevelopmentAuthEnabled()) {
    return getDevelopmentMessagingStatusViewModel(session, {
      branchId: options.branchId,
      conversationId: options.conversationId,
      state: developmentStateFrom(options.state),
    });
  }

  return buildModel(
    base,
    'empty',
    'Nenhuma conexão WhatsApp ativa nesta unidade.',
    undefined,
    undefined,
    options.conversationId,
    emptyDataSet(),
  );
}

export function getDevelopmentMessagingStatusViewModel(
  session: SessionContext,
  options: DevelopmentMessagingStatusOptions = {},
): MessagingStatusViewModel {
  const branchId =
    options.branchId ?? session.activeBranchId ?? session.branchScope[0] ?? 'dev-branch';
  const base = baseModel(session, branchId);

  if (!base.canRead) {
    return buildModel(
      base,
      'permission-denied',
      'Seu perfil não pode visualizar mensagens ou configuração de WhatsApp desta unidade.',
    );
  }

  if (options.state === 'loading') {
    return buildModel(base, 'loading', 'Carregando conexão, conversas e status de entrega.');
  }

  if (options.state === 'error') {
    return buildModel(
      base,
      'error',
      'Não foi possível carregar o status de mensagens agora.',
      undefined,
      {
        code: 'MESSAGING_VALIDATION_ERROR',
        message: 'Status de mensagens indisponível.',
        requestId: 'local-messaging-status-error',
      },
    );
  }

  if (options.state === 'offline') {
    return buildModel(
      base,
      'offline',
      'Você está offline. Configuração, envio e reagendamento de campanhas ficam pausados.',
      activeConnectionFor(base.branchId),
    );
  }

  if (options.state === 'empty') {
    return buildModel(
      base,
      'empty',
      'Nenhuma conexão WhatsApp ativa nesta unidade. Configure um provider para liberar mensagens.',
    );
  }

  if (options.state === 'inactive-provider') {
    return buildModel(
      base,
      'inactive-provider',
      'O provider existe, mas está inativo. Reative a conexão antes de enviar mensagens.',
      inactiveConnectionFor(base.branchId),
    );
  }

  const connection = activeConnectionFor(base.branchId);
  return buildModel(
    base,
    connection ? 'ready' : 'empty',
    connection
      ? 'Conexão, consentimento e entregas recentes por unidade.'
      : 'Nenhuma conexão WhatsApp ativa nesta unidade.',
    connection,
    undefined,
    options.conversationId,
  );
}

function baseModel(session: SessionContext, branchId: string) {
  const hasMessagingEntitlement = (session.entitlements ?? []).includes('messaging');
  const hasCampaignEntitlement = (session.entitlements ?? []).includes('campaigns');
  const hasNotificationsEntitlement = (session.entitlements ?? []).includes('notifications');
  const hasBranch = session.branchScope.includes(branchId);
  return {
    title: 'Mensagens',
    description: 'WhatsApp, saúde de entrega e próximos passos de comunicação.',
    branchId,
    branchName: branchNameFor(session, branchId),
    canRead: hasPermission(session, 'messaging.read') && hasMessagingEntitlement && hasBranch,
    canManage: hasPermission(session, 'messaging.manage') && hasMessagingEntitlement && hasBranch,
    canReadCampaigns:
      hasPermission(session, 'campaigns.read') && hasCampaignEntitlement && hasBranch,
    canReadDeliveryHealth:
      hasPermission(session, 'notifications.status.read') &&
      hasNotificationsEntitlement &&
      hasBranch,
  };
}

function buildModel(
  base: MessagingStatusBaseModel,
  state: MessagingStatusViewState,
  description: string,
  connection?: MessagingConnection,
  error?: MessagingStatusViewModel['error'],
  conversationId?: string,
  dataSet?: MessagingStatusDataSet,
): MessagingStatusViewModel {
  const conversations =
    base.canRead && (state === 'ready' || state === 'offline')
      ? conversationsFor(base.branchId, base.branchName, dataSet)
      : [];
  return {
    ...base,
    state,
    description,
    connection: connection ? toConnectionModel(connection, base.branchName) : undefined,
    deliveryMetrics:
      base.canReadDeliveryHealth && state !== 'permission-denied'
        ? deliveryMetricsFor(state, dataSet)
        : [],
    conversations,
    selectedConversation:
      conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0],
    allowedActions: actionsFor(base, state, Boolean(connection)),
    healthNotes: healthNotesFor(state, base, connection),
    error,
  };
}

function conversationsFor(
  branchId: string,
  branchName: string,
  dataSet?: MessagingStatusDataSet,
): readonly MessagingConversationItemModel[] {
  if (dataSet) return persistentConversationsFor(branchId, branchName, dataSet);

  return developmentConversations
    .filter((conversation) => conversation.branchId === branchId)
    .map((conversation) => {
      const messages = conversation.messages.map((message): MessagingMessageStatusModel => ({
        id: message.id,
        directionLabel: message.direction === 'INBOUND' ? 'Cliente' : 'Barbearia',
        deliveryState: message.deliveryState,
        deliveryStateLabel: deliveryLabelByState[message.deliveryState],
        deliveryTone: deliveryToneByState[message.deliveryState],
        bodyPreview: sanitizeMessageBody(message.body),
        createdAtLabel: formatDateTime(message.createdAt),
      }));
      return {
        id: conversation.id,
        customerLabel: conversation.customerLabel,
        branchName,
        status: conversation.status,
        statusLabel: conversationStatusLabels[conversation.status],
        statusTone: conversationStatusTones[conversation.status],
        lastMessageAtLabel: formatDateTime(conversation.lastMessageAt),
        lastMessagePreview: messages.at(-1)?.bodyPreview ?? 'Sem mensagens recentes.',
        unreadCount: conversation.unreadCount,
        messages,
      };
    });
}

async function getPersistentMessagingStatusViewModel(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  context: RequestContext,
  session: SessionContext,
  options: {
    branchId: string;
    conversationId?: string;
    state?: DevelopmentMessagingStatusOptions['state'];
  },
): Promise<MessagingStatusViewModel> {
  const base = baseModel(session, options.branchId);
  const service = new MessagingApplicationService(new SupabaseMessagingRepository(client));
  const connections = await service.listConnections(context, { branchId: options.branchId });
  const activeConnection = activeConnectionFrom(connections, options.branchId);
  const inactiveConnection = connections.find((connection) => connection.status !== 'ACTIVE');
  const connection = activeConnection ?? inactiveConnection;
  const dataSet = await loadMessagingDataSet(service, context, options.branchId, base.canRead);
  const forcedState = options.state;

  if (forcedState === 'offline') {
    return buildModel(
      base,
      'offline',
      'Você está offline. Configuração, envio e reagendamento de campanhas ficam pausados.',
      connection,
      undefined,
      options.conversationId,
      dataSet,
    );
  }

  if (forcedState === 'empty') {
    return buildModel(
      base,
      'empty',
      'Nenhuma conexão WhatsApp ativa nesta unidade. Configure um provider para liberar mensagens.',
      undefined,
      undefined,
      options.conversationId,
      emptyDataSet(),
    );
  }

  if (forcedState === 'inactive-provider') {
    return buildModel(
      base,
      'inactive-provider',
      'O provider existe, mas está inativo. Reative a conexão antes de enviar mensagens.',
      inactiveConnection,
      undefined,
      options.conversationId,
      dataSet,
    );
  }

  if (!activeConnection) {
    return buildModel(
      base,
      inactiveConnection ? 'inactive-provider' : 'empty',
      inactiveConnection
        ? 'O provider existe, mas está inativo. Reative a conexão antes de enviar mensagens.'
        : 'Nenhuma conexão WhatsApp ativa nesta unidade.',
      inactiveConnection,
      undefined,
      options.conversationId,
      dataSet,
    );
  }

  return buildModel(
    base,
    'ready',
    'Conexão, consentimento e entregas recentes por unidade.',
    activeConnection,
    undefined,
    options.conversationId,
    dataSet,
  );
}

async function loadMessagingDataSet(
  service: MessagingApplicationService,
  context: RequestContext,
  branchId: string,
  canRead: boolean,
): Promise<MessagingStatusDataSet> {
  if (!canRead) return emptyDataSet();

  const conversations = await service.listConversations(context, { branchId, limit: 25 });
  const messageEntries = await Promise.all(
    conversations.map(async (conversation) => {
      const messages = await service.listMessages(context, {
        conversationId: conversation.id,
        limit: 10,
      });
      return [
        conversation.id,
        messages
          .slice()
          .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)),
      ] as const;
    }),
  );
  const deliveryCounts: Partial<Record<MessageDeliveryState, number>> = {};
  for (const [, messages] of messageEntries) {
    for (const message of messages) {
      deliveryCounts[message.deliveryState] = (deliveryCounts[message.deliveryState] ?? 0) + 1;
    }
  }

  return {
    conversations,
    messagesByConversationId: new Map(messageEntries),
    deliveryCounts,
  };
}

function persistentConversationsFor(
  branchId: string,
  branchName: string,
  dataSet: MessagingStatusDataSet,
): readonly MessagingConversationItemModel[] {
  return dataSet.conversations
    .filter((conversation) => !conversation.branchId || conversation.branchId === branchId)
    .map((conversation) => {
      const messages = (dataSet.messagesByConversationId.get(conversation.id) ?? []).map(
        (message): MessagingMessageStatusModel => ({
          id: message.id,
          directionLabel: message.direction === 'INBOUND' ? 'Cliente' : 'Barbearia',
          deliveryState: message.deliveryState,
          deliveryStateLabel: deliveryLabelByState[message.deliveryState],
          deliveryTone: deliveryToneByState[message.deliveryState],
          bodyPreview: sanitizeMessageBody(message.bodyPreview ?? 'Mensagem sem prévia.'),
          createdAtLabel: formatDateTime(message.createdAt),
        }),
      );
      return {
        id: conversation.id,
        customerLabel: conversation.customerId
          ? `Cliente ${shortIdentifier(conversation.customerId)}`
          : `Contato ${shortIdentifier(conversation.contactPhoneHash)}`,
        branchName,
        status: conversation.status,
        statusLabel: conversationStatusLabels[conversation.status],
        statusTone: conversationStatusTones[conversation.status],
        lastMessageAtLabel: formatDateTime(
          conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
        ),
        lastMessagePreview: messages.at(-1)?.bodyPreview ?? 'Sem mensagens recentes.',
        unreadCount: conversation.status === 'OPEN' ? countUnreadInbound(messages) : 0,
        messages,
      };
    });
}

function activeConnectionFor(branchId: string) {
  return (
    developmentConnections.find(
      (connection) => connection.branchId === branchId && connection.status === 'ACTIVE',
    ) ??
    developmentConnections.find(
      (connection) =>
        !connection.branchId && connection.allowTenantFallback && connection.status === 'ACTIVE',
    )
  );
}

function activeConnectionFrom(connections: readonly MessagingConnection[], branchId: string) {
  const active = connections.filter((connection) => connection.status === 'ACTIVE');
  return (
    active.find((connection) => connection.branchId === branchId) ??
    active.find((connection) => !connection.branchId && connection.allowTenantFallback)
  );
}

function emptyDataSet(): MessagingStatusDataSet {
  return {
    conversations: [],
    messagesByConversationId: new Map(),
    deliveryCounts: {},
  };
}

function inactiveConnectionFor(branchId: string) {
  return (
    developmentConnections.find(
      (connection) => connection.branchId === branchId && connection.status !== 'ACTIVE',
    ) ?? developmentConnections[1]
  );
}

function toConnectionModel(
  connection: MessagingConnection,
  branchName: string,
): MessagingConnectionStatusModel {
  return {
    id: connection.id,
    label: connection.displayName,
    providerLabel: connection.provider === 'LOCAL' ? 'Local/noop' : 'Meta WhatsApp Cloud',
    phoneLabel: formatPhoneForDisplay(connection.displayPhoneNumber),
    branchLabel: connection.branchId ? branchName : 'Todas as unidades autorizadas',
    statusLabel: connection.status === 'ACTIVE' ? 'Ativa' : connection.status,
    statusTone:
      connection.status === 'ACTIVE'
        ? 'success'
        : connection.status === 'DISCONNECTED'
          ? 'danger'
          : 'warning',
    fallbackLabel: connection.allowTenantFallback ? 'Fallback do tenant permitido' : 'Sem fallback',
    updatedAtLabel: formatDateTime(connection.updatedAt),
  };
}

function deliveryMetricsFor(
  state: MessagingStatusViewState,
  dataSet?: MessagingStatusDataSet,
): readonly MessagingDeliveryMetricModel[] {
  if (state === 'loading' || state === 'empty' || state === 'error') return [];
  const counts = dataSet?.deliveryCounts ?? developmentDeliveryCounts;
  return Object.entries(counts).map(([deliveryState, count]) => ({
    id: deliveryState as MessageDeliveryState,
    label: deliveryLabelByState[deliveryState as MessageDeliveryState],
    count: state === 'offline' && deliveryState === 'QUEUED' ? count + 2 : count,
    tone: deliveryToneByState[deliveryState as MessageDeliveryState],
  }));
}

function actionsFor(
  base: MessagingStatusBaseModel,
  state: MessagingStatusViewState,
  hasConnection: boolean,
): readonly MessagingActionModel[] {
  const stateReason = unavailableReasonForState(state);
  return [
    {
      id: 'messaging.refresh',
      label: 'Recarregar',
      enabled: base.canRead && state !== 'permission-denied',
      reason: base.canRead ? undefined : 'Sem permissão para visualizar mensagens.',
    },
    {
      id: 'messaging.setup',
      label: hasConnection ? 'Gerenciar conexão' : 'Configurar WhatsApp',
      enabled:
        base.canManage && (state === 'ready' || state === 'empty' || state === 'inactive-provider'),
      reason: actionReason(base.canManage, stateReason, 'Sem permissão para gerenciar provider.'),
    },
    {
      id: 'messaging.open-conversations',
      label: 'Ver conversas',
      href: '/mensagens#messaging-conversation-list-title',
      enabled: base.canRead && state === 'ready',
      reason: actionReason(base.canRead, stateReason, 'Sem permissão para conversas.'),
    },
    {
      id: 'messaging.open-campaigns',
      label: 'Abrir campanhas',
      href: '/campanhas',
      enabled: base.canReadCampaigns && state === 'ready',
      reason: actionReason(base.canReadCampaigns, stateReason, 'Campanhas indisponíveis.'),
    },
  ];
}

function healthNotesFor(
  state: MessagingStatusViewState,
  base: MessagingStatusBaseModel,
  connection?: MessagingConnection,
) {
  if (state === 'permission-denied') {
    return ['Nenhum dado de conversas, audiência ou entregas foi carregado.'];
  }
  if (state === 'offline') {
    return [
      'Envios finais ficam bloqueados até a conexão voltar.',
      'Rascunhos podem continuar em edição segura.',
    ];
  }
  if (state === 'empty') {
    return [
      'Crie a conexão usando referência segura de credencial.',
      'Segredos do provider não são exibidos na interface.',
    ];
  }
  if (state === 'inactive-provider') {
    return [
      'Reative o provider antes de liberar campanhas.',
      'Webhooks continuam auditáveis, mas envios ficam pausados.',
    ];
  }
  if (state === 'error') {
    return ['Nenhum estado operacional foi alterado.', 'Tente recarregar em instantes.'];
  }
  if (!base.canReadDeliveryHealth) {
    return ['Seu perfil visualiza conexão, mas não possui permissão de saúde de entrega.'];
  }
  return [
    connection?.provider === 'LOCAL'
      ? 'Ambiente local/noop: tentativas são registradas sem prometer entrega real.'
      : 'Provider conectado com status recente.',
    'Métricas agregadas respeitam escopo de unidade e consentimento.',
  ];
}

function unavailableReasonForState(state: MessagingStatusViewState) {
  if (state === 'offline') return 'Disponível quando a conexão voltar.';
  if (state === 'loading') return 'Aguarde o carregamento.';
  if (state === 'error') return 'Recarregue antes de executar esta ação.';
  if (state === 'permission-denied') return 'Sem permissão para mensagens.';
  if (state === 'inactive-provider') return 'Provider inativo.';
  return undefined;
}

function actionReason(hasAccess: boolean, stateReason: string | undefined, deniedReason: string) {
  if (!hasAccess) return deniedReason;
  return stateReason;
}

function developmentStateFrom(
  state: string | undefined,
): DevelopmentMessagingStatusOptions['state'] {
  if (
    state === 'loading' ||
    state === 'empty' ||
    state === 'error' ||
    state === 'offline' ||
    state === 'inactive-provider'
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function countUnreadInbound(messages: readonly MessagingMessageStatusModel[]) {
  return messages.filter((message) => message.directionLabel === 'Cliente').length;
}

function shortIdentifier(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '');
  return compact.length <= 6 ? compact : compact.slice(-6);
}

function sanitizeMessageBody(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, '[link removido]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removido]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[telefone removido]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}
