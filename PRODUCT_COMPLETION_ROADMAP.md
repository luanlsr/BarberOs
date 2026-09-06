# BarberOS - Roadmap de implementacao ate o produto completo

Este arquivo organiza os proximos passos depois do PRD para transformar o BarberOS em um produto completo. Ele nao substitui as fontes de verdade em `specs/`; serve como trilha operacional para planejar os proximos OpenSpec changes, sprints e validacoes.

## Estado atual

Change em andamento: `core-operations-scheduling`

Progresso conhecido: 28 de 28 tarefas concluidas.
Progresso estimado do PRD: 20%.

O recorte atual cobre a fundacao operacional: contratos, permissoes, migration de Core Operations, servicos de aplicacao, APIs de profissionais, servicos, clientes, agenda, bloqueios, disponibilidade e agendamentos, shell/navegacao e a primeira tela responsiva de Agenda, o AppointmentCard, a superficie de detalhes do agendamento com historico e acoes por permissao, o fluxo inicial de novo agendamento com cliente rapido e feedback de conflito, e as telas iniciais de Clientes, Equipe e Servicos com estados operacionais.

## Sequencia macro

1. Concluir Core Operations e Agenda.
2. Implementar Check-in e Comanda.
3. Implementar Pagamentos e Caixa.
4. Implementar Financeiro, comissoes e repasses.
5. Implementar Estoque e catalogo operacional.
6. Implementar worker, outbox, jobs e notificacoes.
7. Implementar WhatsApp e campanhas.
8. Implementar Barber AI, Tool Gateway e auditoria de IA.
9. Implementar Master Admin, planos, billing e suporte.
10. Fortalecer qualidade, seguranca, observabilidade e deploy.

## 1. Concluir Core Operations e Agenda

Objetivo: finalizar o fluxo operacional inicial ate a criacao/cancelamento de agendamentos.

Passos:

1. Criar camada de data loading para Agenda usando APIs existentes.
2. Construir tela `/agenda` responsiva:
   - mobile: timeline do dia;
   - tablet: colunas por profissional ou periodo;
   - desktop: grid operacional.
3. Criar `AppointmentCard` com status, cliente, profissional, servicos e horario.
4. Criar superficie de detalhes do agendamento com historico e acoes permitidas.
5. Criar fluxo de novo agendamento:
   - selecao de cliente;
   - criacao rapida de cliente;
   - selecao de servico;
   - selecao de profissional;
   - escolha de data/hora;
   - feedback de conflito.
6. Criar telas iniciais de Clientes, Equipe e Servicos.
7. Cobrir estados de loading, empty, error, offline, disabled e permission denied.
8. Validar responsividade em 320, 390, 768, 1024, 1440 e 1920 px.
9. Validar fluxo E2E: login -> agenda -> criar pre-requisitos -> criar agendamento -> cancelar -> slot voltar a ficar disponivel.

Definition of Done:

- Agenda funciona em smartphone, tablet e desktop.
- Acoes aparecem conforme role, permissions e entitlement.
- Nao ha scroll horizontal indevido.
- APIs e telas retornam erros estaveis com request id.
- Tenant B nao acessa dados do Tenant A.

## 2. Check-in e Comanda

Objetivo: transformar agendamento em atendimento operacional.

Passos:

1. Criar modelos e contratos para `Order`, `OrderItem` e status da comanda.
2. Criar migration para comandas e itens.
3. Implementar servico de check-in transacional:
   - appointment muda para `CHECKED_IN`;
   - comanda e aberta;
   - servicos agendados viram itens da comanda;
   - historico/auditoria e gravado.
4. Implementar API `/api/v1/check-in`.
5. Implementar API `/api/v1/orders`.
6. Implementar API para adicionar/remover itens da comanda.
7. Construir tela/superficie de Comanda:
   - cliente;
   - profissional;
   - itens;
   - descontos;
   - totais;
   - observacoes;
   - status.
8. Criar fluxo de walk-in:
   - nova comanda sem agendamento;
   - cliente opcional ou novo cliente rapido;
   - itens manuais.
9. Validar E2E: agenda -> check-in -> comanda aberta.

Definition of Done:

- Check-in e atomico.
- `OrderItem` guarda snapshot de nome, tipo, quantidade, preco, desconto e final.
- Na UI o termo exibido e "Comanda"; no codigo permanece `Order`.

## 3. Pagamentos e Caixa

Objetivo: fechar comandas com pagamentos auditaveis.

Passos:

1. Criar contratos para pagamentos, metodos, parcelas e status.
2. Criar migration para payments, cash registers e cash movements.
3. Implementar abertura/fechamento de caixa.
4. Implementar recebimento com multiplos metodos.
5. Implementar fechamento de comanda apos pagamento completo.
6. Implementar estorno/correcao como movimento inverso.
7. Criar APIs:
   - `/api/v1/payments`;
   - `/api/v1/cash-register`;
   - `/api/v1/cash-movements`.
