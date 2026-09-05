## Why

O shell atual possui um adapter de sessao para desenvolvimento, mas ainda nao existe uma fundacao de identidade e isolamento para proteger dados operacionais reais. Esta mudanca e necessaria agora porque Agenda, POS e Financeiro dependem de tenant, filial, membership e permissoes confiaveis desde o primeiro caso de uso.

## What Changes

- Adicionar autenticacao baseada em sessao com login, logout, renovacao e expiracao tratada.
- Adicionar o modelo de tenant, branch, membership, role e permission.
- Resolver server-side o `RequestContext` com usuario, tenant, membership, role, permissoes e escopo de filiais.
- Aplicar autorizacao e entitlements nos route handlers e casos de uso, sem confiar em identificadores enviados pelo cliente.
- Adicionar isolamento de dados com `tenant_id`, `branch_id` quando aplicavel e politicas RLS.
- Adicionar seeds de desenvolvimento e migrations versionadas para a fundacao.
- Registrar auditoria para alteracoes sensiveis de identidade, acesso e configuracao.
- Substituir o uso produtivo do adapter de sessao de desenvolvimento por uma integracao real, mantendo o adapter apenas para testes locais controlados.
- Adicionar estados de UI para sessao expirada, login, troca de escopo quando aplicavel e acesso negado.
- Adicionar testes de autenticacao, permissao, branch scope, isolamento entre tenants e ausencia de secrets no cliente.

## Capabilities

### New Capabilities

- `identity-access`: autentica usuarios e garante contexto, isolamento, autorizacao e auditoria para operacoes do BarberOS.

### Modified Capabilities

- `application-shell`: integrar o shell ao estado real de sessao, contexto autorizado e fluxos de sessao expirada e acesso negado.

## Impact

- `apps/web`: camada de autenticacao, `RequestContext`, middleware/adapters, autorizacao, rotas protegidas e telas de sessao.
- Banco Supabase/PostgreSQL: migrations, tabelas de identidade e tenancy, constraints, indexes, RLS e seeds.
- Packages compartilhados: contratos de sessao, permissao, contexto e erros de autorizacao.
- Testes unitarios, de integracao, E2E e verificacoes de bundle para garantir isolamento e ausencia de secrets.
- A integracao prepara as fronteiras usadas posteriormente por worker, Tool Gateway e Barber AI, sem permitir acesso direto da IA ao banco operacional.
