# BarberOS - Plano de Implementacao

## 1. Objetivo

Construir o BarberOS como uma plataforma SaaS B2B2C multi-tenant para a operacao de barbearias no Brasil, com foco inicial no fluxo:

`Agenda -> Check-in -> Comanda -> Pagamento -> Comissao`

Este documento transforma o PRD, a arquitetura e o design UX/UI em uma sequencia executavel de entregas. Ele deve ser atualizado quando uma decisao de produto ou arquitetura mudar.

## 2. Fontes e premissas

Fontes consultadas:

- `specs/prd.md`: produto, personas, modulos, regras e prioridades.
- `specs/architecture.md`: stack, limites de dominio, seguranca, dados, IA e ordem arquitetural.
- `specs/design.md`: PWA, responsividade, navegacao, design system, acessibilidade e telas P0.

`erp.md` nao esta presente no workspace neste momento. O plano usa `prd.md` como a especificacao de produto disponivel. Quando `erp.md` for adicionado, revisar este documento para incorporar regras ou modulos que ainda nao estejam cobertos.

Premissas de execucao:

- Comecar com monorepo e modular monolith; `apps/ai` permanece como servico separado.
- Priorizar entregas verticais funcionais, com dominio, banco, API, UI e testes no mesmo incremento.
- Manter as decisoes nao documentadas reversiveis ate existir evidencia de uso.
- Nao alterar as specs de origem como parte da implementacao.

## 3. Estrategia de entrega

O trabalho sera dividido em fatias que atravessam as camadas. Uma funcionalidade so e considerada pronta quando possui:

1. Modelo e invariantes no dominio.
2. Migracao e politicas de acesso no banco.
3. Caso de uso na camada de aplicacao.
4. Contrato de entrada e saida na API.
5. Tela ou estado de UI necessario ao fluxo.
6. Testes de regra, autorizacao, isolamento de tenant e fluxo principal.
7. Auditoria e observabilidade proporcionais ao risco.

A ordem arquitetural e a seguinte:

`Foundation -> Core Operations -> POS -> Money -> Infrastructure -> AI -> Communication`

O fluxo P0 deve ser validado continuamente em mobile, tablet e desktop, nos temas light e dark.

## 4. Fases de implementacao

### Fase 0 - Preparacao do monorepo

Objetivo: criar uma base executavel e repetivel para as equipes.

Entregas:

- Estrutura de monorepo com `apps/web`, `apps/worker`, `apps/ai` e `packages/`.
- Scripts comuns de desenvolvimento, lint, formatacao, typecheck e testes.
- Configuracao de ambientes local, teste e producao sem secrets versionados.
- Convencoes de modulos, nomes, imports, migrations e contratos.
- CI inicial executando verificacoes estaticas e testes.
- Shell visual com tokens de design, temas light/dark/system e navegacao role-aware.

Dependencias: nenhuma.

Criterios de saida:

- O monorepo instala e executa localmente a web, worker e AI com comandos documentados.
- A aplicacao web possui autenticacao inicial, layout responsivo e estados basicos de loading/error/empty.
- CI falha quando lint, typecheck ou testes falham.

### Fase 1 - Foundation: identidade, tenant e seguranca

Objetivo: garantir que toda operacao posterior comece com contexto e isolamento corretos.

Entregas de dominio e dados:

- Auth com Supabase Auth.
- Tenant, branch, membership, role e permission.
- `RequestContext` com `userId`, `tenantId`, `membershipId`, `role`, `permissions` e `branchScope`.
- RBAC, permission checks e entitlements no servidor.
- RLS como defesa adicional, com `tenant_id` e `branch_id` onde aplicavel.
- Auditoria para alteracoes sensiveis.
- Migrations versionadas, seeds minimos e estrategia de rollback.

Entregas de produto e UI:

- Login, sessao, troca de tenant/branch quando aplicavel e tratamento de acesso negado.
- Navegacao base para os papeis previstos no produto.
- Seletor de tema e comportamento responsivo inicial.

Testes obrigatorios:

- Usuario de um tenant nunca le ou altera dados de outro tenant.
- Branch scope impede acesso a filiais fora do escopo.
- Rotas e casos de uso rejeitam usuario sem permissao.
- Secrets e service role nunca aparecem no cliente.

Dependencias: Fase 0.

Criterios de saida: um usuario autenticado consegue acessar somente o tenant e as filiais autorizadas, com evidencia de auditoria para operacoes sensiveis.

### Fase 2 - Core Operations: agenda e atendimento

Objetivo: colocar a operacao diaria da barbearia em funcionamento.

Entregas de dominio e dados:

