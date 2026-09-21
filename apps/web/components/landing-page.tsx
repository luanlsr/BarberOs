import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  Boxes,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  PackageCheck,
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
    text: 'Horarios, profissionais e clientes com leitura rapida.',
  },
  {
    icon: ReceiptText,
    label: 'Comandas integradas',
    text: 'Servicos e produtos conectados ao caixa.',
  },
  {
    icon: Boxes,
    label: 'Estoque conectado',
    text: 'Saldos, alertas e movimentacoes em tempo real.',
  },
  {
    icon: CircleDollarSign,
    label: 'Financeiro visivel',
    text: 'Despesas, repasses e comissoes no mesmo fluxo.',
  },
  { icon: Bot, label: 'Barber AI', text: 'Base para insights e automacoes com permissao.' },
];

const featureCards = [
  {
    icon: CalendarDays,
    title: 'Agenda',
    text: 'Organize horarios, servicos, profissionais e clientes por unidade.',
    tone: 'copper',
  },
  {
    icon: Users,
    title: 'Clientes / CRM',
    text: 'Cadastre contatos, origem e historico para atender com mais contexto.',
    tone: 'green',
  },
  {
    icon: ReceiptText,
    title: 'Comandas',
    text: 'Acompanhe itens, descontos, pagamento e status da venda.',
    tone: 'blue',
  },
  {
    icon: CreditCard,
    title: 'Caixa / PDV',
    text: 'Venda servicos, bebidas, cosmeticos, alimentos e produtos cadastrados.',
    tone: 'copper',
  },
  {
    icon: PackageCheck,
    title: 'Estoque',
    text: 'Controle saldos, movimentos e produtos que exigem reposicao.',
    tone: 'green',
  },
  {
    icon: CircleDollarSign,
    title: 'Financeiro',
    text: 'Veja despesas, entradas, comissoes, repasses e indicadores essenciais.',
    tone: 'blue',
  },
  {
    icon: Scissors,
    title: 'Equipe e servicos',
    text: 'Gerencie barbeiros, recepcao, precos, categorias e duracao.',
    tone: 'copper',
  },
  {
    icon: Bot,
    title: 'Inteligencia operacional',
    text: 'Recursos de IA previstos para apoiar analises e automacoes com permissao.',
    tone: 'violet',
  },
];

const problems = [
  'Agenda espalhada em WhatsApp, papel e memoria da equipe.',
  'Comandas anotadas manualmente, sem ligar venda, caixa e estoque.',
  'Produtos vendidos sem baixa clara no estoque.',
  'Comissao e repasse calculados no fim do dia com risco de erro.',
  'Dono sem visao simples do que entrou, saiu e ficou pendente.',
];

