# BarberOS - Epicos de Fechamento da Promessa da Landing

Este arquivo registra os epicos necessarios para alinhar a entrega do produto ao valor prometido na landing page:

> Operacao, caixa e equipe no mesmo fluxo. Agenda, clientes, barbeiros, comandas, vendas, estoque, caixa e financeiro conectados para o dono enxergar o negocio com clareza antes do fim do dia.

Use este documento como ponto de continuidade em novas janelas de contexto. Ele nao substitui `specs/prd.md`, `specs/architecture.md`, `specs/design.md` nem `PRODUCT_COMPLETION_ROADMAP.md`; ele transforma a promessa comercial da landing em uma sequencia pratica de fechamento.

## Objetivo de Produto

Entregar uma experiencia em que uma barbearia consiga operar com dados reais, em fluxo continuo:

```text
Agenda
-> Check-in
-> Comanda
-> Pagamento
-> Caixa
-> Estoque
-> Financeiro
-> Comissao
-> Alertas / WhatsApp / IA
```

O produto so cumpre a promessa da landing quando o dono consegue responder:

- O que esta acontecendo hoje?
- Quanto entrou, saiu e ainda vai entrar?
- Quais produtos, horarios, clientes e profissionais exigem atencao?
- Que acao devo tomar agora?

## Ordem Recomendada

1. Operacao Real Sem Dados Simulados
2. Fluxo Operacional Ponta a Ponta
3. Financeiro Pro, Comissoes e Repasses
4. Estoque Conectado ao PDV
5. Dashboard, Alertas e Notificacoes
6. WhatsApp, Conversas e Campanhas
7. Barber AI Acionavel
8. Onboarding, Planos e Configuracoes por Role
9. Hardening de Producao

---

## Epico 1 - Operacao Real Sem Dados Simulados

### Objetivo

Remover dependencia de dados demo/dev nas telas principais e garantir que os fluxos prometidos leiam e escrevam dados reais do tenant.

### Escopo

- Dashboard.
- Agenda.
- Comandas.
- Financeiro.
- Estoque.
- Mensagens.
- Campanhas.
- Configuracoes.
- Preferencias.
- Planos e cobrancas.

### Tarefas

- Mapear todos os view models que ainda usam `development`, `dev-`, `mock`, `noop`, `ficticio` ou dados locais.
- Substituir dados simulados por repositories/application services persistidos.
- Garantir fallback apenas para estados intencionais de desenvolvimento, nunca para producao.
- Revisar telas com estado vazio real por tenant.
- Revisar permissoes e entitlements server-side em todos os data loaders.
- Criar ou ajustar migrations faltantes para preferencias, notificacoes, configuracoes operacionais e dados persistidos.
- Cobrir testes para tenant isolation e ausencia de dados cruzados.

### Definition of Done

- Usuario autenticado ve apenas dados reais do tenant/unidade.
- Nenhum fluxo P0 depende de fixture local para aparentar funcionamento.
- Estados empty/loading/error/offline continuam claros.
- Testes cobrem ao menos os data loaders principais.

---

## Epico 2 - Fluxo Operacional Ponta a Ponta

### Objetivo

Consolidar o fluxo operacional central prometido pela landing:

```text
Agenda -> Check-in -> Comanda -> Pagamento -> Caixa -> Estoque -> Financeiro -> Comissao
```

### Escopo

- Criacao, reagendamento e cancelamento de agenda.
- Bloqueios, folgas e disponibilidade real por profissional.
- Check-in transacional.
- Comanda com servicos e produtos.
- Pagamento misto.
- Fechamento de comanda.
- Atualizacao de caixa.
- Baixa de estoque.
- Lancamento financeiro.
- Geracao de comissao.

### Tarefas

- Validar ordem e UX do novo agendamento: cliente, profissional, servico, data, horario.
- Garantir que servicos exibidos dependam do profissional selecionado.
- Garantir que horarios exibidos respeitem agenda, bloqueios e duracao dos servicos.
- Finalizar bloqueios por admin e por barbeiro.
- Criar submenu de disponibilidade por profissional/dia na agenda.
- Garantir check-in atomico: appointment `CHECKED_IN` + order aberto + itens de servico.
- Garantir pagamento idempotente e fechamento consistente da comanda.
- Garantir outbox/eventos para efeitos secundarios.
- Validar fluxo walk-in: nova comanda -> itens -> pagamento -> efeitos.

### Definition of Done

- Um atendimento completo atualiza automaticamente todos os modulos prometidos.
- Nao ha double booking mesmo com concorrencia.
- Pagamento duplicado nao duplica caixa, financeiro, estoque ou comissao.
- Fluxo funciona para owner, receptionist e professional dentro das permissoes.

---

## Epico 3 - Financeiro Pro, Comissoes e Repasses

### Objetivo

Entregar a promessa de saber, em tempo real, quanto entrou, saiu, sera recebido e sera repassado.

### Escopo

