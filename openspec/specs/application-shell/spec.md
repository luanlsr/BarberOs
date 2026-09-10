# application-shell Specification

## Purpose

Oferecer uma entrada operacional consistente para o BarberOS, adaptando a navegacao e a apresentacao ao dispositivo, ao tema e ao contexto de acesso do usuario.

## Requirements

### Requirement: Responsive operational shell

O sistema SHALL apresentar um shell responsivo que preserve as acoes essenciais e evite scroll horizontal nos viewports suportados, incluindo 320px, 390px, 768px, 1024px, 1440px e 1920px.

#### Scenario: Mobile navigation

- **WHEN** o usuario acessa o sistema em um viewport de smartphone
- **THEN** o sistema exibe navegacao inferior com as areas frequentes e uma acao central de criacao representada por `+`

#### Scenario: Desktop navigation

- **WHEN** o usuario acessa o sistema em um viewport de desktop
- **THEN** o sistema exibe navegacao lateral ou rail compacto sem remover as areas permitidas ao usuario

#### Scenario: Narrow viewport content

- **WHEN** o conteudo do shell e exibido em um viewport de 320px
- **THEN** textos, controles e acoes permanecem legiveis e utilizaveis sem sobreposicao ou scroll horizontal da pagina

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

### Requirement: Theme-aware visual presentation

O sistema SHALL oferecer temas light, dark e system, mantendo contraste e hierarquia visual adequados para as superficies, textos, bordas, controles e estados semanticos do shell.

#### Scenario: Explicit theme selection

- **WHEN** o usuario seleciona light ou dark
- **THEN** o shell aplica o tema escolhido de forma consistente nas telas e componentes visiveis

#### Scenario: System theme

- **WHEN** o usuario seleciona system
- **THEN** o shell acompanha a preferencia de tema do dispositivo e atualiza a apresentacao quando essa preferencia mudar

### Requirement: Resilient and accessible shell states

O sistema SHALL comunicar estados de loading, vazio, erro, desabilitado e offline quando relevantes, e SHALL manter interacao basica por toque, mouse e teclado com foco visivel, labels compreensiveis e alvos de toque de pelo menos 44x44px.

#### Scenario: Initial loading

- **WHEN** o shell aguarda dados ou sessao para renderizar uma area protegida
- **THEN** o sistema apresenta um estado de carregamento estavel sem deslocamento incoerente do layout

#### Scenario: Recoverable error

- **WHEN** uma dependencia necessaria ao shell falha
- **THEN** o sistema apresenta uma mensagem de erro compreensivel e uma acao de recuperacao quando aplicavel

#### Scenario: Keyboard and touch interaction

- **WHEN** o usuario navega pelo shell usando teclado, mouse ou toque
- **THEN** os controles principais podem receber foco ou ativacao e nao dependem exclusivamente de gesto ou apontador preciso

#### Scenario: Offline indication

- **WHEN** o dispositivo perde conectividade durante o uso do shell
- **THEN** o sistema comunica o estado offline e nao apresenta uma operacao nao confirmada como concluida

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

### Requirement: POS Cash Navigation

The system SHALL expose payment and cash register entry points in the operational shell only when the authenticated context has matching permissions and entitlements.

#### Scenario: Cash area available

- **WHEN** an authenticated actor has cash register permissions in the active branch
- **THEN** the shell exposes the Caixa area in the appropriate desktop or mobile navigation surface.

#### Scenario: Receive payment action available

- **WHEN** an authenticated actor has payment permission and a payable Comanda context
- **THEN** the shell or central action can expose a payment entry point scoped to that Comanda.

#### Scenario: Payment or cash area unavailable

- **WHEN** an actor lacks the required payment or cash permission
- **THEN** the shell hides the unavailable entry point when possible
- **AND** direct route access returns a permission-denied state without exposing protected cash or payment data.
