## ADDED Requirements

### Requirement: Core operations navigation

O sistema SHALL expor as areas de Agenda, Clientes, Equipe e Servicos no shell quando o contexto autenticado possuir as permissoes correspondentes e o entitlement `core.operations`.

#### Scenario: Core operations areas available

- **WHEN** o usuario possui permissoes para agenda, clientes, profissionais ou servicos no tenant ativo
- **THEN** o shell exibe as entradas operacionais permitidas na navegacao adequada ao viewport

#### Scenario: Core operations entitlement unavailable

- **WHEN** o tenant nao possui o entitlement `core.operations`
- **THEN** o shell nao permite iniciar fluxos operacionais de agenda, clientes, equipe ou servicos

#### Scenario: Central action filters operations

- **WHEN** o usuario abre a acao central `+`
- **THEN** o sistema exibe somente criacoes operacionais permitidas pelo contexto, como novo agendamento ou novo cliente
