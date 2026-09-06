import type { Permission, SessionContext } from '@barberos/contracts';

export type OperationsDirectoryArea = 'clientes' | 'equipe' | 'servicos';
export type OperationsDirectoryState =
  'default' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'permission-denied';

export type OperationsDirectoryField = {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'tel' | 'email' | 'number' | 'select';
  options?: readonly string[];
};

export type OperationsDirectoryItem = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'neutral';
  metrics: readonly { label: string; value: string }[];
  tags: readonly string[];
};

export type OperationsDirectoryModel = {
  area: OperationsDirectoryArea;
  title: string;
  eyebrow: string;
  description: string;
  branchName: string;
  searchPlaceholder: string;
  primaryActionLabel: string;
  formTitle: string;
  formDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  deniedDescription: string;
  readPermission: Permission;
  createPermission: Permission;
  updatePermission: Permission;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  state: OperationsDirectoryState;
  items: readonly OperationsDirectoryItem[];
  fields: readonly OperationsDirectoryField[];
};

const areaConfig: Record<
  OperationsDirectoryArea,
  Pick<
    OperationsDirectoryModel,
    | 'area'
    | 'title'
    | 'eyebrow'
    | 'description'
    | 'searchPlaceholder'
    | 'primaryActionLabel'
    | 'formTitle'
    | 'formDescription'
    | 'emptyTitle'
    | 'emptyDescription'
    | 'deniedDescription'
    | 'readPermission'
    | 'createPermission'
    | 'updatePermission'
  >
> = {
  clientes: {
    area: 'clientes',
    title: 'Clientes',
    eyebrow: 'Relacionamento operacional',
    description: 'Busque clientes, acompanhe recorrencia e crie cadastros rapidos para agenda.',
    searchPlaceholder: 'Buscar por nome ou telefone',
    primaryActionLabel: 'Novo cliente',
    formTitle: 'Cadastro rapido',
    formDescription: 'Dados minimos para localizar o cliente e usar em novos agendamentos.',
    emptyTitle: 'Ainda nao ha clientes',
    emptyDescription: 'Cadastre o primeiro cliente ou crie um agendamento pela agenda.',
    deniedDescription: 'Seu perfil nao pode visualizar clientes desta unidade.',
    readPermission: 'customers.read',
    createPermission: 'customers.create',
    updatePermission: 'customers.update',
  },
  equipe: {
    area: 'equipe',
    title: 'Equipe',
    eyebrow: 'Profissionais e disponibilidade',
    description: 'Controle profissionais habilitados para agenda, papel operacional e status.',
    searchPlaceholder: 'Buscar profissional',
    primaryActionLabel: 'Novo profissional',
    formTitle: 'Novo profissional',
    formDescription: 'Vincule a filial e deixe o profissional disponivel para futuros horarios.',
    emptyTitle: 'Equipe ainda vazia',
    emptyDescription: 'Adicione profissionais para montar a agenda operacional da filial.',
    deniedDescription: 'Seu perfil nao pode visualizar equipe desta unidade.',
    readPermission: 'professionals.read',
    createPermission: 'professionals.create',
    updatePermission: 'professionals.update',
  },
  servicos: {
    area: 'servicos',
    title: 'Servicos',
    eyebrow: 'Catalogo da agenda',
    description: 'Organize servicos, duracao, preco e profissionais habilitados para atendimento.',
    searchPlaceholder: 'Buscar servico ou categoria',
    primaryActionLabel: 'Novo servico',
    formTitle: 'Novo servico',
    formDescription: 'Defina nome, duracao e preco usados nos agendamentos e futura Comanda.',
    emptyTitle: 'Nenhum servico cadastrado',
    emptyDescription: 'Crie servicos para liberar selecao no fluxo de novo agendamento.',
    deniedDescription: 'Seu perfil nao pode visualizar servicos desta unidade.',
    readPermission: 'services.read',
    createPermission: 'services.create',
    updatePermission: 'services.update',
  },
};

