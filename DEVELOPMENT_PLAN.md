# BarberOS - Plano de Desenvolvimento

## 1. Objetivo

Levar o BarberOS da fundação operacional atual até um produto SaaS utilizável em produção, preservando:

- isolamento multi-tenant;
- operações críticas auditáveis;
- arquitetura de monólito modular;
- worker separado para efeitos assíncronos;
- IA acessando o domínio somente por Tool Gateway;
- evolução incremental sem bloquear o fluxo principal da barbearia.

## 2. Estado Atual

- Migrations de fundação, agenda, comandas, pagamentos, financeiro, estoque, worker e extensões de domínio aplicadas no Supabase.
- Services e repositories iniciais para os domínios principais implementados.
- 258 de 283 tarefas OpenSpec concluídas.
- 25 tarefas restantes no change `worker-outbox-notifications`.
- Estimativa funcional do PRD: aproximadamente 63%.
- Fluxo operacional base disponível: agenda -> check-in -> comanda -> pagamento -> caixa -> financeiro/estoque/comissão.

As tabelas de WhatsApp, campanhas, IA, billing e Master Admin já possuem estrutura inicial no banco, mas ainda não representam funcionalidades completas de produto.

## 3. Estratégia de Entrega

Cada etapa deve ser entregue verticalmente, contendo:

1. contrato e regra de domínio;
2. migration ou ajuste de dados;
3. repository e application service;
4. API ou integração;
5. interface quando houver fluxo de usuário;
6. testes unitários, isolamento e fluxo principal;
7. observabilidade e documentação operacional.

Nenhuma feature crítica deve ser considerada pronta apenas porque a tabela existe.

## 4. Fases

### Fase 0 - Estabilização do Estado Atual

Objetivo: garantir que a base aplicada no Supabase e os módulos existentes sejam confiáveis.

Entregas:

- validar todas as migrations em banco limpo;
- validar `npm run validate` completo;
- corrigir divergências entre contratos, repositories e tabelas;
- adicionar testes de isolamento para cada domínio tenant-scoped;
- confirmar que nenhuma chave `service_role` chega ao browser;
- gerar tipos do banco e avaliar substituição gradual de `Record<string, unknown>` por tipos gerados;
- documentar rollback e restauração do banco.

Critério de saída:

- migrations reproduzíveis;
- typecheck, lint e testes passando;
- fluxo de agenda até pagamento validado em ambiente local e remoto de homologação.

### Fase 1 - Conclusão do Worker e Outbox

Objetivo: tornar efeitos colaterais confiáveis sem bloquear operações web.

Entregas prioritárias:

- integrar eventos de pagamento, comanda, agenda, financeiro e estoque;
- implementar runtime do `apps/worker`;
- implementar polling, health check, readiness e graceful shutdown;
- implementar claim de jobs, leases e locks Redis;
- implementar dispatch da outbox;
- implementar retry, backoff e dead-letter;
- implementar handlers de lembrete, follow-up, recálculo, estoque e limpeza;
- implementar logs estruturados com request/correlation id;
- criar provider noop de notificações;
- criar APIs e tela de falhas operacionais;
- validar os dois fluxos E2E de worker previstos no OpenSpec.

Critério de saída:

- pagamento concluído gera outbox sem depender do worker estar online;
- jobs são idempotentes;
- falhas são reprocessáveis e visíveis para operadores autorizados;
- worker pode ser reiniciado sem duplicar efeitos.

### Fase 2 - WhatsApp e Comunicação

Objetivo: transformar WhatsApp em canal operacional de primeira classe.

Entregas:

- escolher e encapsular o provider inicial;
- validar assinatura, timestamp e idempotência de webhook;
- implementar connection management por tenant/unidade;
- implementar conversations, messages e message events;
- implementar confirmação, lembrete, cancelamento e pós-atendimento;
- implementar consentimento transacional e marketing;
- implementar opt-in/opt-out;
- criar templates versionados;
- implementar campanhas com audiência, preview, envio e métricas;
- criar telas de conversas e campanhas;
- criar fluxo WhatsApp -> disponibilidade -> agendamento.

Critério de saída:

- nenhuma mensagem de marketing é enviada sem consentimento;
- webhook duplicado não gera mensagem duplicada;
- indisponibilidade do provider gera retry e status operacional claro.

### Fase 3 - Barber AI e Tool Gateway

Objetivo: entregar IA operacional segura e auditável.

Entregas:

- estruturar `apps/ai` com FastAPI;
- implementar orchestrator e abstração de providers LLM;
- implementar Tool Registry versionado;
- implementar Tool Gateway no web;
- implementar autorização por permission e entitlement;
- implementar níveis de risco;
- implementar pending actions e confirmation tokens com hash do payload;
- implementar tools de disponibilidade, agendamento, clientes, comandas e consultas financeiras autorizadas;
- implementar AI conversations, usage e audit de tool execution;
- criar UI inicial do Barber AI;
- testar intent, seleção de tool, argumentos, autorização, confirmação e side effect.

Critério de saída:

- IA nunca acessa o banco diretamente;
- ações financeiras ou relevantes exigem confirmação;
- toda execução é auditável por tenant, usuário, request e tool.

### Fase 4 - Master Admin, Billing e Suporte

Objetivo: operar o BarberOS como SaaS.

Entregas:

- criar área separada `/master`;
- implementar platform memberships;
- implementar gestão de tenants, branches e usuários;
- implementar planos e entitlements configuráveis;
- implementar limites e usage counters;
- integrar provider de billing;
- implementar invoices e billing webhooks idempotentes;
- implementar trial, upgrade, downgrade, cancelamento e inadimplência;
- implementar suporte com sessão temporária, motivo, expiração e auditoria;
- criar métricas de tenants ativos, uso, falhas e sinais de churn.

Critério de saída:

- entitlements são validados server-side;
- suporte não acessa tenant sem sessão autorizada;
- billing webhook duplicado não altera assinatura duas vezes;
- ações administrativas têm trilha de auditoria.

### Fase 5 - Produção, Segurança e Observabilidade

Objetivo: preparar o sistema para operação real.

Entregas:

- completar testes de tenant isolation em todos os módulos;
- executar E2E dos três fluxos críticos do PRD;
- adicionar testes de concorrência para agenda, pagamentos, webhooks e jobs;
- padronizar logs estruturados e redaction;
- implementar métricas, tracing e alertas;
- implementar rate limit por tenant, usuário e endpoint sensível;
- revisar RLS, policies, constraints e índices;
- completar acessibilidade e responsividade das telas P0;
- configurar CI/CD para format, lint, typecheck, testes, E2E, migrations e OpenSpec;
- configurar deploy Vercel, Railway, Supabase e Redis;
- criar runbooks de pagamento, WhatsApp, jobs, isolamento e restore.

Critério de saída:

- `npm run validate` passa;
- migrations e OpenSpec passam em CI;
- alertas operacionais possuem responsável e runbook;
- restore de banco foi testado;
- fluxos críticos funcionam em homologação com dados reais anonimizados.

## 5. Ordem Imediata de Execução

1. Concluir as 25 tarefas restantes de `worker-outbox-notifications`.
2. Integrar eventos de pagamento, comanda, agenda, financeiro e estoque.
3. Finalizar runtime e handlers do worker.
4. Finalizar APIs e UI de falhas operacionais.
5. Escolher provider de WhatsApp e iniciar o change de comunicação.
6. Implementar confirmação e lembrete de agendamento antes de campanhas.
7. Iniciar Tool Gateway somente depois que autorização, auditoria e outbox estiverem estáveis.
8. Implementar Master Admin e billing após os entitlements estarem sendo consumidos server-side.
9. Executar hardening e E2E antes de considerar o produto pronto.

## 6. Definition of Done por Épico

Um épico só será considerado concluído quando possuir:

- regras de domínio testadas;
- migration validada e aplicada;
- RLS/policies revisadas;
- repository e application service;
- API ou integração funcionando;
- estados de loading, empty, error, offline e permission denied quando aplicável;
- isolamento de tenant testado;
- observabilidade mínima;
- E2E do fluxo principal;
- documentação de operação e rollback.

## 7. Riscos de Execução

- Construir telas sobre dados sem concluir os serviços de aplicação.
- Permitir que worker ou IA contornem autorização usando credenciais elevadas.
- Enviar WhatsApp sem consentimento ou idempotência.
- Criar billing sem reconciliação de webhook.
- Considerar migrations futuras como features prontas.
- Acumular `Record<string, unknown>` sem gerar contratos de banco progressivamente.
- Deixar o fluxo agenda -> pagamento sem teste E2E contínuo.

## 8. Marco de Produto Completo

O BarberOS será considerado pronto quando:

- uma barbearia configurar unidade, equipe, serviços e agenda;
- a recepção criar e operar agendamentos;
- o cliente fizer check-in e abrir comanda;
- serviços e produtos forem vendidos e pagos;
- caixa, financeiro, estoque e comissão forem atualizados;
- lembretes forem enviados de forma confiável;
- WhatsApp permitir interação autorizada;
- IA consultar e executar tools com confirmação adequada;
- Master Admin operar tenants, planos, suporte e billing;
- logs, métricas, deploy, backup, restore e runbooks sustentarem a operação.
