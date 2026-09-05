# UX/UI Design Specification v1.0

**Produto:** nome provisório BarberOS
**Plataforma:** PWA
**Estratégia:** Mobile First
**Temas:** Light / Dark / System
**Dispositivos:** Smartphone / Tablet / Notebook / Desktop / Ultrawide
**Status:** Design Foundation v1.0

---

# 1. Objetivo do design

A interface deverá transmitir:

**controle + velocidade + confiança + modernidade.**

O sistema deve parecer profissional o suficiente para administrar uma rede de barbearias, mas simples o suficiente para um barbeiro autônomo utilizar entre dois atendimentos.

Não queremos aparência de:

- ERP antigo;
- planilha;
- software contábil;
- aplicativo genérico;
- sistema clichê de barbearia.

Também devemos evitar excesso de:

- dourado;
- preto absoluto;
- navalhas;
- postes barber;
- caveiras;
- tipografia vintage.

A identidade deverá ser:

> **Premium, tecnológica, discreta e operacional.**

---

# 2. Princípios de UX

## 2.1 Menos navegação, mais ação

O usuário deve conseguir executar as tarefas principais sem ficar entrando e saindo de módulos.

Exemplo:

Agenda → Check-in → Comanda → Pagamento

deve funcionar como um fluxo contínuo.

---

## 2.2 O sistema deve mostrar o próximo passo

Em vez de simplesmente exibir dados:

> 3 horários vagos.

Mostrar:

> 3 horários vagos hoje.

**[Encontrar clientes]**

---

## 2.3 Informações progressivas

Não colocar tudo na tela.

Primeiro:

```text
João Silva
14:00
Corte + Barba
```

Ao abrir:

- telefone;
- histórico;
- pagamento;
- observações;
- recorrência;
- CRM;
- faltas.

---

## 2.4 Touch first

Todos os fluxos essenciais devem funcionar confortavelmente por toque.

Alvos mínimos:

**44×44px**

Preferencialmente:

**48px** nas ações principais.

---

## 2.5 Mobile não será desktop comprimido

Cada viewport poderá possuir composição própria.

---

# 3. Arquitetura da informação

A arquitetura principal do OWNER será:

```text
Início

Operação
├── Agenda
├── Comandas
├── Caixa
└── Clientes

Gestão
├── Financeiro
├── Equipe
├── Serviços
├── Produtos e Estoque
└── Fornecedores

Crescimento
├── CRM
├── Campanhas
├── Assinaturas
└── Relatórios

Inteligência
└── Barber AI

Sistema
├── Unidade
├── Integrações
├── Plano
└── Configurações
```

Não necessariamente todos esses itens estarão disponíveis no MVP.

---

# 4. Navegação Desktop

Estrutura:

```text
┌───────────────┬────────────────────────────────────────┐
│               │                                        │
│   BARBER OS   │          Conteúdo principal            │
│               │                                        │
│ Início        │                                        │
│ Agenda        │                                        │
│ Comandas      │                                        │
│ Clientes      │                                        │
│               │                                        │
│ Financeiro    │                                        │
│ Equipe        │                                        │
│ Estoque       │                                        │
│               │                                        │
│ Barber AI     │                                        │
│               │                                        │
├───────────────┤                                        │
│ Barbearia ▼   │                                        │
│ Luan      ⚙   │                                        │
└───────────────┴────────────────────────────────────────┘
```

Sidebar:

- expansível;
- recolhível;
- grupos;
- ícones;
- labels.

Modo compacto:

```text
┌─────┐
│  B  │
│     │
│  ⌂  │
│  📅 │
│  ◫  │
│  👥 │
│  $  │
│  ✦  │
└─────┘
```

---

# 5. Navegação Mobile

Bottom Navigation.

### Owner

```text
┌──────────────────────────────┐
│                              │
│         CONTEÚDO             │
│                              │
├──────────────────────────────┤
│  Início  Agenda  +  Clientes │
│                     Mais     │
└──────────────────────────────┘
```

Itens:

