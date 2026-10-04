# P0 UI Readiness Matrix

All P0 surfaces must support smartphone, tablet and desktop composition, light/dark/system themes, loading/empty/error/disabled/offline where relevant, permission-aware rendering and basic WCAG 2.2 AA interaction expectations.

| Surface             | Viewports                       | States                                             | Permission denial                             | Accessibility evidence                                              | Status                           |
| ------------------- | ------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Agenda              | 320, 390, 768, 1024, 1440, 1920 | loading, empty, error, disabled, offline           | direct route and unavailable actions guarded  | `e2e/agenda-responsive.spec.ts`, `e2e/production-readiness.spec.ts` | Ready                            |
| Comanda             | 320, 390, 768, desktop          | loading, empty, error, disabled                    | order/payment permissions guarded             | `e2e/orders-check-in.spec.ts`; component/data tests                 | Ready                            |
| Caixa               | mobile/tablet/desktop           | loading, empty, error, disabled                    | cash permissions guarded                      | `e2e/orders-check-in.spec.ts`, `e2e/finance-expense-cash.spec.ts`   | Ready                            |
| Financeiro          | mobile/tablet/desktop           | loading, empty, error, disabled                    | finance/commission permissions guarded        | `e2e/orders-check-in.spec.ts`, `e2e/finance-expense-cash.spec.ts`   | Ready                            |
| Estoque/Produtos    | mobile/tablet/desktop           | loading, empty, error, disabled                    | inventory/catalog permissions guarded         | `e2e/inventory-products.spec.ts`; component/data tests              | Ready                            |
| Mensagens/Campanhas | mobile/tablet/desktop           | loading, empty, error, disabled, provider failure  | messaging/campaign permissions guarded        | component/route tests; provider manual check                        | Ready with manual provider check |
| Barber AI           | mobile/tablet/desktop           | loading, empty, error, confirmation required       | AI/tool permissions and confirmations guarded | [ai-tool-boundary-readiness.md](ai-tool-boundary-readiness.md)      | Ready with manual provider check |
| Master Admin        | mobile/tablet/desktop           | loading, empty, error, permission denied, disabled | platform membership/permission required       | component/page/platform isolation tests                             | Ready                            |

## Acceptance Evidence

- Mobile and desktop Playwright smoke runs cover route access and permission denial.
- At least one axe-backed accessibility check runs for a P0 authenticated surface.
- Manual provider checks document any external dependency not deterministic in CI.
