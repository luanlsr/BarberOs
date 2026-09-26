# Plano de Testes e Cobertura 100%

## Objetivo

Criar uma suíte completa para garantir que as funcionalidades atuais do BarberOS funcionem com segurança, cobrindo testes unitários, integração e Playwright/E2E.

A meta é 100% de cobertura do código de produto testável, excluindo apenas arquivos que não representam lógica executável: configs, tipos puros, testes, mocks, assets, build output e migrations SQL.

## Camadas

### Unitários

Cobrir domínio, application services, helpers, contracts, permissions, config, cálculos, reducers e data models.

Áreas obrigatórias:

- Auth/session/workspace.
- Navigation, permissions e entitlements.
- Agenda, availability e appointment lifecycle.
- Clientes, profissionais e serviços.
- Check-in, Comanda e itens.
- Pagamentos, caixa e terminais.
- Financeiro, despesas e ledger.
- Comissões, carteira profissional e payouts.
- Catálogo, produtos e estoque.
- Outbox, worker, retry/dead-letter.
- Notifications e delivery status.
- Messaging/WhatsApp: adapters, webhook e worker delivery.
- Configurações e onboarding.

### Integração

Cobrir route handlers, repositories, tenant isolation, fluxos com outbox/worker e webhooks.

Casos obrigatórios:

- Tenant A não acessa nem altera dados do Tenant B.
- Branch fora do escopo retorna 403/404 conforme contrato.
- Appointment conflict e double booking.
- Check-in transacional abre Comanda com serviços agendados.
- Pagamento cria efeitos financeiros/caixa/outbox sem duplicidade.
- Estoque baixa apenas após venda paga.
- Worker reprocessa sem duplicar efeitos.
- Webhooks validam assinatura, timestamp e idempotência.

### Playwright/E2E

Executar em mobile e desktop.

Fluxos obrigatórios:

- Login/autenticação.
- Shell/sidebar/bottom nav.
- Agenda responsiva.
- Novo agendamento.
- Agenda -> check-in -> Comanda.
- Walk-in -> itens -> pagamento.
- Pagamento -> caixa -> financeiro.
- Produto -> estoque -> alerta.
- Configurações sem submenus na sidebar.
- Acessibilidade com axe.

## Scripts Propostos

- `test:unit`: Vitest unitários.
- `test:integration`: Vitest integração.
- `test:coverage`: Vitest com coverage provider v8.
- `test:e2e`: Playwright.
- `test:all`: format, lint, typecheck, coverage, e2e e build.

## Gate Local

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e
npm run build
npm run validate
```

## Thresholds

- lines: 100
- functions: 100
- branches: 100
- statements: 100

## Critérios de Aceite

- Vitest com 100% coverage no código testável.
- Playwright verde em mobile e desktop.
- Typecheck, lint e build verdes.
- Testes de tenant isolation para todo módulo tenant-scoped.
- Fluxos críticos E2E verdes.
- Relatório HTML de coverage gerado para auditoria.