1. Início
2. Agenda
3. -
4. Clientes
5. Mais

---

# 6. Botão global +

Será uma das ações mais importantes do sistema.

Ao tocar:

```text
Nova ação

📅 Novo agendamento

🧾 Nova comanda

👤 Novo cliente

💸 Nova despesa

📦 Nova venda

✦ Perguntar ao Barber AI
```

As opções serão filtradas por permissão.

---

# 7. Navegação por Role

## Professional

```text
Hoje
Minha Agenda
Clientes
Ganhos
Mais
```

---

## Receptionist

```text
Hoje
Agenda
+
Comandas
Mais
```

Em Mais:

- Clientes;
- Caixa;
- Lista de espera.

---

## Finance

```text
Resumo
Fluxo
Despesas
Receitas
Relatórios
```

---

## Owner

Acesso completo.

---

# 8. Design visual

## Personalidade

O visual deverá combinar:

**SaaS moderno**

-

**hospitalidade premium**

-

**ambiente operacional.**

Referência conceitual:

- Linear;
- Stripe;
- Square;
- Notion;
- sistemas modernos de POS.

Sem copiar identidade visual.

---

# 9. Paleta principal

Sugestão inicial.

## Light

### Background

```text
Canvas
#F7F7F5
```

### Surface

```text
#FFFFFF
```

### Surface secondary

```text
#F0F0ED
```

### Texto principal

```text
#17191C
```

### Texto secundário

```text
#666B73
```

### Border

```text
#E2E3DF
```

---

# 10. Cor de marca

Sugestão:

### Copper

```text
#C8783C
```

Um cobre moderno e menos clichê que dourado.

Uso:

- CTA;
- elementos selecionados;
- marca;
- indicadores especiais.

Hover:

```text
#B86930
```

---

# 11. Barber AI

A IA deverá possuir uma identidade visual própria dentro do sistema.

Sugestão:

```text
AI Accent
#6757D9
```

ou gradientes extremamente discretos apenas em elementos AI.

Assim:

**cobre = produto**

**violeta = inteligência**

---

# 12. Estados semânticos

### Success

```text
#238A55
```

### Warning

```text
#C98413
```

### Danger

```text
#D34848
```

### Info

```text
#377FC7
```

Não depender apenas da cor.

Usar:

- ícone;
- label;
- texto.

---

# 13. Dark Mode

Canvas:

```text
#101214
```

Surface:

```text
#171A1D
```

Secondary:

```text
#202428
```

Border:

```text
#2D3237
```

Texto:

```text
#F5F5F3
```

Secundário:

```text
#9BA1A8
```

Accent permanece cobre, ajustado para contraste.

---

# 14. Tipografia

Sugestão:

**Geist Sans**

para toda a UI.

Características:

- moderna;
- altamente legível;
- compacta;
- ótima para dashboards.

Para números importantes:

**Geist Mono** opcional.

Exemplo:

```text
R$ 42.850
```

poderia utilizar tabular numbers.

---

# 15. Escala tipográfica

```text
Display        32–40
Heading 1      28–32
Heading 2      22–24
Heading 3      18–20

Body           14–16

Small          13
Caption        12
```

Mobile deverá utilizar escala menor sem comprometer legibilidade.

---

# 16. Radius

Sugestão:

```text
sm     6px
md     10px
lg     14px
xl     18px
```

Cards principais:

**12–14px**

Não utilizar arredondamento excessivo estilo aplicativo infantil.

---

# 17. Shadows

Poucas sombras.

Preferir:

```text
border + elevation sutil
```

Cards comuns:

sem sombra.

Dropdowns/modals:

shadow suave.

---

# 18. Espaçamento

Base:

```text
4
8
12
16
20
24
32
40
48
64
```

Componentes devem utilizar sistema consistente.

---

# 19. Botões

Tipos:

### Primary

Ação principal.

```text
[ Salvar ]
```

### Secondary

```text
[ Cancelar ]
```

### Ghost

Ações menos importantes.

### Danger