8. Construir UI de pagamento:
   - resumo da comanda;
   - metodos de pagamento;
   - valores parciais;
   - troco quando aplicavel;
   - confirmacao final.
9. Construir UI de caixa:
   - abrir caixa;
   - sangria;
   - reforco;
   - fechar caixa;
   - divergencias.
10. Validar E2E: check-in -> comanda -> pagamento -> caixa.

Definition of Done:

- Pagamentos pagos nao sao sobrescritos.
- Caixa e financeiro recebem movimentos auditaveis.
- Operacoes criticas usam idempotency key.

## 4. Financeiro, comissoes e repasses

Objetivo: consolidar dinheiro, despesas e pagamentos de profissionais.

Passos:

1. Criar contratos para despesas, lancamentos financeiros, comissoes e payouts.
2. Criar migration para expenses, financial entries, commission rules, commission accruals e payouts.
3. Implementar lancamentos financeiros a partir de pagamentos.
4. Implementar despesas manuais e recorrentes.
5. Implementar regras de comissao:
   - por profissional;
   - por servico;
   - por percentual;
   - por valor fixo;
   - excecoes.
6. Gerar accrual de comissao com snapshot da regra vigente.
7. Implementar fechamento e pagamento de repasses.
8. Criar dashboards financeiros:
   - faturamento;
   - despesas;
   - lucro estimado;
   - comissoes em aberto;
   - repasses pagos.
9. Validar E2E: comanda paga -> financeiro -> comissao -> payout.

Definition of Done:

- Movimentos financeiros sao preferencialmente imutaveis.
- Comissao nunca depende apenas da regra atual; usa snapshot historico.
- Estornos geram reversoes consistentes.

## 5. Estoque e catalogo operacional

Objetivo: controlar produtos, consumo e venda.

Passos:

1. Criar contratos para produtos, categorias, estoque, movimentacoes e fornecedores.
2. Criar migration para catalog, products, inventory locations e stock movements.
3. Implementar CRUD de produtos.
4. Implementar entrada, saida, ajuste e baixa por venda.
5. Integrar produtos com comandas.
6. Integrar pagamento de produto com financeiro.
7. Criar alertas de estoque baixo.
8. Construir telas de produtos e estoque.
9. Validar E2E: walk-in -> produto na comanda -> pagamento -> baixa de estoque -> financeiro.

Definition of Done:

- Estoque e auditavel.
- Movimentos nao sao apagados; correcoes usam ajuste.
- Venda de produto atualiza estoque e financeiro.

## 6. Worker, outbox, jobs e notificacoes

Objetivo: mover efeitos colaterais para processamento confiavel.

Passos:

1. Criar app `apps/worker` conforme arquitetura.
2. Criar contratos internos para jobs e outbox events.
3. Implementar transactional outbox.
4. Implementar Redis para filas, locks, rate limit e retries.
5. Implementar jobs:
   - lembrete de agendamento;
   - follow-up pos-atendimento;
   - campanhas;
   - recalculo financeiro;
   - conciliacao;
   - limpeza de expirados.
6. Implementar observabilidade minima:
   - job id;
   - correlation id;
   - tenant id;
   - retry count;
   - erro.
7. Criar dashboard operacional simples para falhas de jobs.

Definition of Done:

- Side effects criticos passam pela outbox.
- Jobs sao idempotentes.
- Falhas sao reprocessaveis e auditaveis.

## 7. WhatsApp, mensagens e campanhas

Objetivo: ativar comunicacao com clientes respeitando consentimento e auditoria.

Passos:

1. Definir provider inicial de WhatsApp.
2. Criar contratos para mensagens, templates, conversas e campanhas.
3. Criar migration para messaging, message events, campaign audiences e campaign runs.
4. Implementar envio transacional:
   - confirmacao de agendamento;
   - lembrete;
   - cancelamento;
   - pos-atendimento.
5. Implementar opt-in/opt-out e consentimento.
6. Implementar campanhas:
   - segmentacao basica;
   - preview;
   - envio;
   - status;
   - metricas.
7. Integrar inbound webhook.
8. Criar tela de mensagens/campanhas.
9. Validar E2E: WhatsApp -> disponibilidade -> agendamento.

Definition of Done:

- Nenhuma mensagem de marketing e enviada sem consentimento.
- Webhooks sao idempotentes.
- Eventos de mensagem sao auditaveis.

## 8. Barber AI, Tool Gateway e auditoria

Objetivo: entregar IA operacional segura, sem acesso direto ao banco.

Passos:

1. Criar app `apps/ai` com FastAPI.
2. Criar orchestrator de conversas.
3. Criar Tool Registry.
4. Criar Tool Gateway no `apps/web`.
5. Definir schemas de tools:
   - consultar agenda;
   - consultar disponibilidade;
   - criar agendamento;
   - remarcar;
   - cancelar;
   - consultar cliente;
   - criar cliente;
   - consultar comandas;
   - consultar financeiro conforme permissao.
