import type { Permission, SessionContext } from '@barberos/contracts';

type NavigationRole = SessionContext['role'];

export type SettingsSectionIcon =
  'building' | 'users' | 'shield' | 'link' | 'credit-card' | 'palette';

export type SettingsSection = {
  key: string;
  href: string;
  title: string;
  description: string;
  status: string;
  icon: SettingsSectionIcon;
  permission: Permission;
  roles?: readonly NavigationRole[];
  summary: string;
  highlights: readonly { label: string; value: string }[];
  tasks: readonly string[];
};

export const settingsSections = [
  {
    key: 'barbearia-filiais',
    href: '/configuracoes/barbearia-filiais',
    title: 'Barbearia e filiais',
    description: 'Dados da empresa, unidades, horários padrão e contexto operacional.',
    status: 'Base configurada',
    icon: 'building',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER'],
    summary:
      'Organize o cadastro da barbearia, filiais disponíveis, horários padrão e escopo operacional usado nas telas do sistema.',
    highlights: [
      { label: 'Escopo', value: 'Tenant e filiais' },
      { label: 'Uso', value: 'Agenda, caixa e estoque' },
      { label: 'Controle', value: 'Validado por membership' },
    ],
    tasks: [
      'Manter dados da empresa e unidade principal atualizados.',
      'Criar novas filiais quando o proprietário tiver escopo administrativo.',
      'Definir horários padrão que servem de base para agenda e atendimento.',
    ],
  },
  {
    key: 'usuarios-permissoes',
    href: '/configuracoes/usuarios-permissoes',
    title: 'Usuários e permissões',
    description: 'Convites, papéis, escopo por filial e acessos do time.',
    status: 'RBAC ativo',
    icon: 'users',
    permission: 'memberships.read',
    roles: ['OWNER', 'MANAGER'],
    summary:
      'Gerencie quem entra no workspace, quais papéis cada pessoa recebe e quais filiais cada usuário pode visualizar.',
    highlights: [
      { label: 'Owner', value: 'Todas as filiais' },
      { label: 'Recepção', value: 'Filial vinculada' },
      { label: 'Barbeiro', value: 'Agenda e produção próprias' },
    ],
    tasks: [
      'Convidar usuários do time com o papel correto.',
      'Vincular recepcionistas e profissionais somente às filiais permitidas.',
      'Revisar permissões antes de liberar ações financeiras ou administrativas.',
    ],
  },
  {
    key: 'seguranca',
    href: '/configuracoes/seguranca',
    title: 'Segurança',
    description: 'Senhas, bloqueios, sessões e proteção de acesso do tenant.',
    status: 'Obrigatório',
    icon: 'shield',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER'],
    summary:
      'Controle regras de senha, bloqueios, sessões ativas e eventos sensíveis do workspace sem expor ferramentas de plataforma.',
    highlights: [
      { label: 'Senhas', value: 'Política do tenant' },
      { label: 'Bloqueios', value: 'Usuários e filiais' },
      { label: 'Sessões', value: 'Encerramento remoto' },
    ],
    tasks: [
      'Definir política mínima de senha e expiração de sessões.',
      'Bloquear temporariamente usuários quando necessário.',
      'Revisar acessos por filial antes de liberar ações financeiras.',
    ],
  },
  {
    key: 'integracoes',
    href: '/configuracoes/integracoes',
    title: 'Integrações',
    description: 'WhatsApp com IA, Google Calendar e Google Drive do tenant.',
    status: 'Em preparação',
    icon: 'link',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER'],
    summary:
      'Configure integrações operacionais usadas pela barbearia: WhatsApp para atendimento com IA, agenda externa e arquivos no Drive.',
    highlights: [
      { label: 'WhatsApp', value: 'Atendimento + IA' },
      { label: 'Calendar', value: 'Agenda externa' },
      { label: 'Drive', value: 'Arquivos e anexos' },
    ],
    tasks: [
      'Conectar WhatsApp autorizado para atendimento e campanhas.',
      'Sincronizar agenda do Google Calendar por filial ou profissional.',
      'Definir pasta do Google Drive para comprovantes e documentos.',
    ],
  },
  {
    key: 'plano-cobranca',
    href: '/configuracoes/plano-cobranca',
    title: 'Plano e cobrança',
    description: 'Plano contratado, pagamentos, upgrade e notas fiscais.',
    status: 'Admin',
    icon: 'credit-card',
    permission: 'settings.read',
    roles: ['OWNER'],
    summary:
      'Acompanhe o plano atual, gere um fluxo de troca de plano via Asaas, baixe comprovantes e configure dados fiscais do tenant.',
    highlights: [
      { label: 'Plano', value: 'Pro AI' },
      { label: 'Cobrança', value: 'Asaas' },
      { label: 'Fiscal', value: 'Dados de nota' },
    ],
    tasks: [
      'Ver plano contratado, valor e próximo vencimento.',
      'Solicitar troca de plano gerando novo checkout Asaas.',
      'Baixar comprovantes e configurar dados para emissão fiscal.',
    ],
  },
  {
    key: 'preferencias',
    href: '/configuracoes/preferencias',
    title: 'Preferências',
    description: 'Marca, logo, cores, notificações e experiência do usuário.',
    status: 'Por usuário',
    icon: 'palette',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER'],
    summary:
      'Personalize a aparência do workspace com logo, cores da barbearia, preferências de notificação e padrões de experiência.',
    highlights: [
      { label: 'Logo', value: 'Marca da barbearia' },
      { label: 'Cores', value: 'Fonte e destaque' },
      { label: 'Alertas', value: 'Preferências' },
    ],
    tasks: [
      'Enviar logomarca e revisar contraste.',
      'Escolher cor de fonte e cor de destaque do workspace.',
      'Definir preferências de notificações operacionais.',
    ],
  },
] as const satisfies readonly SettingsSection[];

export function getSettingsSection(key: string) {
  return settingsSections.find((section) => section.key === key);
}

export function canAccessSettingsSection(section: SettingsSection, session: SessionContext) {
  return (
    session.permissions.includes(section.permission) &&
    (!section.roles || section.roles.includes(session.role))
  );
}