```text
[ Cancelar agendamento ]
```

### AI

```text
✦ Perguntar ao Barber AI
```

---

# 20. Inputs

Altura ideal:

```text
44–48px
```

Características:

- labels sempre claros;
- erros abaixo;
- placeholder não substitui label;
- validação inline.

Exemplo:

```text
Telefone

┌────────────────────────┐
│ (67) 99999-9999        │
└────────────────────────┘
```

---

# 21. Cards

Um card deve representar uma entidade ou insight.

Não utilizar cards para absolutamente tudo.

Exemplo KPI:

```text
┌────────────────────┐
│ Receita hoje       │
│                    │
│ R$ 2.420           │
│ ↑ 8,3%             │
└────────────────────┘
```

---

# 22. Dashboard — UX

A tela inicial deve responder imediatamente:

> O que está acontecendo agora?

e não:

> Aqui estão vinte gráficos.

---

# 23. Dashboard Owner — Mobile

```text
Bom dia, Luan 👋
Barbearia Centro

Hoje, 5 de setembro

┌───────────────────────┐
│ R$ 2.420              │
│ Receita prevista      │
│                       │
│ 31 atendimentos       │
└───────────────────────┘

Próximos atendimentos

14:00 João
Carlos • Corte

14:30 Pedro
Lucas • Corte + Barba

────────────────────────

⚠ 3 horários vagos

✦ Encontrei 11 clientes
com boa chance de retorno.

[ Preencher horários ]

────────────────────────

Hoje

Atendimentos       31
Concluídos         14
No-show             1
Disponíveis         3
```

---

# 24. Dashboard Owner — Desktop

```text
┌───────────────────────────────────────────────────────────────┐
│ Bom dia, Luan                           5 setembro            │
│                                                               │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │
│ │Receita │ │Atend.  │ │Ticket  │ │Ocupação│                  │
│ │R$2.420 │ │31      │ │R$78    │ │82%     │                  │
│ └────────┘ └────────┘ └────────┘ └────────┘                  │
│                                                               │
│ Agenda hoje                   Insights                        │
│ ┌───────────────────────┐    ┌────────────────────────────┐   │
│ │ próximos horários     │    │ ✦ Barber AI               │   │
│ │                       │    │                            │   │
│ │                       │    │ 3 horários vagos          │   │
│ └───────────────────────┘    │                            │   │
│                              │ [Preencher]                │   │
│ Financeiro                   └────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ Receita / despesas                                     │    │
│ └────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

# 25. Agenda — objetivo

A agenda será provavelmente a tela mais utilizada.

Prioridades:

1. leitura rápida;
2. disponibilidade;
3. ação rápida;
4. poucos cliques.

---

# 26. Agenda Mobile

Mobile utilizará principalmente:

**Day View vertical**

```text
←     Hoje • 05/09      →

Carlos ▼

09:00

┌────────────────────────┐
│ 09:00 — 09:40          │
│ João Silva             │
│ Corte                  │
│ Confirmado             │
└────────────────────────┘

10:00

┌────────────────────────┐
│ DISPONÍVEL             │
│                       +│
└────────────────────────┘

10:30

┌────────────────────────┐
│ Pedro Souza            │
│ Corte + Barba          │
│ Confirmado             │
└────────────────────────┘
```

---

# 27. Agenda Tablet

Poderemos mostrar:

```text
Horário | Carlos | Lucas | Rafael
```

2–4 profissionais dependendo da largura.

---

# 28. Agenda Desktop

Grade completa.

```text
             Carlos       Lucas        Rafael

09:00        João         Livre        Pedro

10:00        Livre        Marcos       Ana

11:00        Lucas        Livre        João
```

Drag-and-drop poderá existir futuramente.

Mas toda alteração deve validar conflito no backend.

---

# 29. Appointment Card

Informações essenciais:

```text
14:00
João Silva

Corte + Barba

Carlos

