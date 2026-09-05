# AGENTS.md - BarberOS

Este arquivo orienta agentes trabalhando no projeto **BarberOS**, uma plataforma SaaS B2B2C multi-tenant para gestao inteligente de barbearias no Brasil.

## Fontes de Verdade

Antes de tomar decisoes relevantes, consulte os documentos em `specs/`:

- `specs/prd.md`: visao do produto, personas, modulos, regras de negocio e prioridades.
- `specs/architecture.md`: arquitetura tecnica, limites de dominio, seguranca, IA, dados e sequencia de implementacao.
- `specs/design.md`: UX/UI, PWA, mobile first, design system, navegacao e telas prioritarias.
- `PRODUCT_COMPLETION_ROADMAP.md`: roadmap operacional pos-PRD para conduzir os proximos OpenSpec changes ate o produto completo.

Nao altere essas specs sem pedido explicito. Quando uma decisao nao estiver documentada, registre a premissa no artefato que estiver criando e prefira uma escolha conservadora, reversivel e alinhada ao monolito modular.
O roadmap pode ser atualizado como artefato de planejamento quando o usuario pedir ajuste de sequencia, escopo, entregaveis ou estrategia de implementacao.

## Stack Alvo

- Monorepo com `apps/web`, `apps/worker` e `apps/ai`.
- `apps/web`: Next.js + TypeScript para UI, API, domain/application layer, webhooks, Tool Gateway e Master Admin.
- `apps/worker`: Node.js + TypeScript para outbox, jobs, notificacoes, campanhas, WhatsApp e recalcule assíncrono.
- `apps/ai`: FastAPI + Python para Barber AI, orchestrator, prompts, providers, policies e function calling.
- Banco: PostgreSQL/Supabase.
- Auth: Supabase Auth.
- Storage: Supabase Storage.
- Cache/queue/rate limit/locks: Redis.
- Deploy alvo: Vercel para web; Railway para worker e AI.

## Sequencia Preferida

Siga a ordem arquitetural salvo quando o usuario pedir outra coisa:

1. Foundation: monorepo, Supabase, auth, tenant, branch, membership, RBAC, permissions e audit.
2. Core Operations: professionals, services, customers, schedules e appointments.
3. POS: catalog, products, orders, order items, payments e cash register.
4. Money: expenses, financial entries, commissions e payouts.
5. Infrastructure: Redis, outbox, worker e jobs.
6. AI: FastAPI, Tool Registry, Tool Gateway, conversations e AI audit.
7. Communication: WhatsApp, messaging e campaigns.

Para planejamento completo do produto, use `PRODUCT_COMPLETION_ROADMAP.md` como trilha de execucao apos o PRD. Ao criar novos OpenSpec changes, preserve a ordem sugerida no roadmap, exceto quando houver decisao explicita do usuario.

## Regras Arquiteturais

- Comece com **modular monolith**, nao microsservicos, exceto `apps/ai`.
- Route handlers do Next.js sao adaptadores finos. Regra de negocio fica em application/domain services.
- Modulos devem ter fronteiras claras, preferencialmente `domain/`, `application/`, `infrastructure/` e `presentation/`.
- Domain layer nao conhece Next.js, React, Supabase SDK, Redis, OpenAI ou WhatsApp.
- Toda operacao autenticada deve usar `RequestContext` com `userId`, `tenantId`, `membershipId`, `role`, `permissions` e `branchScope`.
- Toda entidade operacional relevante deve ter `tenant_id`; quando aplicavel, tambem `branch_id`.
- Nunca confie em `tenant_id` vindo do navegador sem validar membership e escopo.
- Authorization e entitlements devem ser validados server-side.
- Nunca envie Supabase service role ou secrets ao cliente.
- Use RLS como defesa adicional, nao como unica camada de isolamento.
- Use migrations versionadas para alteracoes de banco.

## Invariantes de Dominio

