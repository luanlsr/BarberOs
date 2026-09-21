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

const entitlementCopy: Record<string, string> = {
  'core.operations': 'Agenda, clientes, equipe, servicos e comandas em um unico lugar',
  'pos.retail': 'Vendas de servicos e produtos com controle de caixa',
  inventory: 'Estoque integrado as vendas e movimentacoes',
  finance: 'Financeiro, despesas, comissoes e repasses',
  ai: 'Barber AI para apoiar analises e automacoes operacionais',
  'multi.branch': 'Gestao de multiplas unidades e equipes maiores',
};

const fallbackPlans: PublicPlan[] = [
  {
    id: 'fallback-essential',
    code: 'essential',
    name: 'Essencial',
    description: 'Para barbearias que querem organizar agenda, clientes e operacao diaria.',
    priceAmountCents: 9900,
    billingInterval: 'MONTHLY',
    featured: false,
    features: [
      'Agenda, clientes, equipe, servicos e comandas em um unico lugar',
      'Vendas de servicos e produtos com controle de caixa',
      'Estoque integrado as vendas e movimentacoes',
    ],
  },
  {
    id: 'fallback-pro-ai',
    code: 'pro-ai',
    name: 'Pro AI',
    description: 'Operacao completa com financeiro, comissoes e recursos de inteligencia.',
    priceAmountCents: 19900,
    billingInterval: 'MONTHLY',
    featured: true,
    features: [
      'Tudo do Essencial',
      'Financeiro, despesas, comissoes e repasses',
      'Barber AI para apoiar analises e automacoes operacionais',
    ],
  },
  {
    id: 'fallback-scale',
    code: 'scale',
    name: 'Scale',
    description: 'Para redes e operacoes com mais unidades, usuarios e governanca.',
    priceAmountCents: 39900,
    billingInterval: 'MONTHLY',
    featured: false,
    features: [
      'Tudo do Pro AI',
      'Gestao de multiplas unidades e equipes maiores',
      'Visao administrativa para crescimento da operacao',
    ],
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
    const features = featureRows
      .filter((feature) => text(feature.plan_id) === text(plan.id))
      .map((feature) => entitlementCopy[text(feature.entitlement_code)])
      .filter((feature): feature is string => Boolean(feature));

    return {
      id: text(plan.id),
      code,
      name: text(plan.name, 'Plano'),
      description: text(plan.description, 'Plano para organizar a operacao da barbearia.'),
      priceAmountCents: number(plan.price_amount_cents),
      billingInterval: text(plan.billing_interval) === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      featured: code === 'pro-ai',
      features: features.length ? features : ['Recursos principais do BarberOS incluidos'],
    } satisfies PublicPlan;
  });
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}
