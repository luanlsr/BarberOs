# scheduling Specification Delta

## MODIFIED Requirements

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