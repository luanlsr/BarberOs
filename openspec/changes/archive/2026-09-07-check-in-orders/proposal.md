# Change: Check-in e Comanda

## Summary

Implementar o primeiro recorte de POS operacional do BarberOS: transformar um agendamento em atendimento por meio de check-in transacional, abrir uma Comanda (`Order`) com itens de servico em snapshot, permitir gestao basica de itens e criar o fluxo de walk-in sem agendamento.

## Why

O fluxo operacional central do produto e `Agenda -> Check-in -> Comanda -> Pagamento`. O change anterior entregou a base de cadastros, agenda e agendamentos; agora precisamos iniciar o atendimento real, mantendo rastreabilidade, isolamento por tenant/filial e uma superficie mobile-first para o dia a dia da barbearia.

## Scope

- Criar contratos, modelo de dominio e persistencia para `Order`, `OrderItem`, historico da comanda e relacionamento opcional com `Appointment`.
- Implementar check-in atomico: validar permissao e escopo, mover o appointment para `CHECKED_IN`, abrir a Comanda e copiar servicos agendados como itens com snapshot.
- Implementar APIs de check-in, listagem/detalhe/criacao de comandas e operacoes basicas de itens.
- Construir a experiencia de Comanda, incluindo cliente, profissional, itens, descontos, totais, observacoes, status e estados operacionais.
- Criar fluxo de walk-in para nova Comanda sem agendamento, com cliente opcional ou cadastro rapido.
- Cobrir tenant isolation, branch scope, rollback transacional e E2E `agenda -> check-in -> comanda aberta`.

## Non-Goals

- Captura de pagamento, fechamento de caixa e conciliacao financeira.
- Baixa de estoque, comissoes e repasses.
- Integracoes WhatsApp/IA para venda ou atendimento automatizado.
- Automacoes de campanhas ou notificacoes pos-atendimento.

## Capabilities

- `orders` (nova)
- `scheduling` (modificada)
- `agenda-experience` (modificada)

## Assumptions

- No codigo, a entidade continua usando `Order`; na UI, o usuario ve "Comanda".
- Uma Comanda aberta pode nascer de um appointment ou de walk-in.
- Pagamentos e fechamento entram em change posterior; este change pode calcular total aberto, mas nao liquida valores.
- Itens criados a partir de servicos agendados devem guardar snapshot do nome, tipo, quantidade, preco, desconto e preco final.