Confirmado
```

Ações rápidas:

```text
Check-in
WhatsApp
Reagendar
Mais
```

---

# 30. Cores da agenda

Não utilizar uma cor aleatória por profissional como única distinção.

Podemos usar uma faixa lateral ou avatar.

Estados:

```text
Confirmed
Checked-in
In service
Completed
Cancelled
No-show
```

com badges semânticos.

---

# 31. Check-in

Ao tocar:

```text
[ CHECK-IN ]
```

Resposta imediata:

```text
✓ João chegou.

Comanda #1028 criada.
Corte + Barba adicionados.
```

CTA:

```text
[ Abrir comanda ]
```

---

# 32. Comanda / PDV — prioridade

Provavelmente será a segunda tela mais operacional.

Objetivo:

**registrar consumo e receber em segundos.**

---

# 33. PDV Tablet/Desktop

```text
┌───────────────────────────────────┬─────────────────────────┐
│                                   │ João Silva              │
│ Buscar produto ou serviço         │ Comanda #1028           │
│                                   │                         │
│ [Todos] [Serviços] [Bebidas]      │ Corte          R$50     │
│ [Produtos] [Alimentos]            │ Barba          R$35     │
│                                   │ Coca-Cola       R$8     │
│ ⭐ Favoritos                       │                         │
│                                   │ ───────────────────     │
│ Corte       Barba       Água      │ Subtotal       R$93     │
│                                   │                         │
│ Coca-Cola   Pomada      Cerveja   │ Desconto        R$0     │
│                                   │                         │
│                                   │ TOTAL           R$93    │
│                                   │                         │
│                                   │ [ RECEBER R$93 ]        │
└───────────────────────────────────┴─────────────────────────┘
```

---

# 34. PDV Mobile

```text
Comanda #1028
João Silva

Buscar item...

[Todos]
[Serviços]
[Bebidas]
[Produtos]

⭐ Favoritos

┌──────────┐ ┌──────────┐
│ Água     │ │ Coca     │
│ R$5      │ │ R$8      │
└──────────┘ └──────────┘

┌──────────┐ ┌──────────┐
│ Pomada   │ │ Cerveja  │
│ R$35     │ │ R$10     │
└──────────┘ └──────────┘


┌─────────────────────────┐
│ 4 itens        R$108    │
│ [ VER COMANDA ]         │
└─────────────────────────┘
```

Sticky bottom.

---

# 35. Comanda Mobile

Ao abrir:

```text
← Comanda #1028

João Silva

Corte
Carlos
R$50

Barba
Carlos
R$35

Coca-Cola
2 × R$8
R$16

Pomada
1 × R$35
R$35

────────────────

Subtotal         R$136

Desconto          R$0

TOTAL            R$136


[ RECEBER R$136 ]
```

---

# 36. Pagamento

Mobile:

```text
Receber pagamento

Total
R$ 136,00

Como o cliente vai pagar?

[ PIX ]

[ Dinheiro ]

[ Débito ]

[ Crédito ]

[ Dividir pagamento ]
```

---

# 37. Pagamento dividido

```text
Total             R$136

PIX
R$70

Crédito
R$66

Restante
R$0

[ FINALIZAR ]
```

---

# 38. Confirmação

```text
✓ Pagamento concluído

R$136,00

PIX      R$70
Crédito  R$66

Estoque atualizado
Comissão calculada
Financeiro atualizado

[ Nova comanda ]

[ Ver cliente ]
```

---

# 39. Caixa

Tela inicial:

```text
CAIXA

Status
● Aberto desde 08:02

Dinheiro esperado
R$ 820

Vendas hoje
R$ 4.280

PIX
R$ 1.920

Cartões
R$ 1.540


[ Sangria ]

[ Reforço ]

[ Fechar caixa ]
```

---

# 40. Cliente 360

Uma das telas centrais do CRM.

---

# 41. Cliente 360 Mobile

```text
← João Silva

🟢 Cliente ativo

Carlos
Barbeiro preferido


Última visita
22 ago

Próximo retorno esperado
12 set


Ticket médio
R$68

Visitas
43


