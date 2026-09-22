import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { LandingAnalytics } from './landing-analytics';
import type { PublicPlan } from '../lib/public-plans';

type LandingPageProps = {
  plans: PublicPlan[];
  searchParams?: Record<string, string | string[] | undefined>;
};

const quickBenefits = [
  {
    icon: CalendarDays,
    label: 'Agenda inteligente',
    text: 'Horários, profissionais e clientes com leitura rápida.',
  },
  {
    icon: ReceiptText,
    label: 'Comandas integradas',
    text: 'Serviços e produtos conectados ao caixa.',
  },
  {
    icon: Boxes,
    label: 'Estoque conectado',
    text: 'Saldos, alertas e movimentações em tempo real.',
  },
  {
    icon: CircleDollarSign,
    label: 'Financeiro visível',
    text: 'Entradas, despesas, comissões e repasses em tempo real.',
  },
  { icon: Bot, label: 'Barber AI', text: 'Base para insights e automações com permissão.' },
];

const benefitStories = [
  {
    icon: CalendarDays,
    title: 'A barbearia começa o dia sabendo o que vai acontecer.',
    text: 'Agenda, clientes e equipe ficam conectados para a recepção confirmar horários, fazer check-in e abrir a comanda sem retrabalho.',
    highlights: [
      'Agenda por profissional',
      'Cliente com histórico',
      'Check-in direto para Comanda',
    ],
    metric: 'Até 3 cliques do cliente chegar à venda',
    tone: 'copper',
  },
  {
    icon: ReceiptText,
    title: 'Cada atendimento vira venda registrada do jeito certo.',
    text: 'Serviços, produtos, descontos e pagamentos entram no mesmo fluxo. O estoque baixa quando o produto sai, e o caixa já nasce conferível.',
    highlights: ['Comandas e PDV', 'Produtos e estoque', 'Caixa com sangria e reforço'],
    metric: 'Menos anotação manual no balcão',
    tone: 'green',
  },
  {
    icon: WalletCards,
    title: 'O dono acompanha dinheiro, comissões e repasses em tempo real.',
    text: 'O financeiro mostra receitas, despesas, comissões, descontos de funcionários e previsão de recebimento antes do fechamento do mês.',
    highlights: ['Financeiro por período', 'Despesas e comissões', 'Salário e repasse previstos'],
    metric: 'Previsão do mês sempre atualizada',
    tone: 'blue',
  },
  {
    icon: ShieldCheck,
    title: 'Cada pessoa vê só o que precisa para trabalhar melhor.',
    text: 'Admin, recepção e barbeiro têm visões diferentes. Em redes, a base já está preparada para múltiplas unidades e IA futura.',
    highlights: ['Permissões por perfil', 'Multiunidades', 'Barber AI em evolução'],
    metric: 'Mais controle sem travar a operação',
    tone: 'violet',
  },
];
const problems = [
  'Agenda espalhada em WhatsApp, papel e memória da equipe.',
  'Comandas anotadas manualmente, sem ligar venda, caixa e estoque.',
  'Produtos vendidos sem baixa clara no estoque.',
  'Comissão, desconto e salário calculados no fim do mês com risco de erro.',
  'Dono sem saber em tempo real quanto entrou, saiu e quanto ainda vai receber.',
];

const productScreens = [
  {
    eyebrow: 'Agenda',
    title: 'Atendimentos do dia',
    value: '18 horários',
    color: 'copper',
    rows: [
      '09:00  Corte + Barba  Confirmado',
      '10:30  Degrade  Em atendimento',
      '14:00  Sobrancelha  Pendente',
    ],
  },
  {
    eyebrow: 'Comandas',
    title: 'Venda em andamento',
    value: 'R$ 176,00',
    color: 'blue',
    rows: ['Corte masculino  R$ 55', 'Pomada modeladora  R$ 49', 'Pagamento PIX  Aguardando'],
  },
  {
    eyebrow: 'Financeiro',
    title: 'Resumo da unidade',
    value: 'R$ 18.740',
    color: 'green',
    rows: [
      'Recebível do mês  R$ 18.740',
      'Comissões previstas  R$ 4.180',
      'Despesas e descontos  R$ 3.240',
    ],
  },
  {
    eyebrow: 'Estoque',
    title: 'Produtos acompanhados',
    value: '3 alertas',
    color: 'violet',
    rows: ['Pomada matte  Baixo', 'Shampoo barba  OK', 'Balm pos-barba  Repor'],
  },
];

