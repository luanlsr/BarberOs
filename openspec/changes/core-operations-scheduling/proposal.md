## Why

Foundation de identidade e acesso ja esta pronta; o proximo valor do MVP e permitir que a barbearia configure equipe, servicos e clientes para operar a agenda real. Esta mudanca cria a base de Core Operations para que recepcao, profissionais e proprietarios possam consultar disponibilidade e criar agendamentos com isolamento por tenant/filial e protecao contra conflitos.

## What Changes

- Introduz cadastro operacional tenant-scoped para profissionais, servicos e clientes, com status, escopo de filial e permissoes server-side.
- Introduz horarios de trabalho, bloqueios e calculo de disponibilidade por filial/profissional/servico.
- Introduz agendamentos com status oficiais, servicos agendados, historico de status e prevencao de double booking no banco.
- Introduz APIs e contratos TypeScript para listar, criar e atualizar dados operacionais de agenda.
- Introduz experiencia inicial de Agenda, Clientes, Equipe e Servicos no shell existente, com estados responsivos, vazios, loading, erro, offline e permission-aware.
- Prepara o fluxo futuro de check-in sem implementar ainda abertura de Comanda/POS nesta mudanca.

## Capabilities

### New Capabilities

- `operations-directory`: Cadastro operacional de profissionais, servicos e clientes dentro de tenant/filial autorizados.
- `scheduling`: Horarios, bloqueios, disponibilidade, agendamentos e historico de status com prevencao de conflito.
- `agenda-experience`: Experiencia responsiva e permission-aware para operar agenda e iniciar cadastros relacionados.

### Modified Capabilities

- `application-shell`: Navegacao passa a expor areas operacionais de Core Operations conforme permissoes e estado do workspace.
- `identity-access`: Permissoes e entitlements de Core Operations passam a ser usados por profissionais, servicos, clientes e agenda.

## Impact

- Banco/Supabase: novas tabelas tenant-scoped para professionals, services, customers, schedules, schedule_blocks, appointments, appointment_services e appointment_status_history; indices, RLS e constraint de conflito temporal.
- Contracts: schemas Zod e tipos para entidades, comandos, filtros, disponibilidade, status e erros estaveis de Core Operations.
- Web/API: route handlers finos em `apps/web/app/api/v1/...` chamando application services com `RequestContext`.
- Domain/Application: novos modulos de professionals, services, customers e scheduling seguindo fronteiras domain/application/infrastructure.
- UI: novas telas/componentes para agenda, appointment card/detail, forms rapidos de cliente/servico/profissional e estados responsivos.
- Tests: unit, integration e E2E cobrindo tenant isolation, branch scope, permissoes, disponibilidade e conflito de agendamento.