6. Implementar politicas de risco:
   - leitura automatica;
   - baixa escrita operacional;
   - alteracao relevante com confirmacao;
   - financeiro/sensivel com confirmacao explicita;
   - proibido.
7. Implementar pending actions e confirmation tokens com hash do payload.
8. Implementar AI audit:
   - intent;
   - tool chamada;
   - argumentos;
   - permissao;
   - resultado;
   - usuario;
   - tenant;
   - request id.
9. Criar UI inicial do Barber AI.
10. Criar testes de intent, tool selection, autorizacao e side effect.

Definition of Done:

- IA nao acessa banco diretamente.
- Toda tool passa por Authorization e Application Service.
- Acoes sensiveis exigem confirmacao.
- Auditoria de IA e consultavel.

## 9. Master Admin, planos, billing e suporte

Objetivo: operar o SaaS como produto multi-tenant.

Passos:

1. Completar Master Admin para tenants, unidades, usuarios e suporte.
2. Implementar plano, entitlement e limites por tenant.
3. Implementar billing/subscription provider.
4. Criar tela de planos e assinatura.
5. Criar suspensao, bloqueio e retomada de tenant.
6. Criar logs de auditoria consultaveis.
7. Criar ferramentas de suporte com escopo e trilha auditavel.
8. Criar metricas SaaS:
   - tenants ativos;
   - uso por modulo;
   - falhas;
   - churn signals;
   - eventos criticos.

Definition of Done:

- Entitlements sao validados server-side.
- Suporte nao burla tenant isolation.
- Secrets nunca chegam ao cliente.

## 10. Qualidade, seguranca, observabilidade e deploy

Objetivo: preparar o produto para uso real e evolucao segura.

Passos:

1. Fortalecer testes de tenant isolation em todos os modulos.
2. Criar suite E2E critica:
   - login -> agenda -> check-in -> comanda -> pagamento -> comissao;
   - walk-in -> comanda -> itens -> pagamento -> estoque -> financeiro;
   - WhatsApp/IA -> disponibilidade -> agendamento.
3. Criar testes de concorrencia:
   - double booking;
   - pagamento duplicado;
   - webhook duplicado;
   - jobs concorrentes.
4. Implementar logging estruturado.
5. Implementar metricas e tracing por request id.
6. Implementar rate limits por tenant, usuario e endpoint sensivel.
7. Revisar RLS, policies, indexes e constraints.
8. Revisar acessibilidade WCAG 2.2 AA onde aplicavel.
9. Configurar CI/CD:
   - lint;
   - typecheck;
   - unit;
   - integration;
   - E2E;
   - migration validation;
   - OpenSpec validation.
10. Configurar deploy:

- Vercel para `apps/web`;
- Railway para `apps/worker`;
- Railway para `apps/ai`;
- Supabase para banco/auth/storage;
- Redis gerenciado.

11. Criar runbooks:

- falha de pagamento;
- falha de WhatsApp;
- falha de job;
- incidente de tenant isolation;
- restore de banco.

Definition of Done:

- `npm run validate` passa.
- `npm run validate:foundation` passa.
- Validacao de migrations passa.
- `openspec validate` passa para cada change.
- Produto tem trilha de auditoria para operacoes criticas.

## Ordem sugerida dos proximos OpenSpec changes

1. `complete-core-operations-agenda`
2. `pos-orders-checkin`
3. `payments-cash-register`
4. `financial-ledger-commissions`
5. `inventory-products`
6. `worker-outbox-notifications`
7. `whatsapp-messaging-campaigns`
8. `barber-ai-tool-gateway`
9. `master-admin-billing`
10. `production-hardening-observability`

## Riscos principais

1. Tenant isolation incompleto em alguma rota ou job.
2. Double booking se a protecao de banco e os testes de concorrencia nao forem mantidos.
3. Pagamento/caixa/financeiro com mutacoes destrutivas em vez de movimentos auditaveis.
4. IA executando acoes sem confirmacao adequada.
5. UI mobile ficar bonita, mas lenta para fluxo real de barbearia.
6. Jobs e webhooks sem idempotencia.
7. Entitlements aplicados so na UI e nao no servidor.

## Marco de produto completo

O BarberOS pode ser considerado completo quando estes fluxos funcionarem ponta a ponta:

1. Dono configura tenant, unidades, equipe, servicos, agenda e permissoes.
2. Recepcao cria e gerencia agendamentos no mobile/tablet/desktop.
3. Cliente chega, faz check-in e abre comanda automaticamente.
4. Atendimento adiciona servicos/produtos e fecha pagamento.
5. Caixa e financeiro recebem movimentos auditaveis.
6. Comissao e calculada e paga com snapshot correto.
7. Estoque baixa produtos vendidos e alerta reposicao.
8. WhatsApp envia lembretes, recebe respostas e cria/remarca agendamentos quando permitido.
9. Barber AI consulta dados autorizados e executa tools com confirmacao quando necessario.
10. Master Admin opera tenants, planos, suporte, auditoria e billing.
11. Testes, logs, metricas, deploy e runbooks sustentam operacao real.