- Agendamentos usam status: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- Mudancas importantes de status geram historico/auditoria.
- Evite double booking com protecao no banco, idealmente range temporal por profissional para appointments ativos.
- Check-in deve ser transacional: appointment vira `CHECKED_IN`, a comanda abre e os servicos agendados viram itens da comanda.
- No codigo, use `Order`; na interface, use "Comanda".
- `OrderItem` guarda snapshot de nome, tipo, quantidade, preco, desconto e preco final.
- Pagamentos suportam multiplos metodos e lifecycle consistente.
- Movimentos de caixa, estoque e financeiro devem ser auditaveis e preferencialmente imutaveis.
- Transacoes pagas nao sao sobrescritas; estorno/correcao entra como movimento inverso ou ajuste.
- Comissoes usam snapshot da regra vigente no momento do accrual.
- Side effects criticos passam por transactional outbox.
- Operacoes criticas e webhooks devem aceitar idempotency key.

## IA e Function Calling

- A IA nao acessa diretamente o banco operacional.
- Fluxo correto: FastAPI -> Tool Gateway -> Authorization -> Application Service -> Domain -> Database.
- O AI service recebe contexto autorizado via token curto e nao escolhe `tenant_id` arbitrariamente.
- Cada tool deve declarar schema, permission, risk level e handler.
- Niveis de risco:
  - leitura: pode executar automaticamente;
  - baixa escrita operacional: pode executar quando a intencao estiver clara;
  - alteracao relevante: exige confirmacao;
  - financeiro/sensivel: exige confirmacao explicita e autorizacao;
  - proibido: nunca executar autonomamente.
- Acoes confirmadas devem usar pending action/confirmation token com hash do payload.
- Toda execucao de tool deve ser auditavel.

## UX/UI

- O produto e PWA, mobile first, responsivo e role-aware.
- Nao comprima desktop para mobile; adapte composicao por viewport e contexto.
- Fluxos essenciais devem funcionar em smartphone, tablet e desktop.
- Alvos touch minimos: 44x44px, preferindo 48px para acoes principais.
- Navegacao mobile usa bottom navigation com acao central `+`; desktop usa sidebar/rail.
- O fluxo operacional mais importante e: Agenda -> Check-in -> Comanda -> Pagamento.
- Design visual: premium, tecnologico, discreto e operacional. Evite visual generico, ERP antigo, excesso de dourado/preto absoluto e cliches de barbearia.
- Use tokens para cores, spacing, font, radius, surfaces, borders e estados semanticos.
- Light, dark e system mode nascem desde o inicio.
- Componentes devem considerar `loading`, `empty`, `error`, `success`, `disabled`, `offline` e `permission denied`.
- Meta de acessibilidade: WCAG 2.2 AA onde aplicavel.

## Qualidade

- Testes obrigatorios para tenant isolation nos modulos relevantes.
- Teste regras de dominio em unit tests e fluxos principais em integration/E2E conforme risco.
- Fluxos E2E criticos:
  - login -> agenda -> check-in -> comanda -> pagamento -> comissao;
  - walk-in -> nova comanda -> itens -> pagamento -> estoque -> financeiro;
  - WhatsApp/IA -> disponibilidade -> agendamento.
- Testes de IA devem validar intent, tool selecionada, argumentos, autorizacao e side effect, nao apenas texto.
- Definition of Done de tela P0 inclui mobile, tablet, desktop, light/dark, estados principais, touch, mouse, teclado, permissions e acessibilidade minima.

## Skills Locais

Use as skills locais em `.agents/skills/` conforme o tipo de trabalho:

- `barberos-product-context`: escopo de produto, MVP, backlog, personas e priorizacao.
- `barberos-architecture`: implementacao de arquitetura, modulos, multi-tenancy, dados e backend.
- `barberos-ux-ui`: frontend, PWA, design system, responsividade e UX operacional.
- `barberos-ai-tooling`: Barber AI, Tool Gateway, function calling, confirmacoes e auditoria.
- `barberos-quality`: testes, seguranca, tenant isolation, observabilidade e Definition of Done.
