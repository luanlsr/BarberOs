## Context

O monorepo possui uma web Next.js executavel e um shell com `SessionProvider` baseado em uma sessao fixa de desenvolvimento. A arquitetura exige um monolito modular com autenticacao no `apps/web`, PostgreSQL/Supabase como fonte de verdade, contexto de tenant em toda operacao protegida e RLS como defesa adicional.

O contrato detalhado esta em `specs/identity-access/spec.md` e o shell existente e atualizado em `specs/application-shell/spec.md`. A primeira implementacao deve preparar os modulos posteriores sem criar dependencia direta entre dominio e SDKs de infraestrutura.

## Goals / Non-Goals

**Goals:**

- Entregar uma sessao real e verificavel no servidor para a web.
- Modelar tenant, branch, membership, role, permission e entitlement com isolamento explicito.
- Produzir um `RequestContext` confiavel antes de executar casos de uso protegidos.
- Centralizar autorizacao, escopo de filial e erros de acesso.
- Usar RLS e constraints como defesa adicional contra vazamento entre tenants.
- Tornar auditoria e testes de isolamento parte da fundacao, nao uma tarefa posterior.
- Manter o shell funcional durante a transicao do adapter de desenvolvimento.

**Non-Goals:**

- Implementar Agenda, POS, Financeiro, WhatsApp ou ferramentas de IA nesta mudanca.
- Implementar MFA, login social, convite completo de usuarios ou billing SaaS, salvo contratos minimos necessarios para deixar a fundacao extensivel.
- Criar microsservicos de auth, permissions ou tenancy.
- Permitir que o cliente escolha tenant, branch, role ou permission sem validacao server-side.

## Decisions

### Auth provider e sessao

Usar Supabase Auth como provedor e manter a sessao em cookies gerenciados no servidor para requests da web. Criar uma porta de autenticacao no modulo de identidade para que application services dependam de um contrato, nao do SDK do Supabase.

Alternativas consideradas: implementar JWT proprio, o que duplicaria login, refresh e revogacao; ou usar um provedor externo diretamente no cliente, o que dificultaria a fronteira server-side. Supabase Auth ja e a decisao arquitetural do projeto e reduz a superficie operacional.

### Modulos e fronteiras

Organizar a fundacao em modulos de `identity`, `tenants`, `branches`, `permissions` e `audit`, com `domain`, `application`, `infrastructure` e `presentation` quando houver codigo suficiente. Route handlers e middleware apenas adaptam request, sessao e resposta; resolucao de contexto e autorizacao ficam em services reutilizaveis.

Alternativa considerada: concentrar tudo em middleware. Middleware pode bloquear rotas, mas nao possui contexto suficiente para substituir autorizacao no caso de uso e no repository.

### Modelo de membership e escopo

Uma membership liga o usuario autenticado a um tenant e possui role. O escopo de filiais sera representado explicitamente, permitindo uma membership com todas as filiais ou com uma lista de branches autorizadas. O contexto ativo pode ser selecionado pela interface, mas o servidor sempre verifica a membership antes de aceita-lo.

O catalogo inicial de roles e permissions sera versionado por seed/migration, com nomes estaveis para os contratos. A verificacao usara permissions e entitlements, mantendo a regra de negocio fora de comparacoes de role espalhadas pelo codigo.

Alternativa considerada: derivar todas as permissoes apenas no frontend. Isso melhora a apresentacao, mas nao constitui autorizacao e nao protege chamadas diretas.

### RequestContext e autorizacao

Criar um resolver server-side que transforme a sessao e o workspace solicitado em `RequestContext` contendo `userId`, `tenantId`, `membershipId`, `role`, `permissions` e `branchScope`. Caso qualquer parte seja invalida, a operacao termina com erro tipado de autenticacao ou autorizacao antes de acessar o caso de uso.

O `AuthorizationService` recebera o contexto e uma declaracao de permission, entitlement e branch alvo. Repositories operacionais receberao escopo explicito e nao oferecerao consultas globais para chamadas autenticadas.

### Persistencia e RLS

Criar migrations versionadas para tenants, branches, memberships, branch scope, permission catalog, entitlements e audit logs. Entidades operacionais futuras carregarao `tenant_id` e `branch_id` quando aplicavel.

As policies RLS usarao a identidade autenticada e a relacao de membership para validar tenant e branch, enquanto a camada de aplicacao fara a mesma validacao com mensagens e erros consistentes. O acesso administrativo por service role ficara restrito a processos server-side controlados e nao sera usado pelo navegador.

Alternativa considerada: confiar apenas em RLS. Isso deixa regras de produto, entitlements e feedback de autorizacao dependentes do banco; a abordagem escolhida usa defense in depth.

### Auditoria

Registrar eventos de alteracao de membership, role, permission, entitlement, escopo de filial e tentativas sensiveis negadas. O payload de auditoria deve evitar credenciais e secrets, carregar ator/tenant/entidade/acao/resultado e aceitar `request_id` para correlacao.

### Transicao do shell

Manter `developmentSession` isolada e explicitamente habilitada apenas em desenvolvimento/testes controlados. O provider de producao carregara o contexto resolvido pelo servidor; ausencia ou expiracao de sessao renderiza login/sessao expirada e nao uma identidade sintetica.

## Risks / Trade-offs

- [Risco] Policies RLS com joins de membership podem aumentar custo de consultas. -> Criar indexes para user, tenant, branch e membership; medir consultas representativas e manter repositories tenant-scoped.
- [Risco] Hydration do shell pode exibir contexto antigo durante troca de workspace. -> Atualizar o shell somente depois da resposta validada e invalidar dados dependentes do escopo.
- [Risco] Migrations incompletas podem deixar tabelas operacionais sem protecao. -> Validar migrations em banco de teste, exigir colunas e policies antes de habilitar rotas protegidas e incluir teste de schema na CI.
- [Risco] O adapter de desenvolvimento mascarar falhas de sessao real. -> Cobrir explicitamente sessao ausente/expirada e executar E2E com modo real e modo de teste separado.
- [Risco] Alteracoes de permission quebram telas existentes. -> Centralizar catalogo, usar estado permission denied e manter compatibilidade dos nomes de permission durante a primeira versao.
- [Risco] Auditoria armazenar dados sensiveis por engano. -> Definir whitelist de campos auditaveis, mascarar tokens e revisar payloads nos testes.

## Migration Plan

1. Criar migrations e seeds da fundacao, incluindo constraints, indexes, funcoes auxiliares e RLS.
2. Implementar portas de auth, resolver de contexto, autorizacao e auditoria no servidor.
3. Adicionar uma rota protegida de verificacao e adaptar contratos compartilhados.
4. Integrar o shell a sessao real, mantendo o adapter de desenvolvimento somente para testes controlados.
5. Executar testes unitarios, de integracao e E2E de isolamento, branch scope, permissao, sessao expirada e bundle sem secrets.
6. Fazer rollout com o modo real habilitado no ambiente de teste; em caso de falha, reverter a flag de integracao do shell sem remover migrations ja aplicadas.
7. Depois da estabilizacao, remover qualquer caminho de desenvolvimento que possa ser ativado acidentalmente em producao.

Rollback: o deploy da web pode voltar para a versao anterior enquanto as tabelas novas permanecem additive. Nao remover colunas, policies ou dados de auditoria em rollback; uma migration de contracao sera considerada somente depois de todos os consumidores migrarem.

## Open Questions

- O fluxo de convite de novos membros pode ser detalhado na fatia seguinte sem alterar o modelo base de membership.
- MFA e login social permanecem extensoes do provedor e nao alteram o `RequestContext` desta mudanca.
