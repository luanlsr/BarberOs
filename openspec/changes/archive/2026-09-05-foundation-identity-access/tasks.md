## 1. Contratos e estrutura da fundacao

- [x] 1.1 Definir os contratos compartilhados de sessao, `RequestContext`, roles, permissions, entitlements e erros de autenticacao/autorizacao, verificando typecheck dos packages consumidores
- [x] 1.2 Criar as fronteiras dos modulos `identity`, `tenants`, `branches`, `permissions` e `audit` com portas de infraestrutura, verificando que domain/application nao importam Next.js, React ou SDK do Supabase
- [x] 1.3 Separar variaveis publicas de secrets do Supabase e documentar o ambiente necessario, verificando falha clara quando uma variavel server-side obrigatoria estiver ausente

## 2. Modelo de dados e migrations

- [x] 2.1 Criar migration versionada para tenants, branches, memberships e escopo de branches, verificando foreign keys, status ativo e unicidades essenciais
- [x] 2.2 Criar migration para catalogo de roles, permissions e entitlements e suas relacoes, verificando que os identificadores iniciais sao estaveis e sem duplicidade
- [x] 2.3 Criar migration para `audit_logs` com ator, tenant, entidade, acao, resultado, before/after e request id, verificando que secrets nao sao campos obrigatorios nem armazenados por padrao
- [x] 2.4 Adicionar indexes e constraints para consultas por usuario, tenant, branch e membership, verificando planos de consulta basicos no banco de teste
- [x] 2.5 Criar seeds idempotentes de desenvolvimento para um tenant com duas branches, memberships e permissions distintas, verificando que a segunda execucao nao duplica registros

## 3. RLS e isolamento no banco

- [x] 3.1 Implementar funcoes auxiliares e policies RLS para validar usuario autenticado, membership ativa, tenant e branch scope, verificando leitura e escrita autorizadas no banco de teste
- [x] 3.2 Aplicar a estrategia de tenant/branch scope a uma tabela operacional de exemplo usada pela rota protegida, verificando que tenant e branch sao obrigatorios quando aplicavel
- [x] 3.3 Adicionar verificacoes de migration para detectar tabelas operacionais sem policy ou coluna de tenant exigida, verificando falha da checagem quando uma protecao e removida artificialmente

## 4. Autenticacao e sessao

- [x] 4.1 Implementar clientes Supabase server-side e browser-side com cookies e refresh controlado, verificando que a service role nunca e importada por codigo de cliente
- [x] 4.2 Implementar login, logout e tratamento de credenciais invalidas, verificando sucesso, erro generico e encerramento da sessao em testes de integracao
- [x] 4.3 Implementar middleware ou adaptador de protecao de rotas com renovacao de sessao, verificando que sessao ausente ou expirada nao acessa dados protegidos
- [x] 4.4 Manter o adapter de desenvolvimento somente sob flag explicita de desenvolvimento/teste, verificando que ele nao e selecionado em build de producao

## 5. Contexto e autorizacao server-side

- [x] 5.1 Implementar o resolver de `RequestContext` a partir da sessao e workspace solicitado, verificando preenchimento de user, tenant, membership, role, permissions e branch scope
- [x] 5.2 Implementar selecao e troca de tenant/branch validada contra memberships ativas, verificando rejeicao de workspace inexistente, inativo ou fora do escopo
- [x] 5.3 Implementar `AuthorizationService` com verificacao de permission, entitlement e branch alvo, verificando politica deny-by-default e erros tipados sem efeito colateral
- [x] 5.4 Criar uma rota protegida de verificacao de contexto e um repository tenant-scoped, verificando que nenhum caminho autenticado executa consulta global sem escopo
- [x] 5.5 Padronizar respostas de nao autenticado, proibido e recurso fora do escopo, verificando que nenhuma resposta revela dados do tenant ou branch bloqueado

## 6. Auditoria

- [x] 6.1 Implementar o caso de uso e repository de auditoria com request id e whitelist de campos, verificando persistencia de before/after sem tokens, senhas ou secrets
- [x] 6.2 Integrar auditoria a alteracoes de membership, role, permission, entitlement e branch scope, verificando ator, tenant, entidade, acao e resultado em cada evento
- [x] 6.3 Registrar tentativas sensiveis negadas sem transformar falhas de auditoria em autorizacao positiva, verificando comportamento quando o armazenamento de auditoria falha

## 7. Integracao do application shell

- [x] 7.1 Substituir a sessao fixa do provider produtivo pelo contexto resolvido no servidor, verificando identidade, tenant, branch e role reais no shell
- [x] 7.2 Atualizar filtragem de navegacao e protecao de rotas com permissions do contexto autorizado, verificando que esconder uma opcao nao substitui o bloqueio server-side
- [x] 7.3 Implementar login, sessao expirada, troca de workspace e acesso negado no shell, verificando estados loading, erro, recuperacao e ausencia de dados protegidos
- [x] 7.4 Validar troca de tenant/branch sem hydration inconsistente ou exibicao de contexto antigo, verificando comportamento nos viewports P0 e temas light/dark

## 8. Testes de seguranca e entrega

- [x] 8.1 Adicionar testes unitarios para resolver de contexto, permissions, entitlements, branch scope e transicoes de sessao, verificando casos permitidos e negados
- [x] 8.2 Adicionar testes de integracao para isolamento entre dois tenants e duas branches, verificando que leituras e escritas cruzadas retornam erro ou ausencia sem vazamento
- [x] 8.3 Adicionar testes E2E de login, rota protegida, acesso negado, sessao expirada e troca de workspace, verificando interacao por teclado e toque nos fluxos do shell
- [x] 8.4 Adicionar verificacao de bundle e configuracao para secrets e service role, verificando que nenhum segredo administrativo aparece em artefatos client-side
- [x] 8.5 Executar migrations, seeds, lint, typecheck, testes, build web e `openspec validate foundation-identity-access`, verificando que a mudanca fica pronta para apply sem tarefas incompletas
