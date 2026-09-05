## Context

O repositorio esta em fase inicial e possui as specs de produto, arquitetura, UX/UI e o fluxo OpenSpec, mas ainda nao possui codigo de aplicacao. Consulte `proposal.md` para a motivacao e `specs/application-shell/spec.md` para o contrato observavel desta mudanca.

As restricoes principais sao: modular monolith na web, worker e AI como apps separados, PWA mobile first, temas light/dark/system, navegacao por papel e permissao, ausencia de secrets no cliente e verificacoes automatizadas desde o primeiro commit.

## Goals / Non-Goals

**Goals:**

- Criar um monorepo executavel com fronteiras explicitas entre apps e packages.
- Disponibilizar scripts locais e CI deterministica para lint, formatacao, typecheck, testes e build.
- Criar uma base de UI compartilhada orientada a tokens e um application shell responsivo.
- Definir contratos de configuracao e contexto que permitam integrar autenticacao e autorizacao depois.
- Validar os requisitos principais do shell com testes automatizados e verificacoes de acessibilidade/responsividade.

**Non-Goals:**

- Implementar autenticacao, tenant, branch, membership, RBAC ou RLS completos; isso pertence a uma change posterior da Foundation.
- Implementar agenda, comanda, pagamentos, financeiro, estoque, IA, WhatsApp ou regras de negocio.
- Escolher provedores externos de pagamento, mensageria ou modelos de IA.
- Criar uma biblioteca de componentes completa; apenas a fundacao necessaria ao shell sera criada.

## Decisions

### Monorepo com workspaces e apps independentes

Usar workspaces do gerenciador de pacotes para organizar `apps/web`, `apps/worker`, `apps/ai` e `packages/*`. A web concentra a experiencia e os adaptadores HTTP; o worker concentra jobs; o AI permanece isolado por processo e linguagem.

Alternativa considerada: iniciar apenas com `apps/web` e separar os demais depois. Foi rejeitada porque criaria fronteiras falsas e aumentaria o custo de extrair responsabilidades quando os contratos ja estivessem espalhados.

O primeiro scaffold deve usar scripts de workspace e nao depender de um orquestrador adicional. Um task runner pode ser acrescentado depois, quando o tempo de build justificar essa complexidade.

### Packages compartilhados com dependencias direcionais

Manter os packages de contrato, configuracao, UI e testes como dependencias compartilhadas. O dominio nao deve importar React, framework web, SDK de banco, Redis ou clientes de provedores externos. A direcao esperada e:

`domain -> contracts/config` e `presentation -> ui/contracts`, enquanto infraestrutura implementa portas definidas pelas camadas internas.

Alternativa considerada: compartilhar um pacote de utilitarios sem limites. Foi rejeitada porque tende a virar um acoplamento transversal dificil de remover.

### Shell composto na web e UI compartilhada por tokens

O application shell sera composto em `apps/web` usando primitives de `packages/ui`. Cores, espacamento, tipografia, radius, bordas, sombras e estados semanticos serao expostos por tokens, preferencialmente como variaveis CSS, permitindo light, dark e system sem duplicar componentes.

A navegacao sera uma mesma fonte de configuracao filtrada pelo contexto autorizado, com composicoes diferentes por viewport: bottom navigation e acao central `+` em mobile; sidebar ou rail em desktop. O shell nao deve decidir permissoes de negocio; ele apenas renderiza o contexto autorizado e trata acesso negado.

Alternativa considerada: uma barra desktop simplesmente comprimida no mobile. Foi rejeitada por conflitar com a regra mobile first e com a prioridade operacional da recepcao e do profissional.

### Contexto de sessao como porta de integracao

O shell consumira um contrato de contexto de sessao com identidade, tenant, branch, role e permissions opcionais. Nesta change, esse contexto podera ser fornecido por um adapter de desenvolvimento, mas a interface deve permitir substituicao pela autenticacao real sem mover regras para componentes.

Nenhum `tenant_id` vindo diretamente de input de UI sera tratado como autorizacao. A validacao real ficara no servidor quando a Foundation for implementada.

### Configuracao tipada e separacao cliente/servidor

Cada app tera uma camada de configuracao que valida variaveis obrigatorias na inicializacao e separa valores publicos de secrets. Arquivos `.env.example` documentarao nomes e exemplos seguros; arquivos de ambiente reais permanecerao fora do Git.

Alternativa considerada: ler `process.env` diretamente nos componentes e scripts. Foi rejeitada por permitir falhas tardias, vazamento acidental e configuracoes diferentes entre apps.

### Testes em duas camadas

Testes unitarios e de contrato cobrirao tokens, filtragem de navegacao, estados e contexto. Testes de browser cobrirao o shell nos fluxos de viewport, teclado, toque e acesso negado, com foco nos viewports P0 definidos no design.

As ferramentas concretas devem ser instaladas como dependencias de desenvolvimento do workspace e executadas pela mesma interface de scripts da CI. A cobertura visual completa e regression testing avancado ficam para uma etapa posterior, mas o shell deve nascer com uma verificacao minima de layout e acessibilidade.

## Risks / Trade-offs

- [Escopo do scaffold crescer por antecipar todos os packages] -> Criar apenas os packages necessarios ao shell e manter os demais como pastas/documentacao de fronteira ate existir uma feature que os use.
- [Contexto de desenvolvimento ser confundido com autorizacao real] -> Nomear o adapter como desenvolvimento, manter as permissoes explicitamente ficticias e cobrir a troca pelo contrato de sessao.
- [Tokens nao cobrirem light/dark ou estados] -> Definir tokens semanticos antes dos componentes e testar os dois temas nos viewports P0.
- [Monorepo funcionar localmente e falhar na CI] -> Usar os mesmos scripts, lockfile e versao documentada de runtime local e CI.
- [Falhas de acessibilidade aparecerem tarde] -> Incluir foco visivel, labels, teclado, tamanho minimo de toque e verificacao automatizada no primeiro shell.
- [Dependencias compartilhadas criarem acoplamento entre apps] -> Aplicar regras de importacao e revisar dependencias direcionais durante code review.

## Migration Plan

1. Criar o scaffold e o lockfile sem alterar as specs de origem.
2. Adicionar o shell atras de uma rota inicial de desenvolvimento, com estados e contexto adapter.
3. Executar localmente lint, formatacao, typecheck, testes e build de todos os apps aplicaveis.
4. Executar a CI e corrigir divergencias de ambiente antes de considerar a change pronta.
5. Para rollback, reverter o commit da change e remover somente os artefatos de scaffold criados por ela; nenhuma tabela ou dado de producao e alterado nesta etapa.

## Open Questions

- O task runner adicional sera necessario quando os tempos de CI forem medidos com os primeiros modulos de dominio.
- O baseline de visual regression sera definido quando houver componentes P0 suficientes para justificar snapshots estaveis.