[ Agendar ]

[ WhatsApp ]

[ Nova comanda ]


Histórico

22 ago
Corte + Barba
R$85

01 ago
Corte
R$50
```

---

# 42. Cliente 360 Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ João Silva                  🟢 Ativo                          │
│ Carlos • profissional preferido                              │
│                                                              │
│ [Agendar] [WhatsApp] [Nova comanda]                          │
├─────────────────────┬────────────────────────────────────────┤
│                     │                                        │
│ Perfil               │ Histórico                              │
│                     │                                        │
│ Ticket R$68          │ 22 ago  Corte + Barba      R$85       │
│ Visitas 43           │ 01 ago  Corte              R$50       │
│ Frequência 23 dias   │                                        │
│ LTV R$2.840          │                                        │
│                     │                                        │
├─────────────────────┴────────────────────────────────────────┤
│ ✦ Barber AI                                                  │
│ João costuma retornar a cada 23 dias.                        │
│ Está próximo do período esperado de retorno.                 │
│                                                              │
│ [ Enviar lembrete ]                                          │
└──────────────────────────────────────────────────────────────┘
```

---

# 43. CRM

Lista inicial:

```text
Clientes

[Todos]
[Ativos]
[Em risco]
[Inativos]
[VIP]

Buscar cliente...
```

---

# 44. Cliente card mobile

```text
João Silva

🟡 Em risco

Última visita
32 dias atrás

Ticket médio
R$72

Carlos

[ Contatar ]
```

---

# 45. Financeiro

A UX financeira deve ser extremamente simples.

Não transformar a página inicial em livro contábil.

---

# 46. Financeiro mobile

```text
Financeiro

Setembro

Saldo do período
R$ 14.280

Receitas
R$ 38.700

Despesas
R$ 24.420


[ + Receita ]

[ + Despesa ]


Próximas contas

Energia
10 set
R$ 840

Aluguel
12 set
R$ 4.000
```

---

# 47. Financeiro desktop

```text
Receita       Despesas       Resultado       Margem

R$38.700      R$24.420       R$14.280        36,9%


Fluxo de caixa
────────────────────────────────────────


Despesas por categoria
────────────────────────────────────────


✦ Barber AI

Sua margem caiu 3,1 pontos em relação
ao mês anterior.

[ Entender por quê ]
```

---

# 48. Professional Wallet

Tela para barbeiro.

```text
Meus ganhos

Setembro

A receber
R$ 4.909

Produção
R$ 9.840

Comissões
R$ 4.780

Produtos
R$ 89

Gorjetas
R$ 340


Minha meta

R$8.200 / R$10.000

████████░░ 82%
```

---

# 49. Estoque

Mobile:

```text
Estoque

Buscar produto...

⚠ Estoque baixo

Lâmina Derby
8 unidades
mínimo 10

Coca-Cola
4 unidades
mínimo 12


Todos os produtos

Pomada XYZ
18
R$35

Cerveja
32
R$10
```

---

# 50. Produto

```text
Pomada XYZ

Venda
R$35

Custo
R$18

Margem
R$17

Estoque
18

Mínimo
5


Histórico

Venda      -1
Compra    +20
Venda      -1
```

---

# 51. Equipe

Card:

```text
Carlos

Barbeiro
Online hoje

Agenda
82% ocupada

Produção
R$9.840

Comissão
R$4.780
```

---

# 52. Barber AI

A IA terá três formas de presença.

## 1. Contextual

Dentro das telas.

## 2. Global

Copiloto acessível em todo o sistema.

## 3. Proativa

Insights e alertas.

---

# 53. AI contextual

Financeiro:

```text
✦ Sua margem caiu 3,2%

[ Entender ]
```

CRM:

```text
✦ 17 clientes estão em risco

[ Criar campanha ]
```

Agenda:

```text
✦ Você possui 3 horários vazios

[ Encontrar clientes ]
```

---

# 54. AI global — desktop

Painel lateral:

```text
┌──────────────────────────────┐
│ ✦ Barber AI                  │
│                              │
│ Como posso ajudar?           │
│                              │
│ Sugestões                    │
│                              │
│ Quanto lucrei este mês?      │
│                              │
│ Quem está em risco?          │
│                              │
│ Como está meu estoque?       │
│                              │
├──────────────────────────────┤
│ Pergunte alguma coisa...     │
└──────────────────────────────┘
```

---

# 55. AI mobile

Tela full-screen.

```text
← Barber AI

✦

Como posso ajudar?


Quanto lucrei esse mês?

Quem não volta há mais
de 30 dias?

Agende João amanhã
com Carlos.


┌────────────────────────┐
│ Pergunte...            │
└────────────────────────┘
```

---

# 56. Tool confirmation UX

Exemplo:

```text
Vou enviar esta mensagem para:

347 clientes

Segmento:
Clientes inativos


Mensagem:

"João, sentimos sua falta..."


[ CANCELAR ]

[ CONFIRMAR ENVIO ]
```

A IA nunca deve esconder o impacto de uma ação relevante.

---

# 57. IA em execução

Mostrar:

```text
Consultando agenda...
```

Depois:

```text
Encontrei 3 horários.
```

Evitar spinner sem contexto.

---

# 58. Empty states

Exemplo CRM:

```text
Ainda não há clientes.

Cadastre seu primeiro cliente
ou crie um agendamento.

[ Novo cliente ]
```

---

# 59. Error states

Não:

```text
Error 500.
```

Mas:

```text
Não conseguimos abrir a agenda.

Tente novamente.

[ Recarregar ]
```

Detalhes técnicos ficam nos logs.

---

# 60. Offline

Banner:

```text
Você está offline.

Algumas informações podem estar
desatualizadas.
```

Ações que exigem conexão serão desabilitadas claramente.

---

# 61. Loading

Utilizar:

- skeleton;
- optimistic updates;
- progressivo.

Evitar tela inteira bloqueada por loading sempre que possível.

---

# 62. Toasts

Para ações simples:

```text
✓ Cliente cadastrado.
```

```text
✓ Produto adicionado.
```

```text
✓ Agendamento reagendado.
```

Ações críticas terão confirmação mais persistente.

---

# 63. Confirmações

Evitar:

> Tem certeza?

Preferir contexto.

```text
Cancelar agendamento?

João Silva
Hoje • 14:00
Corte + Barba

O horário ficará novamente disponível.

[ Manter ]
[ Cancelar agendamento ]
```

---

# 64. Search global

No desktop:

```text
⌘ K
```

ou:

```text
Buscar cliente, comanda, produto...
```

Resultados:

```text
João Silva
Cliente

Pomada XYZ
Produto

Comanda #1028
Comanda
```

---

# 65. Command palette

Futuramente:

```text
⌘ K

Novo agendamento
Novo cliente
Abrir Barber AI
Registrar despesa
Abrir caixa
```

Excelente para usuários avançados.

---

# 66. Responsividade de tabelas

Desktop:

table.

Mobile:

list/cards.

Não scrollar tabela inteira lateralmente como padrão.

---

# 67. Densidade

Configuração implícita por dispositivo.

### Mobile

Comfortable.

### Tablet

Comfortable/compact.

### Desktop

Compact.

Especialmente em:

- agenda;
- estoque;
- financeiro.

---

# 68. Header

Mobile:

```text
Barbearia Centro ▼      🔔  👤
```

Desktop:

breadcrumb + ações.

Exemplo:

```text
Clientes / João Silva

[ WhatsApp ] [ Agendar ]
```

---

# 69. Notifications

Central:

```text
Notificações

Cliente cancelou
14:30 • João Silva

Estoque baixo
Lâminas

Pagamento pendente
Assinatura cliente
```

---

# 70. Design System — componentes P0

Devemos construir:

