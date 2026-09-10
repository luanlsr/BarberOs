## Purpose

Define horarios, bloqueios, disponibilidade e agendamentos do BarberOS para operar a agenda real da barbearia com consistencia, historico e protecao contra conflitos.

## Requirements

### Requirement: Professional working schedules

O sistema SHALL permitir configurar horarios recorrentes de trabalho por profissional, filial e dia da semana, incluindo hora inicial, hora final, intervalos opcionais e timezone da filial.

#### Scenario: Configure working schedule

- **WHEN** um usuario autorizado define o horario de trabalho de um profissional em uma filial permitida
- **THEN** o sistema usa esse horario como base para calculo de disponibilidade futura

#### Scenario: Schedule outside branch scope

- **WHEN** a configuracao aponta para uma filial fora do escopo autorizado
- **THEN** o sistema rejeita a operacao sem alterar horarios existentes

### Requirement: Schedule blocks

O sistema SHALL permitir registrar bloqueios de agenda por profissional e filial para pausas, folgas, ferias, manutencao ou indisponibilidade manual, com intervalo temporal, motivo opcional e status.

#### Scenario: Create block

- **WHEN** um usuario autorizado cria um bloqueio dentro de uma filial permitida
- **THEN** o sistema remove o intervalo bloqueado do calculo de disponibilidade

#### Scenario: Block overlaps appointments

- **WHEN** um bloqueio conflita com agendamentos ativos existentes
- **THEN** o sistema rejeita o bloqueio ou exige resolucao explicita sem cancelar agendamentos silenciosamente

### Requirement: Availability calculation

O sistema SHALL calcular disponibilidade por tenant, filial, profissional opcional, servico e intervalo de datas usando horarios de trabalho, bloqueios, agendamentos ativos, duracao do servico e timezone da filial.

#### Scenario: Available slots for service

- **WHEN** um usuario autorizado consulta disponibilidade para um servico em uma filial
- **THEN** o sistema retorna slots que comportam a duracao do servico sem cruzar bloqueios ou agendamentos ativos

#### Scenario: No available slot

- **WHEN** nao existe horario compativel para os filtros informados
- **THEN** o sistema retorna lista vazia e metadados suficientes para a interface apresentar estado vazio

#### Scenario: Unauthorized availability scope

- **WHEN** a consulta usa filial ou profissional fora do contexto autorizado
- **THEN** o sistema rejeita a consulta sem revelar a agenda desse escopo

### Requirement: Appointment creation

O sistema SHALL permitir criar agendamentos tenant-scoped com cliente, filial, profissional, servicos, inicio, fim calculado, origem, status inicial e observacoes opcionais.

#### Scenario: Create confirmed appointment

- **WHEN** um usuario com `appointments.create` cria um agendamento em slot disponivel
- **THEN** o sistema persiste o agendamento com status `CONFIRMED`, vincula seus servicos e registra historico inicial

#### Scenario: Create pending appointment

- **WHEN** a politica do fluxo exige confirmacao posterior
- **THEN** o sistema permite persistir o agendamento com status `PENDING` e historico inicial

#### Scenario: Invalid appointment input

- **WHEN** cliente, servico, profissional ou filial nao pertence ao tenant ativo
- **THEN** o sistema rejeita a criacao sem persistir dados parciais

### Requirement: Appointment conflict prevention

O sistema SHALL impedir double booking para o mesmo profissional em agendamentos ativos usando validacao de aplicacao e protecao no banco sobre intervalos temporais.

#### Scenario: Concurrent appointment conflict

- **WHEN** duas requisicoes simultaneas tentam reservar intervalos sobrepostos para o mesmo profissional
- **THEN** apenas uma requisicao e persistida e a outra recebe codigo de erro estavel de conflito

#### Scenario: Non-conflicting appointment

- **WHEN** dois agendamentos do mesmo profissional possuem intervalos sem intersecao
- **THEN** o sistema permite ambos quando os demais requisitos forem validos

#### Scenario: Cancelled appointment frees slot

- **WHEN** um agendamento e `CANCELLED` ou `NO_SHOW`
- **THEN** seu intervalo nao bloqueia novas reservas ativas para o mesmo profissional

### Requirement: Appointment lifecycle and history

O sistema SHALL controlar agendamentos pelos status `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED` e `NO_SHOW`, registrando historico para criacao, toda alteracao relevante de status e check-in transacional quando a Comanda for aberta.

#### Scenario: Status update

- **WHEN** um usuario autorizado altera o status de um agendamento
- **THEN** o sistema persiste o novo status e adiciona historico com status anterior, novo status, ator, timestamp e motivo quando informado

#### Scenario: Invalid status transition

- **WHEN** a alteracao solicitada viola o ciclo de vida permitido
- **THEN** o sistema rejeita a transicao e mantem o status anterior

#### Scenario: Appointment detail history

- **WHEN** um usuario autorizado abre detalhes de um agendamento
- **THEN** o sistema permite consultar o historico de status do agendamento dentro do tenant ativo

#### Scenario: Check-in starts the linked Comanda

- **WHEN** um usuario autorizado realiza check-in em um agendamento elegivel dentro do escopo de filial
- **THEN** the appointment transitions to `CHECKED_IN`
- **AND** the transition is persisted only if the linked Comanda and initial items are created successfully
- **AND** the appointment history records the check-in actor and timestamp.

### Requirement: Appointment reschedule and cancellation

O sistema SHALL permitir reagendar e cancelar agendamentos autorizados, preservando historico, validando disponibilidade e aplicando permissao e escopo de filial.

#### Scenario: Reschedule to available slot

- **WHEN** um usuario com `appointments.update` move um agendamento para slot disponivel
- **THEN** o sistema atualiza inicio/fim e registra historico de reagendamento

#### Scenario: Reschedule to conflicting slot

- **WHEN** o novo intervalo conflita com outro agendamento ativo do mesmo profissional
- **THEN** o sistema rejeita o reagendamento e preserva o horario anterior

#### Scenario: Cancel appointment

- **WHEN** um usuario com `appointments.cancel` cancela um agendamento autorizado
- **THEN** o sistema marca status `CANCELLED`, registra motivo quando informado e libera o slot para nova disponibilidade
