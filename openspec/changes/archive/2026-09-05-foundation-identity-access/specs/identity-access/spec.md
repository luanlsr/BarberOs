## Purpose

Garantir que cada operacao do BarberOS seja executada por um usuario autenticado, dentro de um tenant e de filiais autorizadas, com permissoes verificadas no servidor e trilha de auditoria para eventos sensiveis.

## ADDED Requirements

### Requirement: Authenticated session lifecycle

O sistema SHALL permitir que um usuario autentique, encerre e renove sua sessao, tratando credenciais invalidas, sessao ausente e sessao expirada sem liberar uma area protegida.

#### Scenario: Successful sign in

- **WHEN** o usuario informa credenciais validas
- **THEN** o sistema cria uma sessao autenticada e direciona o usuario para um workspace autorizado

#### Scenario: Invalid credentials

- **WHEN** o usuario informa credenciais invalidas
- **THEN** o sistema rejeita o login sem revelar qual parte da credencial falhou

#### Scenario: Expired session

- **WHEN** a sessao expira durante o uso de uma area protegida
- **THEN** o sistema interrompe o acesso aos dados, informa que a sessao expirou e solicita nova autenticacao

### Requirement: Authorized tenant and workspace context

O sistema SHALL resolver server-side um contexto autenticado contendo usuario, tenant, membership, role, permissions e branch scope antes de executar uma operacao protegida.

#### Scenario: Valid active workspace

- **WHEN** o usuario seleciona um tenant no qual possui membership ativa
- **THEN** o sistema cria o contexto desse tenant e aplica a role, permissoes e filiais associadas a essa membership

#### Scenario: Unauthorized workspace selection

- **WHEN** o usuario tenta selecionar um tenant no qual nao possui membership ativa
- **THEN** o sistema rejeita a selecao sem consultar ou revelar dados desse tenant

#### Scenario: Multiple memberships

- **WHEN** o usuario possui memberships ativas em mais de um tenant
- **THEN** o sistema permite selecionar somente um dos tenants autorizados e mantém o contexto selecionado nas operacoes subsequentes

### Requirement: Branch-scoped role and permission authorization

O sistema SHALL autorizar cada acao protegida pela combinacao de tenant, branch scope, role, permission e entitlement aplicavel, com politica de negacao por padrao.

#### Scenario: Authorized action

- **WHEN** o contexto possui a permission, o entitlement e a filial necessarios para uma acao
- **THEN** o sistema permite a execucao dentro do tenant e da filial autorizados

#### Scenario: Missing permission

- **WHEN** o contexto nao possui a permission exigida
- **THEN** o sistema rejeita a acao sem executar seu efeito colateral

#### Scenario: Branch outside scope

- **WHEN** a acao aponta para uma filial fora do branch scope do contexto
- **THEN** o sistema rejeita a acao sem revelar dados da filial

#### Scenario: Entitlement unavailable

- **WHEN** o tenant nao possui o entitlement exigido para um recurso
- **THEN** o sistema rejeita a operacao mesmo que o usuario possua uma permission relacionada

### Requirement: Tenant-isolated operational data

O sistema SHALL impedir que leituras e escritas de dados operacionais atravessem o tenant do contexto ou o escopo de filiais autorizado, usando isolamento na aplicacao e no banco.

#### Scenario: Cross-tenant read

- **WHEN** um usuario tenta consultar um registro pertencente a outro tenant
- **THEN** o sistema rejeita a consulta sem retornar o registro ou seus dados identificadores

#### Scenario: Cross-tenant write

- **WHEN** uma requisicao tenta criar ou alterar um registro com tenant diferente do contexto
- **THEN** o sistema rejeita a operacao e nenhum dado e persistido

#### Scenario: Database defense in depth

- **WHEN** uma consulta chega ao banco sem um escopo de tenant valido
- **THEN** as politicas de isolamento do banco impedem o retorno ou a alteracao de registros operacionais

### Requirement: Auditable identity and access changes

O sistema SHALL registrar alteracoes sensiveis de identidade, membership, role, permission, entitlement e escopo de filial com ator, tenant, acao, entidade, resultado e request id quando disponivel.

#### Scenario: Membership permission change

- **WHEN** uma membership recebe, perde ou altera uma permission
- **THEN** o sistema persiste um evento de auditoria com o estado anterior e o novo estado

#### Scenario: Denied sensitive operation

- **WHEN** uma operacao sensivel de acesso e rejeitada por autorizacao
- **THEN** o sistema registra a tentativa sem armazenar secrets ou credenciais

### Requirement: Server-side secret boundary

O sistema SHALL manter credenciais administrativas, chaves de service role e secrets de integracoes exclusivamente em ambientes server-side controlados.

#### Scenario: Client bundle inspection

- **WHEN** os bundles e configuracoes publicas sao entregues ao navegador
- **THEN** nenhum secret administrativo ou service role pode estar presente no cliente

#### Scenario: Browser request authorization

- **WHEN** o navegador envia um identificador de tenant ou branch
- **THEN** o servidor valida esse identificador contra a sessao e membership antes de usalo