const workflowItems = [
  { icon: CalendarDays, title: 'Agenda', text: 'Cliente marca ou chega na recepção.' },
  { icon: UserCheck, title: 'Check-in', text: 'A equipe confirma presença e inicia atendimento.' },
  { icon: ReceiptText, title: 'Comanda', text: 'Serviços e produtos entram na mesma venda.' },
  {
    icon: WalletCards,
    title: 'Pagamento',
    text: 'Caixa, estoque, financeiro, comissão e repasse são atualizados na hora.',
  },
];

const financeHighlights = [
  {
    icon: CircleDollarSign,
    title: 'Receita em tempo real',
    text: 'Cada corte, barba, produto e pagamento alimenta o financeiro sem depender de planilha no fim do dia.',
  },
  {
    icon: WalletCards,
    title: 'Comissões e repasses',
    text: 'O dono acompanha quanto cada barbeiro produziu, quanto tem a receber e quais repasses ainda estão pendentes.',
  },
  {
    icon: ReceiptText,
    title: 'Descontos e salário',
    text: 'Registre adiantamentos, descontos e despesas para chegar ao valor certo do funcionário no fechamento.',
  },
  {
    icon: Clock3,
    title: 'Menos horas de conferência',
    text: 'O caixa, o estoque e as comissões conversam entre si, reduzindo retrabalho e erro manual todo mês.',
  },
];

const faq = [
  [
    'Preciso instalar alguma coisa?',
    'Não. O BarberOS roda no navegador e foi pensado como PWA para funcionar bem no celular e no computador.',
  ],
  [
    'Funciona no celular?',
    'Sim. Os fluxos principais foram pensados para smartphone, tablet e desktop.',
  ],
  [
    'Consigo cadastrar vários barbeiros?',
    'Sim. O sistema possui equipe, papeis, filiais e permissões por usuário.',
  ],
  [
    'Tem controle de produtos e comandas?',
    'Sim. Produtos, estoque, comandas, pagamentos e caixa fazem parte da operação atual.',
  ],
  [
    'Como funciona o pagamento?',
    'A base de planos e assinaturas já existe. A etapa de checkout com Asaas deve ser conectada server-side antes de cobrar clientes reais.',
  ],
  [
    'Meus dados ficam separados?',
    'Sim. Cada barbearia opera com dados separados e validações server-side para proteger a operação.',
  ],
  [
    'Posso usar em mais de uma filial?',
    'A estrutura de filiais, equipes e usuários já existe para evoluir operações com várias unidades.',
  ],
  [
    'Existe suporte?',
    'A operação foi preparada para suporte, configuração e acompanhamento seguro da barbearia.',
  ],
];