- Recebiveis previstos.
- Receitas realizadas.
- Despesas.
- Contas pendentes.
- Comissoes abertas.
- Repasses pagos e pendentes.
- Descontos e adiantamentos de profissionais.
- Previsao de salario.
- Fechamento por profissional.
- DRE gerencial simples.

### Tarefas

- Consolidar ledger financeiro a partir de pagamentos, despesas, estornos e ajustes.
- Exibir fluxo de caixa por periodo.
- Exibir resultado do periodo com receita, despesas, comissoes e margem.
- Implementar fechamento de repasses por profissional.
- Registrar adiantamentos/descontos.
- Exibir carteira do profissional com producao, comissao, vendas, descontos e saldo.
- Conectar financeiro com plano/cobranca SaaS quando aplicavel.
- Permitir baixar comprovantes ou registrar comprovantes onde fizer sentido.

### Definition of Done

- Dono sabe quanto recebeu, quanto deve, quanto vai repassar e qual o resultado.
- Profissional ve apenas sua propria carteira quando permitido.
- Movimentos financeiros pagos nao sao sobrescritos; ajustes entram como reversao/correcao.
- Comissoes usam snapshot da regra vigente no momento do accrual.

---

## Epico 4 - Estoque Conectado ao PDV

### Objetivo

Cumprir a promessa de produtos vendidos baixarem estoque e gerarem alertas.

### Escopo

- Produtos.
- Categorias.
- Entrada de estoque.
- Ajuste e saida.
- Baixa por venda.
- Estoque minimo.
- Alertas de reposicao.
- Historico auditavel.

### Tarefas

- Permitir criar categoria a partir do select de categoria quando nao existir.
- Permitir cadastrar produto dentro do fluxo de entrada de estoque quando nao existir.
- Garantir baixa de estoque ao pagamento de produto na comanda.
- Diferenciar produtos de revenda e consumo interno.
- Exibir historico de movimentos por produto.
- Criar alertas de estoque baixo.
- Garantir movimentos imutaveis com origem auditavel.

### Definition of Done

- Produto vendido na comanda altera estoque e financeiro.
- Produto abaixo do minimo gera alerta.
- Correcoes usam ajuste, nao delecao de historico.

---

## Epico 5 - Dashboard, Alertas e Notificacoes

### Objetivo

Entregar a promessa de decisao rapida sem abrir dez abas.

### Escopo

- Dashboard do dono.
- Central de notificacoes no header.
- Alertas operacionais.
- Alertas financeiros.
- Alertas de estoque.
- Alertas de campanhas/mensagens.
- Proximos passos acionaveis.

### Tarefas

- Criar tabela/modelo de notificacoes internas.
- Conectar notificacoes ao header.
- Criar alertas para estoque baixo, caixa divergente, pagamento pendente, comissao pendente e fim de plano.
- Conectar notificacoes a eventos Asaas relevantes.
- Criar resumo diario: atendimentos, receita prevista, horarios vagos, estoque baixo e pendencias.
- Mostrar CTAs contextuais: preencher horarios, ver estoque, revisar caixa, pagar repasse, abrir campanha.

### Definition of Done

- Dashboard mostra o que exige atencao hoje.
- Cada alerta relevante leva para uma acao concreta.
- Notificacoes respeitam role, permission, tenant e branch.

---

## Epico 6 - WhatsApp, Conversas e Campanhas

### Objetivo

Transformar WhatsApp de menu/tela em canal operacional real.

### Escopo

- Configuracao de provider.
- Conversas.
- Inbound webhook.
- Mensagens transacionais.
- Lembretes.
- Campanhas.
- Opt-in/opt-out.
- Status de entrega.
- Falhas/retry.

### Tarefas

- Ativar botao "Configurar WhatsApp".
- Ativar "Ver conversas".
- Ativar "Abrir campanhas".
- Ativar botao "Nova campanha".
- Implementar provider real ou modo configuravel com credenciais seguras.
- Persistir conversas e mensagens por tenant/unidade.
- Processar inbound webhooks com idempotencia.
- Criar envio transacional: confirmacao, lembrete, cancelamento e pos-atendimento.
- Criar campanhas com segmentacao, preview, aprovacao, envio e metricas.
- Respeitar consentimento e opt-out.

### Definition of Done

- Tenant consegue configurar WhatsApp, ver conversas e enviar mensagens permitidas.
- Campanha so envia marketing para clientes com consentimento.
- Webhooks e retries nao duplicam mensagens.
- Falhas ficam visiveis.

---

## Epico 7 - Barber AI Acionavel

### Objetivo

Entregar a promessa de IA como interface operacional, nao apenas tela informativa.

### Escopo

- Consulta de agenda.
- Consulta de disponibilidade.
- Busca/criacao de cliente.
- Criacao/reagendamento/cancelamento de agendamento.
- Consulta financeira.
- Clientes em risco.
- Preparacao de campanha.
- Auditoria de tool execution.

### Tarefas

