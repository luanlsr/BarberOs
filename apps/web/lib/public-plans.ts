import { createClient } from '@supabase/supabase-js';
import { parseServerEnv } from '@barberos/config';

type Row = Record<string, unknown>;

export type PublicPlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceAmountCents: number;
  billingInterval: 'MONTHLY' | 'YEARLY';
  featured: boolean;
  features: string[];
};

type MarketingPlanCopy = Pick<
  PublicPlan,
  'name' | 'description' | 'priceAmountCents' | 'featured' | 'features'
>;

const entitlementCopy: Record<string, string> = {
  'core.operations': 'Agenda, clientes, equipe, serviços e comandas em um único lugar',
  'pos.retail': 'Vendas de serviços e produtos com controle de caixa',
  inventory: 'Produtos e estoque com baixa automática a cada venda',
  finance: 'Gestão financeira com despesas, comissões, descontos e repasses',
  ai: 'Barber AI em preparação para insights e automações com permissão',
  'multi.branch': 'Gestão de múltiplas unidades e equipes maiores',
};

const marketingPlanCopy: Record<string, MarketingPlanCopy> = {
  essential: {
    name: 'Gestão Essencial',
    description: 'Para organizar a barbearia sem financeiro: agenda, equipe, clientes e estoque.',
    priceAmountCents: 5990,
    featured: false,
    features: [
      'Agenda, clientes, equipe, serviços e comandas em um único lugar',
      'Produtos e estoque com baixa automática a cada venda',
      'Caixa operacional para registrar serviços e produtos vendidos',
      'Visão por perfil para admin, recepção e barbeiros',
    ],
  },
  'pro-ai': {
    name: 'Financeiro Pro',
    description:
      'Para donos que querem saber, em tempo real, quanto entrou, saiu e será repassado.',
    priceAmountCents: 12990,
    featured: true,
    features: [
      'Tudo do Gestão Essencial',
      'Financeiro com receitas, despesas, resultado e contas pendentes',
      'Comissões, repasses, descontos de funcionários e previsão de salário',
      'Relatórios para saber quanto receber no fim do mês a cada corte e produto vendido',
    ],
  },
  scale: {
    name: 'Rede + IA',
    description:
      'Para operações com muitas lojas, governança e recursos de inteligência em evolução.',
    priceAmountCents: 24990,
    featured: false,
    features: [
      'Tudo do Financeiro Pro',
      'Gestão de múltiplas unidades, equipes e permissões avançadas',
      'Gestão por unidade com equipes, permissões e acompanhamento de crescimento',
      'Barber AI em preparação para análises e automações futuras',
    ],
  },
};

const fallbackPlans: PublicPlan[] = [
  {
    id: 'fallback-essential',
    code: 'essential',
    billingInterval: 'MONTHLY',
    ...marketingPlanCopy.essential,
  },
  {
    id: 'fallback-finance-pro',
    code: 'pro-ai',
    billingInterval: 'MONTHLY',
    ...marketingPlanCopy['pro-ai'],
  },
  {
    id: 'fallback-scale',
    code: 'scale',
    billingInterval: 'MONTHLY',
    ...marketingPlanCopy.scale,
  },
];

export async function getPublicPlans(): Promise<PublicPlan[]> {
  let env: ReturnType<typeof parseServerEnv>;
  try {
    env = parseServerEnv(process.env);
  } catch {
    return fallbackPlans;
  }

  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) return fallbackPlans;

  const supabase = createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: plans, error: planError }, { data: entitlements }] = await Promise.all([
    supabase
      .from('saas_plans')
      .select('id, code, name, description, price_amount_cents, billing_interval, status')
      .eq('status', 'ACTIVE')
      .order('price_amount_cents', { ascending: true }),
    supabase.from('plan_entitlements').select('plan_id, entitlement_code, enabled, limit_value'),
  ]);

  if (planError || !plans?.length) return fallbackPlans;

  const featureRows = ((entitlements ?? []) as Row[]).filter((row) => Boolean(row.enabled));
  return ((plans ?? []) as Row[]).map((plan) => {
    const code = text(plan.code);
    const marketing = marketingPlanCopy[code];
    const features = featureRows
      .filter((feature) => text(feature.plan_id) === text(plan.id))
      .map((feature) => entitlementCopy[text(feature.entitlement_code)])
      .filter((feature): feature is string => Boolean(feature));

    return {
      id: text(plan.id),
      code,
      name: marketing?.name ?? text(plan.name, 'Plano'),
      description:
        marketing?.description ??
        text(plan.description, 'Plano para organizar a operação da barbearia.'),
      priceAmountCents: marketing?.priceAmountCents ?? number(plan.price_amount_cents),
      billingInterval: text(plan.billing_interval) === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      featured: marketing?.featured ?? code === 'pro-ai',
      features:
        marketing?.features ??
        (features.length ? features : ['Recursos principais do BarberOS incluídos']),
    } satisfies PublicPlan;
  });
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}