```text
Button
IconButton

Input
Textarea
Select
Combobox

Checkbox
Radio
Switch

Badge
Avatar

Card
StatCard

Dialog
Drawer
BottomSheet

DropdownMenu

Tabs
SegmentedControl

Toast
Alert

Skeleton

Table
ResponsiveList

DatePicker
TimePicker

Calendar
AppointmentCard

OrderItem
ProductCard

CurrencyInput

ChartCard

EmptyState

AIInsight
AIActionCard
```

---

# 71. Componentes específicos do domínio

Além dos componentes genéricos:

```text
AppointmentCard

CustomerCard

ProfessionalCard

OrderSummary

OrderItemRow

PaymentMethodCard

CashRegisterSummary

FinancialKPI

StockLevel

CommissionSummary

CustomerRiskBadge

AIInsightCard

AIConfirmation
```

---

# 72. Iconografia

Usar biblioteca consistente.

Exemplo:

**Lucide**

Características:

- leve;
- moderna;
- excelente cobertura;
- consistente.

Não misturar cinco bibliotecas.

---

# 73. Motion

Motion deve ajudar orientação.

Exemplos:

- drawer entrando;
- item adicionado à comanda;
- bottom sheet;
- AI thinking.

Duração:

aproximadamente:

```text
150–250ms
```

Evitar animações decorativas demoradas.

---

# 74. Mobile gestures

Poderemos utilizar cuidadosamente:

```text
swipe
```

Exemplo:

agenda:

```text
swipe left → próximo dia
swipe right → dia anterior
```

Mas sempre deve existir botão correspondente.

---

# 75. Acessibilidade

WCAG AA.

Obrigatório:

- contraste;
- foco visível;
- keyboard;
- aria;
- semântica;
- alt;
- labels.

---

# 76. Estados de permissão

Quando usuário não possui permissão, preferencialmente:

**não mostrar ação.**

Quando precisar explicar:

```text
Você não tem permissão para
visualizar o financeiro.

Fale com o administrador.
```

---

# 77. Onboarding UX

Objetivo:

levar ao primeiro agendamento rapidamente.

```text
Bem-vindo 👋

Vamos configurar sua barbearia.
```

Passos:

```text
1 Barbearia
2 Serviços
3 Equipe
4 Horários
5 Pronto
```

---

# 78. Onboarding progressivo

Não obrigar configurar:

- fornecedores;
- estoque;
- campanhas;
- IA;
- financeiro completo;

antes de usar agenda.

Depois:

Dashboard:

```text
Sua configuração está 70% completa.

[ Continuar configuração ]
```

---

# 79. Plano e feature locks

Não mostrar dezenas de telas bloqueadas.

Quando fizer sentido:

```text
CRM Inteligente

Identifique clientes em risco
automaticamente.

Disponível no plano Pro AI.

[ Conhecer recurso ]
```

Sem prejudicar uso principal.

---

# 80. Master Admin

Terá identidade estrutural semelhante, mas separada do tenant.

Navegação:

```text
Overview
Tenants
Users
Subscriptions
Plans
AI Usage
Messaging
Incidents
Feature Flags
Audit
```

Visualmente pode utilizar label:

```text
PLATFORM ADMIN
```

para evitar confusão.

---

# 81. Breakpoints conceituais

```text
xs   320+
sm   480+
md   768+
lg   1024+
xl   1440+
2xl  1920+
```

Mas componentes utilizarão também container queries.

---

# 82. Grid Desktop

Base:

```text
12 columns
```

Sidebar fora do grid principal.

Gutter:

```text
24px
```

em desktops.

Mobile:

```text
16px
```

---

# 83. Conteúdo máximo

Dashboards:

aproximadamente:

```text
1440–1600px
```

centralizados.

Agenda e PDV poderão utilizar praticamente toda largura disponível.

---

# 84. Smartphone pequeno

A aplicação deve permanecer utilizável em:

```text
320px
```

Regras:

- 1 coluna;
- labels compactas;
- botões full-width quando necessário;
- tabs roláveis;
- evitar duplo painel.

---

# 85. Tablet portrait

Normalmente:

```text
768px
```

Sidebar poderá virar:

- navigation rail;
- drawer.

---

# 86. Tablet landscape

Pode usar:

```text
sidebar compacta
+
conteúdo
```

PDV com duas colunas.

---

# 87. Desktop largo

Podemos adicionar painéis auxiliares.

Exemplo agenda:

```text
Agenda
+
Detalhes do cliente
```

Sem obrigar modal.

---

# 88. Fluxo UX principal

O fluxo mais importante deve ser extremamente fluido:

```text
Agenda
↓
Cliente chega
↓
Check-in
↓
Comanda automática
↓
Adicionar itens
↓
Receber
↓
Finalizar
```

Meta UX:

**mínimo possível de telas e confirmações desnecessárias.**

---

# 89. Fluxo walk-in

```text
+
↓
Nova comanda
↓
Cliente existente
ou
Consumidor avulso
↓
Adicionar serviço/produto
↓
Pagamento
```

---

# 90. Fluxo novo agendamento

```text
+
↓
Novo agendamento
↓
Cliente
↓
Serviço
↓
Profissional
↓
Horário
↓
Confirmar
```

No mobile, pode ser step-by-step.

No desktop, painel único.

---

# 91. Novo agendamento mobile

```text
Novo agendamento

1 Cliente
2 Serviço
3 Horário
4 Confirmar
```

Com progresso discreto.

---

# 92. Novo agendamento desktop

Pode utilizar drawer lateral:

```text
Agenda                       Novo agendamento

                               Cliente
                               Serviço
                               Profissional
                               Data
                               Horário

                               [ Agendar ]
```

Assim o usuário continua vendo a agenda.

---

# 93. UX da operação deve dominar

Regra final:

Se houver conflito entre:

**visual bonito**

e:

**mais rápido para recepcionista/barbeiro**

ganha:

**mais rápido para operar.**

---

# 94. UX financeira deve priorizar entendimento

Se houver conflito entre:

**mostrar vinte indicadores**

e:

**mostrar cinco informações realmente importantes**

ganha:

**clareza.**

---

# 95. UX da IA deve priorizar confiança

Toda resposta importante da IA deverá permitir entender:

- o que ela encontrou;
- o que pretende fazer;
- quantas pessoas serão afetadas;
- qual dinheiro está envolvido.

---

# 96. Definition of Done UX/UI

Uma tela P0 só poderá ser considerada desenhada quando possuir:

### Viewports

- 320px
- 390px
- 768px
- 1024px
- 1440px
- 1920px

### Themes

- Light
- Dark

### States

- default;
- loading;
- empty;
- error;
- disabled;
- offline quando relevante.

### Input

- mouse;
- touch;
- keyboard.

### Roles

comportamento conforme permissions.

---

# 97. Telas prioritárias para alta fidelidade

## Grupo 1 — Design Foundation

1. Dashboard
2. Agenda
3. Appointment Detail
4. Check-in
5. Comanda/PDV
6. Pagamento
7. Caixa
8. Cliente 360

Essas telas definirão aproximadamente 70% do design system.

---

# 98. Grupo 2 — Gestão

9. CRM
10. Financeiro
11. Despesas
12. Equipe
13. Professional Wallet
14. Serviços
15. Produtos
16. Estoque
17. Fornecedores

---

# 99. Grupo 3 — Inteligência

18. Barber AI
19. AI Insight
20. AI Confirmation
21. Campanhas
22. CRM reactivation

---

# 100. Grupo 4 — Plataforma

23. Login
24. Onboarding
25. Configurações
26. Integrações
27. Plano
28. Master Admin

---

# 101. Direção final

O produto deverá parecer:

> **um sistema operacional moderno para uma barbearia, e não um painel administrativo genérico.**

A tela deve adaptar sua prioridade ao contexto.

No celular do barbeiro:

**agenda primeiro.**

No tablet da recepção:

**agenda + caixa primeiro.**

No computador do proprietário:

**operação + gestão + inteligência.**

O sistema será o mesmo, mas a experiência será contextual.