- Garantir Tool Gateway com authorization server-side.
- Implementar tools para agenda, clientes, servicos, profissionais, financeiro, estoque e campanhas.
- Implementar niveis de risco e confirmacoes.
- Implementar pending actions com token/hash do payload.
- Exibir impacto antes de acoes relevantes.
- Criar insights: horarios vagos, clientes em risco, estoque baixo e queda de margem.
- Validar que IA nao acessa banco diretamente.
- Criar testes de intent, tool selection, authorization e side effects.

### Definition of Done

- IA consulta dados reais autorizados.
- IA executa acoes operacionais permitidas.
- Acoes sensiveis exigem confirmacao explicita.
- Toda tool execution e auditavel por tenant, usuario e request id.

---

## Epico 8 - Onboarding, Planos e Configuracoes por Role

### Objetivo

Permitir que alguem saia da landing, ative a conta e comece a operar a barbearia.

### Escopo

- Criacao de tenant.
- Criacao de filial.
- Horarios de funcionamento.
- Servicos.
- Equipe.
- Permissoes.
- Plano.
- Checkout Asaas.
- Preferencias de marca.
- Separacao tenant admin vs platform admin.

### Tarefas

- Criar fluxo de onboarding com progresso.
- Configurar barbearia e filiais sem scroll/overflow quebrado.
- Configurar usuarios e permissoes.
- Separar configuracoes de seguranca do tenant das funcoes de superadmin.
- Separar integracoes de tenant das integracoes de plataforma.
- Ajustar plano/cobrancas para mostrar plano atual, troca de plano, comprovantes e fluxo Asaas.
- Persistir preferencias de marca: logo e cor de destaque.
- Garantir que preferencia de cor altere apenas accent, nao cor de fonte.
- Aplicar preferencias imediatamente na UI.

### Definition of Done

- Novo cliente consegue criar conta, configurar barbearia, escolher plano e iniciar operacao.
- Menus e acoes aparecem de acordo com role e permission.
- Tenant admin nao ve operacoes tecnicas de platform admin.

---

## Epico 9 - Hardening de Producao

### Objetivo

Preparar o produto para clientes reais com confiabilidade, seguranca, observabilidade e deploy.

### Escopo

- Testes E2E.
- Concorrencia.
- Tenant isolation.
- RLS/policies.
- Logs.
- Metricas.
- Tracing.
- Rate limits.
- CI/CD.
- Deploy.
- Runbooks.

### Tarefas

- Criar E2E: login -> agenda -> check-in -> comanda -> pagamento -> comissao.
- Criar E2E: walk-in -> comanda -> produto -> pagamento -> estoque -> financeiro.
- Criar E2E: WhatsApp/IA -> disponibilidade -> agendamento.
- Criar testes de double booking.
- Criar testes de pagamento duplicado.
- Criar testes de webhook duplicado.
- Criar testes de jobs concorrentes.
- Revisar RLS, indexes e constraints.
- Implementar logging estruturado e metricas por request id.
- Configurar rate limits por tenant, usuario e endpoint sensivel.
- Configurar deploy: Vercel, Railway, Supabase e Redis.
- Criar runbooks para pagamento, WhatsApp, job, tenant isolation e restore.

### Definition of Done

- `npm run validate` passa.
- Validacao de migrations passa.
- Testes criticos passam em CI.
- Produto tem logs, metricas e runbooks para operar em producao.

---

## Mapa de Promessa da Landing para Epicos

| Promessa da landing | Epicos principais |
| --- | --- |
| Agenda inteligente | Epicos 1, 2, 7 |
| Comandas integradas | Epicos 1, 2 |
| Estoque conectado | Epicos 2, 4, 5 |
| Financeiro visivel | Epicos 2, 3, 5 |
| Barber AI | Epico 7 |
| Visao por perfil | Epicos 8, 9 |
| Dados por barbearia | Epicos 1, 8, 9 |
| Mobile e desktop | Epicos 2, 8, 9 |
| Planos e cobranca | Epico 8 |
| WhatsApp e campanhas | Epicos 6, 7 |

## Prompt de Continuidade

Use este prompt em uma nova janela:

```text
Estamos no projeto BarberOS. Leia PRODUCT_DELIVERY_EPICS.md e continue a partir dele.
Quero começar pelo Epico 1 - Operacao Real Sem Dados Simulados.
Primeiro, audite o repo para mapear onde ainda existem dados demo/dev/mock/noop nos fluxos prometidos pela landing.
Depois proponha a quebra em tarefas implementaveis e comece pela primeira tarefa de maior impacto.
Use as skills locais conforme o tipo de trabalho e preserve specs oficiais salvo pedido explicito.
```

## Status Inicial

- Epicos planejados: 9.
- Progresso de produto estimado antes destes epicos: aproximadamente 90% do PRD, mas com lacunas de fechamento de valor.
- Foco recomendado imediato: Epico 1, porque ele revela o que ainda e demonstracao e o que ja e produto real.