- Professionals, services e customers.
- Schedules, availability e appointments.
- Status de appointment: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- Historico de mudancas de status.
- Protecao contra double booking no banco para appointments ativos por profissional.
- Regras para walk-in e agendamento futuro.

Entregas de produto e UI:

- Agenda diaria e semanal.
- Filtros por profissional, branch e status.
- Criacao, edicao, confirmacao, cancelamento e marcacao de no-show.
- Busca e cadastro rapido de cliente.
- Check-in como acao primaria da agenda.
- Estados mobile, tablet, desktop, offline, erro e permissao negada.

Testes obrigatorios:

- Transicoes de status validas e invalidas.
- Conflito concorrente de agenda rejeitado pelo banco.
- Escopo por tenant, branch e permissao.
- Fluxo de agendamento e check-in em integration/E2E.

Dependencias: Fase 1.

Criterios de saida: a equipe consegue administrar a agenda e iniciar o atendimento sem operacoes manuais fora do sistema.

### Fase 3 - POS: comanda, catalogo e pagamento

Objetivo: fechar o atendimento operacional e registrar a venda.

Entregas de dominio e dados:

- Catalog, products e precos.
- `Order` no codigo, apresentado como "Comanda" na interface.
- Order items com snapshot de nome, tipo, quantidade, preco, desconto e preco final.
- Check-in transacional: appointment vira `CHECKED_IN`, a comanda abre e os servicos agendados viram itens.
- Inclusao e remocao de itens, descontos autorizados e calculo de totais.
- Payments com multiplos metodos e lifecycle consistente.
- Cash register e movimentos de caixa auditaveis.

Entregas de produto e UI:

- Tela de Comanda/PDV otimizada para toque.
- Adicao rapida de servicos e produtos.
- Resumo de itens, descontos, total e pagamentos parciais quando permitido.
- Confirmacao clara antes de finalizar pagamento.
- Estados de comanda vazia, pagamento em andamento, pago, erro e offline.

Testes obrigatorios:

- Check-in e abertura de comanda sao atomicos.
- Snapshot permanece estavel quando catalogo ou preco muda.
- Pagamento nao pode ser duplicado por retry.
- Comanda paga nao e sobrescrita; estorno e ajuste geram movimento inverso.
- Fluxo E2E agenda -> check-in -> comanda -> pagamento.

Dependencias: Fase 2.

Criterios de saida: um atendimento agendado ou walk-in pode chegar a uma comanda paga com rastreabilidade completa.

### Fase 4 - Money: financeiro e comissoes

Objetivo: transformar vendas e despesas em informacao financeira confiavel.

Entregas de dominio e dados:

- Expenses e financial entries.
- Regras de comissao e accrual.
- Snapshot da regra de comissao no momento do accrual.
- Payouts e estados de pagamento de comissao.
- Movimentos financeiros imutaveis, com ajuste ou estorno em vez de sobrescrita.
- Relatorios operacionais iniciais por periodo, branch, profissional e metodo de pagamento.

Entregas de produto e UI:

- Visao de faturamento e fechamento de caixa.
- Visao de comissoes por profissional.
- Cadastro e acompanhamento de despesas.
- Filtros, exportacao quando prevista no PRD e estados de dados insuficientes.

Testes obrigatorios:

- Comissao usa a regra vigente no evento correto.
- Alteracao posterior da regra nao muda accrual existente.
- Totais financeiros batem com pagamentos e movimentos de caixa.
- Permissoes financeiras e dados sensiveis sao validados server-side.

Dependencias: Fase 3.

Criterios de saida: pagamentos, caixa, despesas e comissoes podem ser conciliados sem editar historico financeiro.

### Fase 5 - Infrastructure: eventos, jobs e resiliencia

Objetivo: retirar efeitos colaterais do request e preparar escala operacional.

Entregas:

- Redis para cache, fila, rate limit e locks quando necessario.
- Transactional outbox para side effects criticos.
- `apps/worker` com processamento idempotente, retries e dead-letter strategy.
- Jobs para notificacoes, sincronizacoes, campanhas e recalcule assincrono.
- Idempotency keys para operacoes criticas e webhooks.
- Correlation id, logs estruturados, metricas e alertas basicos.
- Health checks e visibilidade de falhas de job.

Testes obrigatorios:

- Reprocessamento nao duplica pagamento, notificacao ou efeito financeiro.
- Falha transitoria aplica retry controlado.
- Evento publicado apos commit e nao antes.
- Tenant e branch permanecem no contexto do job.

Dependencias: Fases 1 a 4, com implementacao incremental durante as fases anteriores quando o risco exigir.

Criterios de saida: side effects criticos sao rastreaveis, reexecutaveis e nao dependem de manter a requisicao aberta.

