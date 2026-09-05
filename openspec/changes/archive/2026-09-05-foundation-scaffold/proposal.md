## Why

O BarberOS ainda nao possui uma base executavel que permita implementar as capacidades do produto com consistencia. Precisamos estabelecer o monorepo, a verificacao automatizada e o shell PWA inicial agora, para que as proximas entregas possam respeitar a arquitetura modular, a experiencia mobile first e os criterios de qualidade desde o primeiro incremento.

## What Changes

- Criar a estrutura inicial do monorepo para web, worker, AI e packages compartilhados.
- Definir scripts de desenvolvimento, lint, formatacao, typecheck e testes.
- Configurar ambientes sem secrets versionados e registrar convencoes de execucao.
- Configurar CI com verificacoes estaticas e testes.
- Criar o application shell responsivo do BarberOS com temas light, dark e system.
- Adaptar a navegacao por viewport: sidebar/rail no desktop e bottom navigation com acao central `+` no mobile.
- Garantir os estados basicos do shell: loading, erro, vazio e acesso negado quando aplicavel.

## Capabilities

### New Capabilities

- `application-shell`: shell PWA responsivo, role-aware e preparado para os fluxos operacionais do BarberOS.

### Modified Capabilities

Nenhuma. As specs existentes em `specs/` sao fontes de contexto do projeto; ainda nao ha capabilities publicadas em `openspec/specs/` para modificar.

## Impact

- Novo scaffold de monorepo envolvendo `apps/web`, `apps/worker`, `apps/ai` e `packages/`.
- Configuracoes de package manager, TypeScript, lint, formatacao, testes e CI.
- Fundacao de UI compartilhada, tokens de design, temas e navegacao responsiva.
- Nenhuma integracao externa de negocio sera implementada nesta mudanca.
- Nenhuma regra de agenda, pagamento, financeiro ou IA sera implementada nesta mudanca; elas serao tratadas em changes posteriores.