const items: Record<OperationsDirectoryArea, OperationsDirectoryItem[]> = {
  clientes: [
    {
      id: 'customer-marcos',
      title: 'Marcos Vinicius',
      subtitle: '(11) 98800-1100',
      statusLabel: 'Ativo',
      statusTone: 'success',
      metrics: [
        { label: 'Ultima visita', value: '28 dias' },
        { label: 'Atendimentos', value: '8' },
        { label: 'Ticket medio', value: 'R$ 92' },
      ],
      tags: ['Prefere Carlos', 'WhatsApp ok'],
    },
    {
      id: 'customer-rafael',
      title: 'Rafael Alves',
      subtitle: '(11) 97700-2211',
      statusLabel: 'Em risco',
      statusTone: 'warning',
      metrics: [
        { label: 'Ultima visita', value: '42 dias' },
        { label: 'Atendimentos', value: '5' },
        { label: 'Ticket medio', value: 'R$ 68' },
      ],
      tags: ['Barba', 'Retorno esperado'],
    },
    {
      id: 'customer-bruno',
      title: 'Bruno Martins',
      subtitle: '(11) 96600-3322',
      statusLabel: 'Novo',
      statusTone: 'neutral',
      metrics: [
        { label: 'Ultima visita', value: 'Hoje' },
        { label: 'Atendimentos', value: '1' },
        { label: 'Ticket medio', value: 'R$ 40' },
      ],
      tags: ['Recepcao', 'Primeiro atendimento'],
    },
  ],
  equipe: [
    {
      id: 'professional-carlos',
      title: 'Carlos Mendes',
      subtitle: 'Barbeiro senior',
      statusLabel: 'Online hoje',
      statusTone: 'success',
      metrics: [
        { label: 'Agenda hoje', value: '2' },
        { label: 'Ocupacao', value: '74%' },
        { label: 'Filiais', value: 'Centro' },
      ],
      tags: ['Corte + barba', 'Comissao padrao'],
    },
    {
      id: 'professional-joao',
      title: 'Joao Pereira',
      subtitle: 'Barbeiro',
      statusLabel: 'Ativo',
      statusTone: 'success',
      metrics: [
        { label: 'Agenda hoje', value: '2' },
        { label: 'Ocupacao', value: '63%' },
        { label: 'Filiais', value: 'Centro' },
      ],
      tags: ['Cabelo', 'Turno tarde'],
    },
    {
      id: 'professional-rafael',
      title: 'Rafael Lima',
      subtitle: 'Especialista em barba',
      statusLabel: 'Em atendimento',
      statusTone: 'neutral',
      metrics: [
        { label: 'Agenda hoje', value: '2' },
        { label: 'Ocupacao', value: '81%' },
        { label: 'Filiais', value: 'Centro' },
      ],
      tags: ['Barba', 'Acabamento'],
    },
  ],
  servicos: [
    {
      id: 'service-cut',
      title: 'Corte classico',
      subtitle: 'Cabelo',
      statusLabel: 'Ativo',
      statusTone: 'success',
      metrics: [
        { label: 'Duracao', value: '45 min' },
        { label: 'Preco', value: 'R$ 60' },
        { label: 'Profissionais', value: '3' },
      ],
      tags: ['Agenda', 'Comanda futura'],
    },
    {
      id: 'service-beard',
      title: 'Barba',
      subtitle: 'Barba',
      statusLabel: 'Ativo',
      statusTone: 'success',
      metrics: [
        { label: 'Duracao', value: '30 min' },
        { label: 'Preco', value: 'R$ 40' },
        { label: 'Profissionais', value: '2' },
      ],
      tags: ['Recorrente', 'Rafael'],
    },
    {
      id: 'service-premium',
      title: 'Combo completo',
      subtitle: 'Pacote operacional',
      statusLabel: 'Ativo',
      statusTone: 'success',
      metrics: [
        { label: 'Duracao', value: '90 min' },
        { label: 'Preco', value: 'R$ 130' },
        { label: 'Profissionais', value: '3' },
      ],
      tags: ['Alto valor', 'Owner acompanha'],
    },
  ],
};

const fields: Record<OperationsDirectoryArea, OperationsDirectoryField[]> = {
  clientes: [
    { id: 'name', label: 'Nome', placeholder: 'Nome completo', type: 'text' },
    { id: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999', type: 'tel' },
    { id: 'email', label: 'Email', placeholder: 'cliente@email.com', type: 'email' },
    {
      id: 'source',
      label: 'Origem',
      placeholder: 'Recepcao',
      type: 'select',
      options: ['Recepcao', 'WhatsApp', 'Online', 'Indicacao'],
    },
  ],
  equipe: [
    { id: 'displayName', label: 'Nome', placeholder: 'Nome do profissional', type: 'text' },
    {
      id: 'roleLabel',
      label: 'Papel',
      placeholder: 'Barbeiro',
      type: 'select',
      options: ['Barbeiro', 'Barbeiro senior', 'Especialista em barba', 'Recepcao'],
    },
    { id: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999', type: 'tel' },
    { id: 'branch', label: 'Filial', placeholder: 'Centro', type: 'select', options: ['Centro'] },
  ],
  servicos: [
    { id: 'name', label: 'Servico', placeholder: 'Corte classico', type: 'text' },
    {
      id: 'category',
      label: 'Categoria',
      placeholder: 'Cabelo',
      type: 'select',
      options: ['Cabelo', 'Barba', 'Pacote', 'Tratamento'],
    },
    { id: 'duration', label: 'Duracao', placeholder: '45', type: 'number' },
    { id: 'price', label: 'Preco', placeholder: '60', type: 'number' },
  ],
};

export function getOperationsDirectoryModel(
  session: SessionContext,
  area: OperationsDirectoryArea,
  options: { state?: string; mode?: string } = {},
): OperationsDirectoryModel {
  const config = areaConfig[area];
  const hasEntitlement = (session.entitlements ?? []).includes('core.operations');
  const branchId = session.activeBranchId ?? session.branchScope[0] ?? '';
  const hasBranch = Boolean(branchId && session.branchScope.includes(branchId));
  const canRead =
    hasEntitlement && hasBranch && session.permissions.includes(config.readPermission);
  const canCreate =
    hasEntitlement && hasBranch && session.permissions.includes(config.createPermission);
  const canUpdate =
    hasEntitlement && hasBranch && session.permissions.includes(config.updatePermission);
  const requestedState = normalizeState(options.state);
  const state: OperationsDirectoryState = !canRead ? 'permission-denied' : requestedState;

  return {
    ...config,
    branchName: session.branchName,
    canRead,
    canCreate,
    canUpdate,
    state,
    items: state === 'empty' || state === 'permission-denied' ? [] : items[area],
    fields: fields[area],
  };
}

export function isOperationsDirectoryArea(area: string): area is OperationsDirectoryArea {
  return area === 'clientes' || area === 'equipe' || area === 'servicos';
}

function normalizeState(state?: string): OperationsDirectoryState {
  if (
    state === 'loading' ||
    state === 'empty' ||
    state === 'error' ||
    state === 'offline' ||
    state === 'disabled' ||
    state === 'permission-denied'
  ) {
    return state;
  }
  return 'default';
}