const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function LandingPage({ plans, searchParams = {} }: Readonly<LandingPageProps>) {
  const signupHref = withMarketingParams('/login?intent=signup', searchParams);
  const demoHref = '#produto';
  const structuredData = buildStructuredData(plans);

  return (
    <main className="landing-page">
      <LandingAnalytics />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="BarberOS">
          <BrandLogo />
        </Link>
        <nav className="landing-nav" aria-label="Navegação da landing page">
          <a href="#recursos">Recursos</a>
          <a href="#produto">Produto</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="button button-ghost" href="/login" data-event="login_click">
            Entrar
          </Link>
          <Link className="button button-primary" href={signupHref} data-event="hero_cta_click">
            Começar agora
          </Link>
        </div>
      </header>

      <section className="landing-hero landing-color-band">
        <div className="landing-hero-copy">
          <p className="eyebrow">Operação, caixa e equipe no mesmo fluxo</p>
          <h1>Transforme a rotina da barbearia em uma operação organizada.</h1>
          <p className="landing-lead">
            O BarberOS centraliza agenda, clientes, barbeiros, comandas, vendas, estoque, caixa e
            financeiro para o dono enxergar o negócio com clareza antes do fim do dia.
          </p>
          <div className="landing-cta-row">
            <Link
              className="button button-primary landing-cta"
              href={signupHref}
              data-event="hero_cta_click"
            >
              Começar agora
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="button button-secondary landing-cta" href={demoHref}>
              Ver telas do sistema
            </a>
          </div>
          <div className="landing-trust-row" aria-label="Resumo de benefícios">
            <span>
              <Check size={15} aria-hidden="true" /> Mobile e desktop
            </span>
            <span>
              <Check size={15} aria-hidden="true" /> Dados por barbearia
            </span>
            <span>
              <Check size={15} aria-hidden="true" /> Visão por perfil
            </span>
          </div>
        </div>
      </section>

      <section className="landing-benefit-strip" aria-label="Beneficios rápidos">
        {quickBenefits.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label}>
              <Icon size={19} aria-hidden="true" />
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </article>
          );
        })}
      </section>

      <section className="landing-section landing-problem-section">
        <div>
          <p className="eyebrow">O problema</p>
          <h2>Quando cada parte da barbearia fica em um lugar, o dono perde visão.</h2>
          <p>
            O BarberOS junta agenda, venda, produto, equipe e financeiro em uma rotina contínua.
            Menos retrabalho para a recepção, mais clareza para o barbeiro e mais controle para o
            dono.
          </p>
          <Link className="button button-primary" href={signupHref} data-event="problem_cta_click">
            Quero organizar minha barbearia
          </Link>
        </div>
        <div className="landing-problem-list">
          {problems.map((problem) => (
            <div key={problem}>
              <BadgeCheck size={18} aria-hidden="true" />
              <span>{problem}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-showcase-section" id="produto">
        <div className="landing-section-heading wide">
          <p className="eyebrow">Telas do produto</p>
          <h2>Mostre a operação como ela acontece: agenda, comanda, estoque e dinheiro.</h2>
          <p>
            Os exemplos abaixo usam dados fictícios para apresentar a experiência sem expor
            informações de clientes ou barbearias reais.
          </p>
        </div>
        <div className="landing-screen-grid">
          {productScreens.map((screen) => (
            <ProductScreen key={screen.title} screen={screen} />
          ))}
        </div>
      </section>

      <section className="landing-section landing-dashboard-story">
        <div className="landing-section-heading">
          <p className="eyebrow">Painel do dono</p>
          <h2>Decisão rápida sem abrir dez abas.</h2>
          <p>
            O painel resume movimento, fila de atendimentos, comandas, estoque e financeiro para
            ajudar o dono a corrigir a rota durante o dia.
          </p>
        </div>
        <div className="landing-chart-board" aria-label="Gráficos demonstrativos do BarberOS">
          <div className="chart-card revenue">
            <div>
              <span>Receita do mês</span>
              <strong>R$ 24.680</strong>
            </div>
            <MiniBarChart />
          </div>
          <div className="chart-card split">
            <div>
              <span>Serviços mais vendidos</span>
              <strong>Corte, barba e sobrancelha</strong>
            </div>
            <MiniDonut />
          </div>
          <div className="chart-card alerts">
            <span>Alertas operacionais</span>
            <p>
              <Clock3 size={16} aria-hidden="true" /> 2 horários aguardando confirmação
            </p>
            <p>
              <Boxes size={16} aria-hidden="true" /> 3 produtos abaixo do mínimo
            </p>
            <p>
              <CircleDollarSign size={16} aria-hidden="true" /> 4 comissões pendentes
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-finance-focus" id="financeiro">
        <div className="landing-finance-copy">
          <p className="eyebrow">Gestão financeira</p>
          <h2>
            Saiba quanto a barbearia vai receber no fim do mês enquanto o mês ainda está
            acontecendo.
          </h2>
          <p>
            A cada corte feito, produto vendido ou pagamento recebido, o BarberOS atualiza caixa,
            estoque, comissão e resultado. O admin consegue acompanhar despesas, descontos de
            funcionários, repasses, previsão de salário e dinheiro pendente sem esperar fechamento
            manual.
          </p>
          <div
            className="landing-finance-metrics"
            aria-label="Indicadores financeiros demonstrativos"
          >
            <span>
              <strong>R$ 42.850</strong>
              Recebível previsto
            </span>
            <span>
              <strong>R$ 8.940</strong>
              Comissões do mês
            </span>
            <span>
              <strong>6h+</strong>
              Economia semanal em conferência
            </span>
          </div>
        </div>
        <div className="landing-finance-card-grid">
          {financeHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={20} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="landing-section landing-workflow" id="funciona">
        <div className="landing-section-heading wide">
          <p className="eyebrow">Fluxo operacional</p>
          <h2>Da agenda ao pagamento, tudo segue o mesmo caminho.</h2>
        </div>
        <div className="landing-workflow-grid">
          {workflowItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <span className="workflow-number">{index + 1}</span>
                <Icon size={22} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section landing-operator-section">
        <div className="landing-device-card">
          <Smartphone size={26} aria-hidden="true" />
          <strong>Recepção no tablet, barbeiro no celular, dono no desktop.</strong>
          <p>
            A interface foi pensada para rotinas diferentes sem obrigar todo mundo a ver a mesma
            tela.
          </p>
        </div>
        <div className="landing-operator-copy">
          <p className="eyebrow">Visões por perfil</p>
          <h2>Cada usuário vê o que precisa para trabalhar melhor.</h2>
          <div className="role-list">
            <span>
              <Store size={16} aria-hidden="true" /> Admin acompanha toda a operação.
            </span>
            <span>
              <Users size={16} aria-hidden="true" /> Recepção opera agenda, caixa e clientes.
            </span>
            <span>
              <Scissors size={16} aria-hidden="true" /> Barbeiro acompanha atendimentos e ganhos.
            </span>
            <span>
              <ShieldCheck size={16} aria-hidden="true" /> Admin gerencia unidades, equipe e
              permissões.
            </span>
          </div>
        </div>
      </section>

      <section className="landing-section landing-benefit-story-section" id="recursos">
        <div className="landing-section-heading wide">
          <p className="eyebrow">Como o BarberOS trabalha por você</p>
          <h2>Menos conferência no fim do dia. Mais controle enquanto a barbearia acontece.</h2>
          <p>
            Em vez de abrir uma tela para cada problema, o BarberOS conecta a rotina inteira:
            agenda, venda, estoque, caixa, equipe e financeiro conversam no mesmo fluxo.
          </p>
        </div>
        <div className="landing-feature-visual">
          <Image
            src="/landing/barberos-devices.png"
            alt="BarberOS em notebook e celular mostrando agenda, comandas, financeiro e próximos passos"
            width={1680}
            height={945}
            sizes="(max-width: 1280px) 100vw, 1180px"
          />
        </div>
        <div className="landing-benefit-story-grid">
          {benefitStories.map((story) => {
            const Icon = story.icon;
            return (
              <article className={`landing-benefit-story tone-${story.tone}`} key={story.title}>
                <div className="benefit-story-icon">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <h3>{story.title}</h3>
                  <p>{story.text}</p>
                </div>
                <ul>
                  {story.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                <strong>{story.metric}</strong>
              </article>
            );
          })}
        </div>
        <div className="landing-operation-ribbon" aria-label="Fluxo resumido da operação">
          <span>Agenda</span>
          <ArrowRight size={16} aria-hidden="true" />
          <span>Comanda</span>
          <ArrowRight size={16} aria-hidden="true" />
          <span>Pagamento</span>
          <ArrowRight size={16} aria-hidden="true" />
          <span>Estoque e financeiro atualizados</span>
        </div>
        <div className="landing-inline-cta colorful">
          <div>
            <strong>Pronto para tirar sua operação do improviso?</strong>
            <p>
              Comece simples e evolua para uma gestão com caixa, estoque, repasses e
              previsibilidade.
            </p>
          </div>
          <Link className="button button-primary" href={signupHref} data-event="features_cta_click">
            Testar agora
          </Link>
        </div>
      </section>

      <section className="landing-section" id="planos">
        <div className="landing-section-heading wide">
          <p className="eyebrow">Planos</p>
          <h2>Escolha um plano para o momento da sua barbearia.</h2>
          <p>
            O plano de entrada organiza a operação. O Financeiro Pro é o melhor custo-benefício para
            donos que querem previsibilidade de caixa, repasses e lucro.
          </p>
        </div>
        <div className="landing-pricing-grid" data-event="pricing_view">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} searchParams={searchParams} />
          ))}
        </div>
      </section>

      <section className="landing-section landing-security">
        <div>
          <p className="eyebrow">Segurança</p>
          <h2>Dados separados por barbearia e acesso por perfil.</h2>
          <p>
            Cada barbearia opera com dados separados. Usuários acessam apenas o que o perfil e as
            permissões liberam, com validação no servidor para proteger a operação.
          </p>
        </div>
        <ShieldCheck size={64} aria-hidden="true" />
      </section>

      <section className="landing-section" id="faq">
        <div className="landing-section-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Perguntas frequentes</h2>
        </div>
        <div className="landing-faq-list">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <Sparkles size={24} aria-hidden="true" />
        <h2>Pare de administrar sua barbearia no improviso.</h2>
        <p>Centralize a operação, acompanhe os números e dê mais clareza para sua equipe.</p>
        <Link
          className="button button-primary landing-cta"
          href={signupHref}
          data-event="final_cta_click"
        >
          Começar agora
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="brand-lockup landing-brand">
          <span className="brand-mark">B</span>
          <span>
            <span className="brand-name">BarberOS</span>
            <span className="brand-caption">Operação inteligente para barbearias</span>
          </span>
        </div>
        <div>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link href="/login">Login</Link>
        </div>
      </footer>

      <div className="landing-mobile-cta">
        <Link
          className="button button-primary"
          href={signupHref}
          data-event="mobile_sticky_cta_click"
        >
          Começar agora
        </Link>
      </div>
    </main>
  );
}

