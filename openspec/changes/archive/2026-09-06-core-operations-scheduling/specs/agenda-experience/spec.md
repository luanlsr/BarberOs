## Purpose

Define a experiencia operacional de agenda para recepcao, profissionais e proprietarios criarem, acompanharem e atualizarem agendamentos em mobile, tablet e desktop.

## ADDED Requirements

### Requirement: Responsive agenda views

O sistema SHALL apresentar a agenda com composicao adaptada a smartphone, tablet e desktop, mantendo leitura clara de horarios, profissionais, clientes, servicos e status.

#### Scenario: Mobile day timeline

- **WHEN** o usuario acessa a agenda em viewport de smartphone
- **THEN** o sistema exibe uma timeline diaria vertical com filtros essenciais e acoes touch de pelo menos 44x44px

#### Scenario: Tablet professional columns

- **WHEN** o usuario acessa a agenda em viewport de tablet
- **THEN** o sistema pode exibir 2 a 4 profissionais lado a lado conforme espaco disponivel

#### Scenario: Desktop operational grid

- **WHEN** o usuario acessa a agenda em viewport de desktop
- **THEN** o sistema exibe grade operacional por horario e profissional, aproveitando largura sem aumentar texto de forma inadequada

### Requirement: Appointment card and detail

O sistema SHALL apresentar cards e detalhes de agendamento com horario, cliente, profissional, servicos, status e acoes permitidas como check-in futuro, reagendar, cancelar e contato.

#### Scenario: Appointment card visible information

- **WHEN** a agenda possui agendamentos no periodo exibido
- **THEN** cada card mostra informacoes essenciais suficientes para operacao sem abrir detalhes

#### Scenario: Appointment detail

- **WHEN** o usuario abre um agendamento autorizado
- **THEN** o sistema exibe dados completos, historico relevante e acoes filtradas por permissao

#### Scenario: Permission-filtered action

- **WHEN** o usuario nao possui permissao para cancelar ou reagendar
- **THEN** a interface oculta a acao quando possivel e impede a execucao caso a rota seja acionada diretamente

### Requirement: Appointment creation flow

O sistema SHALL oferecer fluxo para novo agendamento com selecao ou cadastro rapido de cliente, servico, profissional, data, horario disponivel e confirmacao final.

#### Scenario: Mobile stepped creation

- **WHEN** o usuario cria um agendamento em smartphone
- **THEN** o sistema apresenta fluxo em etapas com progresso discreto e sem exigir scroll horizontal

#### Scenario: Desktop side panel creation

- **WHEN** o usuario cria um agendamento em desktop a partir da agenda
- **THEN** o sistema permite preencher o agendamento mantendo a agenda visivel quando houver espaco suficiente

#### Scenario: Conflict feedback

- **WHEN** a confirmacao falha por conflito de horario
- **THEN** a interface informa que o horario nao esta mais disponivel e oferece atualizar disponibilidade

### Requirement: Agenda filters and empty states

O sistema SHALL permitir filtrar agenda por data, filial e profissional, comunicando estados de loading, vazio, erro e offline de forma estavel.

#### Scenario: Empty agenda day

- **WHEN** nao existem agendamentos no periodo filtrado
- **THEN** o sistema exibe estado vazio com acao permitida para criar novo agendamento

#### Scenario: Loading agenda

- **WHEN** a agenda esta carregando dados
- **THEN** o sistema exibe skeleton ou estado de carregamento estavel sem deslocamento incoerente

#### Scenario: Offline agenda

- **WHEN** o dispositivo esta offline
- **THEN** o sistema comunica o estado offline e desabilita acoes que exigem confirmacao do servidor

### Requirement: Role-aware agenda behavior

O sistema SHALL adaptar dados e acoes de agenda ao role, permissions e branch scope resolvidos server-side.

#### Scenario: Professional own agenda

- **WHEN** um usuario profissional possui acesso limitado a propria agenda
- **THEN** o sistema restringe a visualizacao aos profissionais e filiais permitidos pelo contexto

#### Scenario: Receptionist general agenda

- **WHEN** uma recepcionista possui permissao de agenda em uma filial
- **THEN** o sistema permite operar agendamentos dessa filial sem exibir areas financeiras sensiveis

#### Scenario: Owner multi-branch agenda

- **WHEN** um proprietario possui escopo para multiplas filiais
- **THEN** o sistema permite alternar a filial ativa e atualiza a agenda apos validacao do servidor
