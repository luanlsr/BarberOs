# Design: Check-in e Comanda

## Context

O BarberOS ja possui fundacao multi-tenant, RBAC, auditoria, diretorios operacionais e agendamentos. O proximo passo e conectar a agenda ao atendimento em loja. A Comanda vira a superficie operacional onde recepcao, barbeiro e gestor enxergam o que esta em andamento antes do pagamento.

## Domain Model

### Order

Representa uma Comanda operacional.

- `id`
- `tenant_id`
- `branch_id`
- `appointment_id` opcional
- `customer_id` opcional para walk-in
- `professional_id` opcional
- `status`: `OPEN`, `IN_SERVICE`, `READY_FOR_PAYMENT`, `CANCELLED`
- `subtotal_amount`
- `discount_amount`
- `total_amount`
- `notes`
- `opened_at`
- `closed_at` opcional, reservado para change de pagamento
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### OrderItem

Guarda snapshot do item vendido/realizado.

- `id`
- `tenant_id`
- `branch_id`
- `order_id`
- `source_type`: `SERVICE`, `PRODUCT`, `MANUAL`
- `source_id` opcional
- `name_snapshot`
- `quantity`
- `unit_price_amount`
- `discount_amount`
- `final_amount`
- `professional_id` opcional
- `notes`
- `created_by`
- `created_at`

### Order History

Registra mudancas relevantes de status e itens. Deve ser append-only sempre que possivel.

## Application Services

### CheckInApplicationService

Responsavel pelo fluxo transacional:

1. Carrega `RequestContext`.
2. Valida permissao e escopo de filial.
3. Busca o appointment visivel ao tenant/filial.
4. Valida status permitido para check-in.
5. Cria ou recupera idempotentemente a Comanda vinculada.
6. Copia os servicos agendados para `OrderItem` com snapshot.
7. Atualiza appointment para `CHECKED_IN`.
8. Registra historico/auditoria.
9. Retorna a Comanda aberta.

### OrderApplicationService

Responsavel por:

- Criar Comanda walk-in.
- Listar comandas por tenant/filial/status.
- Obter detalhe com itens e historico.
- Adicionar/remover/atualizar itens antes do pagamento.
- Recalcular totais a partir dos itens.

## API

- `POST /api/v1/check-in`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders/:id/items`
- `PATCH /api/v1/orders/:id/items/:itemId`
- `DELETE /api/v1/orders/:id/items/:itemId`

Todas as rotas autenticadas usam `RequestContext`, permissao server-side, validação de tenant/filial e respostas de erro consistentes.

## UX

### Agenda

Cards ou detalhes de appointments elegiveis exibem acao de check-in. Ao concluir, a interface leva o usuario para a Comanda aberta.

### Comanda

Superficie operacional mobile-first com:

- Header com status, cliente, profissional e origem do atendimento.
- Lista de itens com snapshots, quantidade, desconto e total.
- Acoes de adicionar/remover/editar itens conforme permissao.
- Totais sempre visiveis em area fixa ou resumo responsivo.
- Estados `loading`, `empty`, `error`, `disabled`, `permission denied` e offline.

### Walk-in

Fluxo curto para abrir Comanda sem appointment:

- Selecionar filial/profissional conforme escopo.
- Cliente opcional ou cadastro rapido.
- Adicionar itens manuais ou servicos do catalogo.
- Abrir Comanda e manter usuario na superficie de atendimento.

## Risks

- Double check-in no mesmo appointment: mitigar com transacao, constraint unica em `appointment_id` quando preenchido e idempotency key.
- Vazamento entre tenants/filiais: mitigar com filtros obrigatorios em repository/application service e testes de isolamento.
- Divergencia de total: recalcular no servidor a partir dos itens e tratar client-side apenas como exibicao.
- Escopo crescer para pagamento: manter payment/cash register fora deste change.

## Rollout

1. Contratos e migration.
2. Application services e testes de dominio/isolamento.
3. APIs.
4. UI de check-in, Comanda e walk-in.
5. E2E e validacoes completas.
