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
    roles: ['OWNER', 'MANAGER', 'PLATFORM_MASTER'],
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
    roles: ['OWNER', 'PLATFORM_MASTER'],
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
    description: 'Sessões, políticas de acesso, auditoria e proteção de dados.',
    status: 'Obrigatório',
    icon: 'shield',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER', 'PLATFORM_MASTER'],
    summary:
      'Acompanhe políticas de acesso, sessões, auditoria e proteção de dados sensíveis do workspace.',
    highlights: [
      { label: 'Auth', value: 'Supabase Auth' },
      { label: 'Auditoria', value: 'Eventos críticos' },
      { label: 'Isolamento', value: 'Tenant e filial' },
    ],
    tasks: [
      'Revisar sessões e acessos ativos.',
      'Acompanhar eventos sensíveis em trilhas de auditoria.',
      'Manter políticas de acesso compatíveis com LGPD e operação interna.',
    ],
  },
  {
    key: 'integracoes',
    href: '/configuracoes/integracoes',
    title: 'Integrações',
    description: 'Supabase, WhatsApp, pagamentos, agenda externa e webhooks.',
    status: 'Em preparação',
    icon: 'link',
    permission: 'settings.read',
    roles: ['OWNER', 'PLATFORM_MASTER'],
    summary:
      'Centralize integrações técnicas e operacionais como WhatsApp, pagamentos, agenda externa, webhooks e serviços da plataforma.',
    highlights: [
      { label: 'Pagamentos', value: 'Asaas checkout' },
      { label: 'Mensageria', value: 'WhatsApp futuro' },
      { label: 'Eventos', value: 'Webhooks e outbox' },
    ],
    tasks: [
      'Conferir credenciais e status das integrações habilitadas.',
      'Preparar WhatsApp e agenda externa quando os módulos forem liberados.',
      'Monitorar webhooks e falhas de entrega em operações críticas.',
    ],
  },
  {
    key: 'plano-cobranca',
    href: '/configuracoes/plano-cobranca',
    title: 'Plano e cobrança',
    description: 'Assinatura SaaS, limites, entitlements e notas fiscais.',
    status: 'Admin',
    icon: 'credit-card',
    permission: 'settings.read',
    roles: ['OWNER', 'PLATFORM_MASTER'],
    summary:
      'Veja o plano contratado, limites do workspace, recursos habilitados e preparação para cobrança recorrente SaaS.',
    highlights: [
      { label: 'Plano', value: 'Entitlements ativos' },
      { label: 'Cobrança', value: 'Asaas em configuração' },
      { label: 'Fiscal', value: 'Notas futuras' },
    ],
    tasks: [
      'Validar quais módulos estão liberados para o tenant.',
      'Preparar checkout e cobrança recorrente de assinatura.',
      'Acompanhar limites de uso antes de liberar recursos premium.',
    ],
  },
  {
    key: 'preferencias',
    href: '/configuracoes/preferencias',
    title: 'Preferências',
    description: 'Tema, notificações, idioma, formato monetário e experiência.',
    status: 'Por usuário',
    icon: 'palette',
    permission: 'settings.read',
    roles: ['OWNER', 'MANAGER', 'PLATFORM_MASTER'],
    summary:
      'Ajuste preferências de experiência para o usuário e padrões operacionais do workspace sem alterar regras sensíveis.',
    highlights: [
      { label: 'Tema', value: 'Light, dark e system' },
      { label: 'Idioma', value: 'pt-BR' },
      { label: 'Moeda', value: 'BRL' },
    ],
    tasks: [
      'Ajustar tema e experiência visual do usuário.',
      'Definir padrões de notificação operacionais.',
      'Manter idioma e formato monetário alinhados ao Brasil.',
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
