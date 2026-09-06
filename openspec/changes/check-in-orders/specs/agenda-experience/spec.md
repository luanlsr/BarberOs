# agenda-experience Specification Delta

## MODIFIED Requirements

### Requirement: Appointment card and detail

O sistema SHALL apresentar cards e detalhes de agendamento com horario, cliente, profissional, servicos, status e acoes permitidas como check-in, reagendar, cancelar e contato.

#### Scenario: Appointment card visible information

- **WHEN** a agenda possui agendamentos no periodo exibido
- **THEN** cada card mostra informacoes essenciais suficientes para operacao sem abrir detalhes

#### Scenario: Appointment detail

- **WHEN** o usuario abre um agendamento autorizado
- **THEN** o sistema exibe dados completos, historico relevante e acoes filtradas por permissao

#### Scenario: Permission-filtered action

- **WHEN** o usuario nao possui permissao para cancelar ou reagendar
- **THEN** a interface oculta a acao quando possivel e impede a execucao caso a rota seja acionada diretamente

#### Scenario: Check-in action opens Comanda

- **WHEN** um usuario autorizado com permissoes de check-in e Comanda aciona check-in em um agendamento elegivel
- **THEN** the UI sends the check-in request
- **AND** navigates to the opened Comanda when the request succeeds
- **AND** displays a clear recoverable error state if check-in fails.