function ProductScreen({ screen }: Readonly<{ screen: (typeof productScreens)[number] }>) {
  return (
    <article className={`landing-screen-card tone-${screen.color}`}>
      <div className="screen-window-bar">
        <span />
        <span />
        <span />
      </div>
      <div className="screen-card-header">
        <span>{screen.eyebrow}</span>
        <strong>{screen.value}</strong>
      </div>
      <h3>{screen.title}</h3>
      <div className="screen-lines">
        {screen.rows.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
    </article>
  );
}

function MiniBarChart() {
  return (
    <div className="mini-bars" aria-hidden="true">
      {[38, 56, 44, 72, 64, 88, 78].map((height, index) => (
        <span key={index} style={{ '--bar-height': `${height}%` } as React.CSSProperties} />
      ))}
    </div>
  );
}

function MiniDonut() {
  return (
    <div className="mini-donut" aria-hidden="true">
      <span>72%</span>
    </div>
  );
}

function PlanCard({
  plan,
  searchParams,
}: Readonly<{ plan: PublicPlan; searchParams: LandingPageProps['searchParams'] }>) {
  const href = withMarketingParams(
    `/login?intent=signup&plan=${encodeURIComponent(plan.code)}`,
    searchParams ?? {},
  );
  return (
    <article className={`landing-plan-card ${plan.featured ? 'is-featured' : ''}`}>
      {plan.featured ? <span className="landing-plan-badge">Mais escolhido</span> : null}
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <div className="landing-plan-price">
        <strong>{formatCurrency(plan.priceAmountCents)}</strong>
        <span>/{plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}</span>
      </div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check size={16} aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        className={`button ${plan.featured ? 'button-primary' : 'button-secondary'}`}
        href={href}
        data-event="pricing_plan_click"
        data-plan={plan.code}
      >
        Escolher este plano
      </Link>
    </article>
  );
}

function withMarketingParams(
  baseHref: string,
  searchParams: Record<string, string | string[] | undefined>,
) {
  const [path, query = ''] = baseHref.split('?');
  const params = new URLSearchParams(query);
  for (const key of utmKeys) {
    const value = searchParams[key];
    if (typeof value === 'string' && value) params.set(key, value);
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

function buildStructuredData(plans: PublicPlan[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BarberOS',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Sistema de gestão para barbearias com agenda, clientes, comandas, estoque, caixa e financeiro.',
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: (plan.priceAmountCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      category: plan.billingInterval === 'YEARLY' ? 'annual' : 'monthly',
    })),
  };
}
