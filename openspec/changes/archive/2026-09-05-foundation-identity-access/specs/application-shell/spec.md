## MODIFIED Requirements

### Requirement: Permission-aware navigation

O sistema SHALL adaptar a navegacao e as acoes visiveis ao tenant, branch, role e permissions resolvidos a partir da sessao autenticada no servidor.

#### Scenario: Allowed area

- **WHEN** o usuario possui permissao para uma area do produto
- **THEN** o sistema exibe a area e permite iniciar a navegacao para ela

#### Scenario: Unavailable area

- **WHEN** o usuario nao possui permissao para uma area
- **THEN** o sistema oculta a acao quando isso for possivel e impede o acesso direto caso a rota seja solicitada

#### Scenario: Permission denied feedback

- **WHEN** o usuario tenta acessar uma area sem permissao por uma entrada direta
- **THEN** o sistema apresenta um estado de acesso negado sem revelar dados da area protegida

#### Scenario: Session unavailable

- **WHEN** a sessao autenticada esta ausente, invalida ou expirada
- **THEN** o sistema nao exibe dados protegidos e direciona o usuario para uma entrada de autenticacao apropriada

## ADDED Requirements

### Requirement: Session and workspace feedback

O sistema SHALL comunicar no shell o estado de autenticacao e do workspace ativo sem tratar dados enviados pelo cliente como prova de autorizacao.

#### Scenario: Authenticated workspace context

- **WHEN** o servidor resolve uma sessao com tenant e branch autorizados
- **THEN** o shell exibe o workspace ativo e a identidade do usuario conforme o contexto retornado pelo servidor

#### Scenario: Workspace change

- **WHEN** o usuario troca para outro tenant ou branch permitido
- **THEN** o shell atualiza a navegacao e o contexto visivel somente depois que o novo escopo for validado

#### Scenario: Session expiration recovery

- **WHEN** a sessao expira durante a navegacao
- **THEN** o shell preserva um estado estavel, informa a necessidade de autenticar novamente e nao apresenta uma operacao protegida como concluida