### Fase 6 - AI: Barber AI e Tool Gateway

Objetivo: permitir assistencia operacional com autorizacao, previsibilidade e auditoria.

Entregas:

- `apps/ai` em FastAPI com orchestrator, prompts, providers e policies.
- Contexto autorizado por token curto; a IA nao escolhe `tenant_id` arbitrariamente.
- Tool Gateway na web, com chamada para authorization -> application service -> domain -> database.
- Registro de tools com schema, permissao, risk level e handler.
- Tools iniciais de leitura: disponibilidade, agenda, cliente e resumo operacional.
- Tools de baixa escrita quando a intencao estiver clara.
- Pending action e confirmation token com hash do payload para alteracoes relevantes.
- Confirmacao explicita para financeiro, dados sensiveis e qualquer operacao de maior risco.
- Auditoria de prompt, tool selecionada, argumentos, autorizacao, resultado e side effect.
- Avaliacoes de intent, argumentos, autorizacao e efeito, sem depender apenas do texto gerado.

Testes obrigatorios:

- A IA nunca acessa o banco operacional diretamente.
- Tool rejeita permissao ausente, tenant incorreto ou branch fora do escopo.
- Payload alterado invalida o confirmation token.
- Tool proibida nunca executa autonomamente.
- Disponibilidade -> agendamento funciona com autorizacao e idempotencia.

Dependencias: Fases 1, 2 e 5; Fase 3 para tools de comanda e Fase 4 para tools financeiras.

Criterios de saida: o assistente consegue responder consultas autorizadas e executar acoes permitidas com confirmacao e trilha de auditoria.

### Fase 7 - Communication: WhatsApp e campanhas

Objetivo: conectar a operacao interna aos canais de relacionamento com clientes.

Entregas:

- Integracao de WhatsApp por adaptador de infraestrutura.
- Webhooks autenticados e idempotentes.
- Templates, mensagens e estados de entrega.
- Lembretes de agenda e comunicacoes operacionais via worker.
- Campanhas com opt-in, opt-out e limites de envio.
- Uso da mesma camada de tools para fluxos de IA que envolvam comunicacao.

Testes obrigatorios:

- Webhook repetido nao duplica atendimento ou mensagem.
- Opt-out impede novos envios.
- Falha de provedor e apresentada sem corromper o estado interno.
- Toda mensagem fica vinculada ao tenant e, quando aplicavel, ao cliente e appointment.

Dependencias: Fases 2, 5 e 6.

Criterios de saida: mensagens operacionais podem ser enviadas e rastreadas sem misturar dados entre tenants.

## 5. Primeiro incremento executavel

O primeiro incremento deve produzir uma base pequena, mas demonstravel:

1. Monorepo executavel com web, worker e AI vazios, contratos de scripts e CI.
2. Supabase configurado para desenvolvimento e migrations iniciais.
3. Login e sessao funcionando.
4. Tenant, branch, membership, role e permission modelados.
5. `RequestContext` aplicado em uma rota protegida.
6. Layout PWA com sidebar desktop, bottom navigation mobile e temas.
7. Um teste de isolamento entre dois tenants.
8. Um teste de permissao negada.

Esse incremento fecha a fundacao minima para iniciar a Agenda sem criar divida estrutural.

## 6. Backlog de fatias verticais

Cada item abaixo deve ser implementado como uma unidade revisavel:

| ID     | Fatia                          | Resultado observavel                      | Dependencia    |
| ------ | ------------------------------ | ----------------------------------------- | -------------- |
| FND-01 | Monorepo e toolchain           | Projetos iniciam e verificacoes rodam     | Nenhuma        |
| FND-02 | Auth e sessao                  | Usuario entra e sai do sistema            | FND-01         |
| FND-03 | Tenant e membership            | Contexto identifica tenant e branch       | FND-02         |
| FND-04 | RBAC, permissions e RLS        | Acesso indevido e bloqueado               | FND-03         |
| FND-05 | Shell responsivo               | Navegacao base funciona nos viewports P0  | FND-02         |
| OPS-01 | Customers                      | Cliente pode ser localizado e cadastrado  | FND-04         |
| OPS-02 | Professionals e services       | Oferta e equipe ficam disponiveis         | FND-04         |
| OPS-03 | Schedules e availability       | Horarios validos podem ser consultados    | OPS-02         |
| OPS-04 | Appointments                   | Agendamento tem lifecycle e historico     | OPS-01, OPS-03 |
| OPS-05 | Agenda P0                      | Equipe opera o dia de trabalho            | OPS-04, FND-05 |
| OPS-06 | Check-in                       | Atendimento inicia com transacao completa | OPS-04         |
| POS-01 | Catalog e products             | Itens vendaveis podem ser mantidos        | FND-04         |
| POS-02 | Order e OrderItem              | Comanda registra snapshots e totais       | OPS-06, POS-01 |
| POS-03 | Payments e cash register       | Pagamento fecha a comanda                 | POS-02         |
| POS-04 | Comanda P0                     | Fluxo de toque funciona no atendimento    | POS-02, POS-03 |
| MON-01 | Expenses e financial entries   | Despesas e entradas sao registradas       | POS-03         |
| MON-02 | Commissions e payouts          | Comissao pode ser conciliada              | MON-01         |
| INF-01 | Outbox e worker                | Side effects saem do request              | POS-03         |
| INF-02 | Idempotencia e observabilidade | Retry e falhas ficam controlados          | INF-01         |
| AI-01  | Tool Registry e Gateway        | IA chama tools autorizadas                | OPS-05, INF-02 |
| AI-02  | Availability e booking         | IA consulta e agenda com controle         | AI-01          |
| COM-01 | WhatsApp e webhooks            | Mensagens sao recebidas e rastreadas      | INF-01         |
| COM-02 | Lembretes e campanhas          | Comunicacao operacional e enviada         | COM-01         |

