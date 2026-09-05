## 1. Monorepo e runtime

- [x] 1.1 Configurar o workspace do monorepo com `apps/web`, `apps/worker`, `apps/ai` e os packages iniciais, verificando que a arvore esperada existe e que o gerenciador instala o workspace sem erro
- [x] 1.2 Criar manifests e scripts minimos para web Next.js/TypeScript, worker Node.js/TypeScript e AI FastAPI/Python, verificando que cada app inicia seu comando de desenvolvimento ou retorna um health check local
- [x] 1.3 Criar os packages compartilhados de `contracts`, `config`, `ui` e `testing` com dependencias direcionais, verificando que a web consegue importar contratos e UI sem ciclos de dependencia
- [x] 1.4 Fixar versoes de runtime e dependencias no lockfile e documentar pre-requisitos, verificando uma instalacao limpa a partir do lockfile

## 2. Configuracao e qualidade automatizada

- [x] 2.1 Implementar configuracao tipada por app com separacao entre variaveis publicas e secrets, verificando falha clara para variavel obrigatoria ausente e ausencia de secrets em bundles do cliente
- [x] 2.2 Adicionar `.env.example`, regras de Git para arquivos locais de ambiente e documentacao de setup, verificando que nenhum arquivo de ambiente real e versionado
- [x] 2.3 Configurar formatacao, lint e typecheck compartilhados, verificando que os scripts rodam na raiz e detectam um erro introduzido artificialmente
- [x] 2.4 Configurar testes unitarios e de contrato, verificando que um teste de smoke executa na raiz e falha corretamente quando uma assercao e quebrada
- [x] 2.5 Criar pipeline de CI para instalacao, lint, formatacao, typecheck, testes e build aplicavel, verificando uma execucao verde em ambiente limpo

## 3. Fundacao visual do shell

- [x] 3.1 Definir tokens semanticos de superficie, foreground, border, accent, AI, sucesso, alerta, perigo, espacamento, radius, sombra e tipografia, verificando que os componentes nao dependem de cores hardcoded para estados principais
- [x] 3.2 Implementar temas light, dark e system com persistencia da escolha explicita, verificando troca de tema sem quebrar contraste ou causar deslocamento relevante do layout
- [x] 3.3 Criar primitives acessiveis necessarias ao shell, incluindo Button, IconButton, links de navegacao, estados de carregamento, vazio, erro, disabled e offline, verificando foco visivel e alvos de toque de pelo menos 44x44px

## 4. Application shell e navegacao

- [x] 4.1 Definir o contrato de contexto de sessao e um adapter de desenvolvimento explicitamente separado da autorizacao real, verificando que o shell renderiza identidade, tenant, branch, role e permissions sem aceitar tenant como autorizacao do cliente
- [x] 4.2 Implementar a configuracao de navegacao role-aware e permission-aware, verificando que areas permitidas aparecem e areas sem permissao ficam ocultas ou bloqueadas
- [x] 4.3 Implementar composicao mobile com bottom navigation e acao central `+`, verificando comportamento em 320px e 390px sem scroll horizontal
- [x] 4.4 Implementar composicao tablet e desktop com sidebar ou rail, verificando comportamento em 768px, 1024px, 1440px e 1920px
- [x] 4.5 Integrar estado de acesso negado e fallback de rota protegida sem revelar dados, verificando o comportamento com uma permission ausente
- [x] 4.6 Integrar o shell a uma rota inicial demonstravel com loading, empty, error, disabled e offline quando aplicavel, verificando que cada estado tem feedback compreensivel e layout estavel

## 5. Testes do contrato do shell

- [x] 5.1 Adicionar testes unitarios para filtragem de navegacao, selecao de tema e transicoes do contexto, verificando papeis com permissoes diferentes
- [x] 5.2 Adicionar testes de browser para teclado, mouse e toque nos controles principais, verificando foco, ativacao e tamanho minimo dos alvos
- [x] 5.3 Adicionar verificacao de acessibilidade para as telas do shell, verificando labels, semantica, contraste e ausencia de bloqueios basicos de teclado
- [x] 5.4 Executar verificacao responsiva nos viewports P0 e nos temas light/dark, verificando ausencia de sobreposicao, texto cortado e overflow horizontal

## 6. Integracao e entrega

- [x] 6.1 Executar os scripts de validacao na raiz para web, worker, AI e packages, verificando que todos os projetos aplicaveis passam lint, typecheck e testes
- [x] 6.2 Executar o build da web e os health checks do worker e AI, verificando que artefatos de producao sao gerados sem secrets incorporados
- [x] 6.3 Atualizar a documentacao de desenvolvimento com os comandos de instalar, iniciar, testar e validar o shell, verificando que uma pessoa nova consegue repetir o setup
- [x] 6.4 Rodar `openspec validate foundation-scaffold` e revisar a mudanca, verificando que proposta, spec, design e tarefas estao completos antes de iniciar o apply