const productScreens = [
  {
    eyebrow: 'Agenda',
    title: 'Atendimentos do dia',
    value: '18 horarios',
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
    value: 'R$ 8.420',
    color: 'green',
    rows: ['Receitas pagas  R$ 9.120', 'Despesas abertas  R$ 700', 'Comissoes  R$ 1.860'],
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
  { icon: CalendarDays, title: 'Agenda', text: 'Cliente marca ou chega na recepcao.' },
  { icon: UserCheck, title: 'Check-in', text: 'A equipe confirma presenca e inicia atendimento.' },
  { icon: ReceiptText, title: 'Comanda', text: 'Servicos e produtos entram na mesma venda.' },
  {
    icon: WalletCards,
    title: 'Pagamento',
    text: 'Caixa, financeiro, estoque e comissao sao atualizados.',
  },
];

const faq = [
  [
    'Preciso instalar alguma coisa?',
    'Nao. O BarberOS roda no navegador e foi pensado como PWA para funcionar bem no celular e no computador.',
  ],
  [
    'Funciona no celular?',
    'Sim. Os fluxos principais foram pensados para smartphone, tablet e desktop.',
  ],
  [
    'Consigo cadastrar varios barbeiros?',
    'Sim. O sistema possui equipe, papeis, filiais e permissoes por usuario.',
  ],
  [
    'Tem controle de produtos e comandas?',
    'Sim. Produtos, estoque, comandas, pagamentos e caixa fazem parte da operacao atual.',
  ],
  [
    'Como funciona o pagamento?',
    'A base de planos e assinaturas ja existe. A etapa de checkout com Asaas deve ser conectada server-side antes de cobrar clientes reais.',
  ],
  [
    'Meus dados ficam separados?',
    'Sim. A arquitetura usa tenants e validacoes server-side para separar os dados de cada barbearia.',
  ],
  [
    'Posso usar em mais de uma filial?',
    'A estrutura de tenants, filiais e usuarios ja existe para evoluir operacoes com varias unidades.',
  ],
  [
    'Existe suporte?',
    'A operacao foi preparada para suporte e administracao pelo Master Admin da plataforma.',
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
        <Link className="brand-lockup landing-brand" href="/" aria-label="BarberOS">
          <span className="brand-mark">B</span>
          <span>
            <span className="brand-name">BarberOS</span>
            <span className="brand-caption">SaaS para barbearias</span>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Navegacao da landing page">
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
            Comecar agora
          </Link>
        </div>
      </header>

      <section className="landing-hero landing-color-band">
        <div className="landing-hero-copy">
          <p className="eyebrow">Operacao, caixa e equipe no mesmo fluxo</p>
          <h1>Transforme a rotina da barbearia em uma operacao organizada.</h1>
          <p className="landing-lead">
            O BarberOS centraliza agenda, clientes, barbeiros, comandas, vendas, estoque, caixa e
            financeiro para o dono enxergar o negocio com clareza antes do fim do dia.
          </p>
          <div className="landing-cta-row">
            <Link
              className="button button-primary landing-cta"
              href={signupHref}
              data-event="hero_cta_click"
            >
              Comecar agora
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="button button-secondary landing-cta" href={demoHref}>
              Ver telas do sistema
            </a>
          </div>
          <div className="landing-trust-row" aria-label="Resumo de beneficios">
            <span>
              <Check size={15} aria-hidden="true" /> Mobile e desktop
            </span>
            <span>
              <Check size={15} aria-hidden="true" /> Dados por barbearia
            </span>
            <span>
              <Check size={15} aria-hidden="true" /> Visao por perfil
            </span>
          </div>
        </div>
        <ProductMockup />
      </section>

      <section className="landing-benefit-strip" aria-label="Beneficios rapidos">
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
          <h2>Quando cada parte da barbearia fica em um lugar, o dono perde visao.</h2>
          <p>
            O BarberOS junta agenda, venda, produto, equipe e financeiro em uma rotina continua.
            Menos retrabalho para a recepcao, mais clareza para o barbeiro e mais controle para o
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
          <h2>Mostre a operacao como ela acontece: agenda, comanda, estoque e dinheiro.</h2>
          <p>
            Os exemplos abaixo usam dados ficticios para apresentar a experiencia sem expor
            informacoes de clientes ou tenants reais.
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
          <h2>Decisao rapida sem abrir dez abas.</h2>
          <p>
            O painel resume movimento, fila de atendimentos, comandas, estoque e financeiro para
            ajudar o dono a corrigir a rota durante o dia.
          </p>
        </div>
        <div className="landing-chart-board" aria-label="Graficos demonstrativos do BarberOS">
          <div className="chart-card revenue">
            <div>
              <span>Receita do mes</span>
              <strong>R$ 24.680</strong>
            </div>
            <MiniBarChart />
          </div>
          <div className="chart-card split">
            <div>
              <span>Servicos mais vendidos</span>
              <strong>Corte, barba e sobrancelha</strong>
            </div>
            <MiniDonut />
          </div>
          <div className="chart-card alerts">
            <span>Alertas operacionais</span>
            <p>
              <Clock3 size={16} aria-hidden="true" /> 2 horarios aguardando confirmacao
            </p>
            <p>
              <Boxes size={16} aria-hidden="true" /> 3 produtos abaixo do minimo
            </p>
            <p>
              <CircleDollarSign size={16} aria-hidden="true" /> 4 comissoes pendentes
            </p>
          </div>
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
          <strong>Recepcao no tablet, barbeiro no celular, dono no desktop.</strong>
          <p>
            A interface foi pensada para rotinas diferentes sem obrigar todo mundo a ver a mesma
            tela.
          </p>
        </div>
        <div className="landing-operator-copy">
          <p className="eyebrow">Visoes por perfil</p>
          <h2>Cada usuario ve o que precisa para trabalhar melhor.</h2>
          <div className="role-list">
            <span>
              <Store size={16} aria-hidden="true" /> Admin acompanha toda a operacao.
            </span>
            <span>
              <Users size={16} aria-hidden="true" /> Recepcao opera agenda, caixa e clientes.
            </span>
            <span>
              <Scissors size={16} aria-hidden="true" /> Barbeiro acompanha atendimentos e ganhos.
            </span>
            <span>
              <ShieldCheck size={16} aria-hidden="true" /> Super admin gerencia tenants e
              assinaturas.
            </span>
          </div>
        </div>
      </section>

      <section className="landing-section" id="recursos">
        <div className="landing-section-heading wide">
          <p className="eyebrow">Tudo em um lugar</p>
          <h2>Recursos para vender, atender, controlar e crescer.</h2>
        </div>
        <div className="landing-feature-grid expanded">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className={`landing-feature-card tone-${feature.tone}`} key={feature.title}>
                <span>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            );
          })}
        </div>
        <div className="landing-inline-cta colorful">
          <div>
            <strong>Pronto para tirar sua operacao do improviso?</strong>
            <p>Comece pela agenda e evolua para comandas, estoque, financeiro e equipe.</p>
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
          <p>Os valores abaixo sao carregados da estrutura de planos do sistema.</p>
        </div>
        <div className="landing-pricing-grid" data-event="pricing_view">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} searchParams={searchParams} />
          ))}
        </div>
      </section>

      <section className="landing-section landing-security">
        <div>
          <p className="eyebrow">Seguranca</p>
          <h2>Dados separados por barbearia e acesso por perfil.</h2>
          <p>
            Cada barbearia opera em seu proprio tenant. Usuarios acessam apenas o que o perfil e as
            permissoes liberam, com validacao no servidor para proteger a operacao.
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
        <p>Centralize a operacao, acompanhe os numeros e de mais clareza para sua equipe.</p>
        <Link
          className="button button-primary landing-cta"
          href={signupHref}
          data-event="final_cta_click"
        >
          Comecar agora
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="brand-lockup landing-brand">
          <span className="brand-mark">B</span>
          <span>
            <span className="brand-name">BarberOS</span>
            <span className="brand-caption">Operacao inteligente para barbearias</span>
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
          Comecar agora
        </Link>
      </div>
    </main>
  );
}