## 7. Padrao de implementacao por fatia

Para cada item do backlog:

1. Registrar objetivo, atores, permissao e criterios de aceite.
2. Modelar invariantes antes dos componentes de UI.
3. Criar migration, indexes, constraints e RLS.
4. Implementar caso de uso em `application/` e regras em `domain/`.
5. Expor contrato pela API; route handler fica como adaptador fino.
6. Construir UI com os estados de loading, empty, error, success, disabled, offline e permission denied relevantes.
7. Adicionar testes unitarios, integracao e E2E conforme o risco.
8. Adicionar auditoria, idempotencia e outbox quando houver efeito colateral.
9. Validar os viewports `320`, `390`, `768`, `1024`, `1440` e `1920` quando a fatia tiver UI.
10. Registrar decisoes novas e dividas tecnicas no proprio PR ou issue.

## 8. Definition of Done

### Produto e negocio

- O caso de uso atende ao PRD e explicita suas premissas.
- Permissoes e entitlements foram definidos para cada acao.
- Estados de sucesso, erro e excecao sao compreensiveis para o papel que executa a tarefa.

### Arquitetura e dados

- Regra de negocio nao esta em React ou route handler.
- Dados operacionais carregam tenant e branch quando aplicavel.
- Constraints, RLS e transacoes protegem invariantes criticos.
- Nenhum secret ou service role chega ao navegador.
- Eventos e webhooks criticos sao idempotentes e auditaveis.

### UX/UI

- Fluxo funciona com toque, mouse e teclado.
- Alvos de toque tem pelo menos 44x44px, preferindo 48px nas acoes principais.
- Layout foi verificado nos viewports P0 e nos temas light/dark.
- Contraste, foco, labels, semantica e navegacao por teclado atendem ao minimo WCAG 2.2 AA aplicavel.
- Nao ha sobreposicao, overflow acidental ou texto cortado.

### Qualidade

- Testes de tenant isolation e autorizacao cobrem o modulo alterado.
- Testes de dominio cobrem invariantes e transicoes invalidas.
- Fluxo E2E critico foi atualizado quando a fatia o toca.
- Logs e metricas permitem localizar falhas relevantes.
- CI verde e instrucoes locais atualizadas.

## 9. Decisoes a fechar antes da primeira implementacao

Estas decisoes nao impedem a escrita do plano, mas devem ser registradas antes de consolidar o scaffold:

- Gerenciador de pacotes e orquestrador do monorepo.
- Biblioteca de componentes e estrategia de tokens CSS.
- Estrategia de migrations e seeds do Supabase.
- Convencao de contratos entre web, worker e AI.
- Provedor e formato de pagamentos do primeiro release.
- Provedor de WhatsApp e politica de armazenamento de mensagens.
- Ferramentas de testes E2E, acessibilidade e visual regression.
- Metas de observabilidade e limites operacionais do worker.

## 10. Marco de entrega do MVP

O MVP esta pronto para validacao piloto quando:

- Um tenant consegue configurar branch, equipe, servicos e clientes.
- A equipe consegue criar e operar appointments sem double booking.
- Check-in abre uma Comanda com os servicos corretos.
- Produtos e servicos podem ser adicionados e pagos.
- Caixa, financeiro e comissao refletem o atendimento.
- O fluxo critico esta coberto por E2E e isolamento multi-tenant.
- A PWA funciona nos dispositivos prioritarios com os estados essenciais.
- Barber AI, quando habilitado, respeita tools, permissoes, confirmacoes e auditoria.
