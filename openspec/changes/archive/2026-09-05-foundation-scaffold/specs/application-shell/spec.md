## Purpose

Oferecer uma entrada operacional consistente para o BarberOS, adaptando a navegacao e a apresentacao ao dispositivo, ao tema e ao contexto de acesso do usuario.

## ADDED Requirements

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

O sistema SHALL adaptar a navegacao e as acoes visiveis ao tenant, branch, role e permissions do usuario autenticado.

#### Scenario: Allowed area

- **WHEN** o usuario possui permissao para uma area do produto
- **THEN** o sistema exibe a area e permite iniciar a navegacao para ela

#### Scenario: Unavailable area

- **WHEN** o usuario nao possui permissao para uma area
- **THEN** o sistema oculta a acao quando isso for possivel e impede o acesso direto caso a rota seja solicitada

#### Scenario: Permission denied feedback

- **WHEN** o usuario tenta acessar uma area sem permissao por uma entrada direta
- **THEN** o sistema apresenta um estado de acesso negado sem revelar dados da area protegida

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