function ProductMockup() {
  return (
    <aside className="landing-product-mockup" aria-label="Previa visual do BarberOS">
      <div className="mockup-topbar">
        <span />
        <strong>Operacao de hoje</strong>
        <BellRing size={16} aria-hidden="true" />
      </div>
      <div className="mockup-kpis">
        <span>
          <strong>R$ 2.480</strong>Caixa
        </span>
        <span>
          <strong>18</strong>Agenda
        </span>
        <span>
          <strong>6</strong>Comandas
        </span>
      </div>
      <div className="mockup-board">
        <div>
          <LayoutDashboard size={18} aria-hidden="true" />
          <strong>Operacao em tempo real</strong>
          <p>Proximos horarios, comandas abertas e alertas de estoque.</p>
        </div>
        <div className="mockup-row">
          <span>09:00</span>
          <strong>Corte + barba</strong>
          <em>Confirmado</em>
        </div>
        <div className="mockup-row">
          <span>10:30</span>
          <strong>Produto vendido</strong>
          <em>Estoque</em>
        </div>
        <div className="mockup-row">
          <span>12:15</span>
          <strong>Comissao gerada</strong>
          <em>Financeiro</em>
        </div>
      </div>
      <div className="mockup-insight">
        <Bot size={18} aria-hidden="true" />
        <span>Insight: dois produtos estao proximos do minimo para o fim de semana.</span>
      </div>
    </aside>
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
        <span>/{plan.billingInterval === 'YEARLY' ? 'ano' : 'mes'}</span>
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
      'Sistema de gestao para barbearias com agenda, clientes, comandas, estoque, caixa e financeiro.',
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: (plan.priceAmountCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      category: plan.billingInterval === 'YEARLY' ? 'annual' : 'monthly',
    })),
  };
}
