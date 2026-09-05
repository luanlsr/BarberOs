## ADDED Requirements

### Requirement: Core operations permission catalog
O sistema SHALL reconhecer e aplicar permissoes de Core Operations para profissionais, servicos, clientes, horarios e agendamentos, mantendo negacao por padrao quando uma permissao nao estiver presente.

#### Scenario: Professional permission check
- **WHEN** uma acao de profissional exige `professionals.read`, `professionals.create` ou `professionals.update`
- **THEN** o sistema valida a permissao no servidor antes de retornar dados ou persistir alteracoes

#### Scenario: Service permission check
- **WHEN** uma acao de servico exige `services.read`, `services.create` ou `services.update`
- **THEN** o sistema valida a permissao no servidor antes de retornar dados ou persistir alteracoes

#### Scenario: Scheduling permission check
- **WHEN** uma acao de horarios, bloqueios ou disponibilidade exige permissao operacional
- **THEN** o sistema valida permissao, entitlement e branch scope antes de executar a operacao
