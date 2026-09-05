# Arquitetura Técnica v1.0

**Produto:** nome provisório BarberOS
**Tipo:** SaaS B2B2C Multi-tenant
**Frontend:** Next.js / TypeScript
**Backend principal:** Next.js / TypeScript — arquitetura modular
**IA:** FastAPI / Python
**Banco:** PostgreSQL / Supabase
**Auth:** Supabase Auth
**Storage:** Supabase Storage
**Cache / Queue:** Redis
**Frontend Deploy:** Vercel
**Services / Workers:** Railway
**Versão:** 1.0

---

# 1. Objetivos arquiteturais

A arquitetura deverá suportar:

- multi-tenancy;
- múltiplas unidades;
- RBAC + permissions;
- agenda;
- CRM;
- comandas;
- PDV;
- caixa;
- estoque;
- financeiro;
- comissões;
- funcionários;
- fornecedores;
- WhatsApp;
- IA com Function Calling;
- assinaturas SaaS;
- planos e entitlements;
- Master Admin;
- auditoria;
- jobs;
- webhooks;
- escalabilidade futura.

Sem cair inicialmente em uma arquitetura distribuída complexa.

---

# 2. Decisão principal

Começaremos com:

## Modular Monolith + AI Service + Worker

```text
                         INTERNET
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       CLIENTE WEB                   WHATSAPP / APIs
             │                             │
             ▼                             ▼
     ┌───────────────┐             ┌──────────────┐
     │    Next.js    │             │   Webhooks   │
     │     Vercel    │             │    Next.js   │
     └───────┬───────┘             └──────┬───────┘
             │                             │
             └─────────────┬───────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ APPLICATION / DOMAIN│
                │     TypeScript      │
                └─────────┬───────────┘
                          │
             ┌────────────┼─────────────┐
             │            │             │
             ▼            ▼             ▼
        PostgreSQL       Redis       Outbox
        Supabase                     Events
             │
             │
      ┌──────┴─────────┐
      │                │
      ▼                ▼
   Worker           FastAPI
  Railway             AI
      │                │
      ▼                ▼
 WhatsApp/API      LLM Providers
 Jobs/Events           │
                       ▼
                  Tool Gateway
                       │
                       ▼
                 Domain Backend
```

---

# 3. Por que não microsserviços agora

O sistema possui muitos domínios:

```text
Agenda
CRM
Financeiro
PDV
Estoque
Equipe
IA
Billing
WhatsApp
```

Mas isso não significa que devemos transformá-los imediatamente em serviços separados.

Isso criaria desde o início:

- chamadas de rede;
- autenticação entre serviços;
- tracing distribuído;
- filas obrigatórias;
- transações distribuídas;
- mais deploys;
- mais infraestrutura;
- maior dificuldade de desenvolvimento.

Começaremos como:

**monólito modular.**

Cada domínio possuirá fronteiras internas bem definidas.

Quando algum módulo realmente justificar isolamento, poderá ser extraído.

---

# 4. Componentes principais

Teremos quatro grandes aplicações.

```text
apps/
├── web
├── worker
├── ai
└── future-mobile
```

## `web`

Next.js.

Responsável por:

- interface;
- API;
- autenticação;
- autorização;
- regras de negócio;
- comandos;
- queries;
- webhooks;
- Tool Gateway;
- Master Admin.

## `worker`

Node.js/TypeScript.

Responsável por:

- jobs;
- notificações;
- campanhas;
- WhatsApp;
- processamento assíncrono;
- outbox;
- tarefas agendadas;
- recálculos;
- webhooks assíncronos.

## `ai`

FastAPI/Python.

Responsável por:

- Barber AI;
- orquestração;
- prompts;
- LLM;
- Function Calling;
- classificação;
- interpretação;
- geração;
- reasoning;
- AI policies.

O serviço **não acessará diretamente o banco operacional**.

---

# 5. Monorepo

Recomendação:

```text
barberos/
│
├── apps/
│   ├── web/
│   ├── worker/
│   └── ai/
│
├── packages/
│   ├── domain/
│   ├── db/
│   ├── auth/
│   ├── permissions/
│   ├── contracts/
│   ├── events/
│   ├── integrations/
│   ├── ui/
│   ├── config/
│   └── testing/
│
├── infra/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── security/
│   └── api/
│
└── scripts/
```

---

# 6. Estrutura do backend

O erro que devemos evitar é colocar regra de negócio diretamente dentro de:

```text
route.ts
```

O Route Handler será somente adaptador.

Exemplo:

```text
HTTP
 ↓
Controller
 ↓
Application Service
 ↓
Domain
 ↓
Repository
 ↓
PostgreSQL
```

Exemplo:

```text
POST /appointments

route.ts
    ↓
CreateAppointmentCommand
    ↓
AppointmentService
    ↓
AvailabilityPolicy
    ↓
AppointmentRepository
```

---

# 7. Módulos de domínio

Inicialmente:

```text
modules/
│
├── identity
├── tenants
├── branches
│
├── professionals
├── customers
├── services
├── scheduling
│
├── orders
├── pos
├── payments
├── cash-register
│
├── finance
├── commissions
│
├── catalog
├── inventory
├── suppliers
│
├── crm
├── campaigns
├── messaging
│
├── subscriptions
├── billing
│
├── ai
├── notifications
│
├── audit
└── platform-admin
```

Cada módulo possuirá algo semelhante a:

```text
scheduling/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

---

# 8. Domain Layer

Exemplo:

```text
scheduling/domain/

Appointment.ts
AppointmentStatus.ts
AvailabilityPolicy.ts
Schedule.ts
ScheduleBlock.ts
AppointmentRepository.ts
events/
```

O domínio não deve conhecer:

- Next.js;
- React;
- Supabase SDK;
- Redis;
- OpenAI;
- WhatsApp.

Isso mantém as regras reutilizáveis.

---

# 9. Application Layer

Responsável pelos casos de uso.

Exemplos:

```text
CreateAppointment
CancelAppointment
CheckInCustomer
CompleteAppointment

OpenOrder
AddOrderItem
ReceivePayment

CloseCashRegister

CreateExpense

CalculateCommission
CreateCommissionPayout
```

---

# 10. Infrastructure Layer

Implementações concretas.

Exemplo:

```text
PostgresAppointmentRepository
RedisAvailabilityCache
WhatsAppCloudAdapter
SupabaseStorageAdapter
```

---

# 11. Multi-tenancy

Essa é uma das decisões mais importantes.

Toda entidade de negócio deverá carregar:

```text
tenant_id
```

Quando aplicável:

```text
branch_id
```

Exemplo:

```text
appointments

id
tenant_id
branch_id
customer_id
professional_id
...
```

Isso vale para praticamente:

- clientes;
- serviços;
- funcionários;
- estoque;
- comandas;
- pagamentos;
- financeiro;
- campanhas;
- fornecedores.

---

# 12. Entidades globais

Algumas entidades não pertencem diretamente a tenant.

Exemplos:

```text
platform_users
saas_plans
features
global_settings
```

---

# 13. Tenant Context

Toda requisição autenticada produzirá:

```text
RequestContext
{
  userId
  tenantId
  membershipId
  role
  permissions
  branchScope
}
```

Esse objeto será utilizado em toda operação.

Nunca:

```typescript
repository.findAll();
```

Mas conceitualmente:

```typescript
repository.findAll(context);
```

---

# 14. Tenant selecionado

Um usuário poderá pertencer a mais de uma barbearia.

Exemplo:

```text
Usuário João

├── Barbearia Alpha
└── Barbearia Beta
```

A aplicação terá um:

**Active Workspace / Active Tenant**

O backend sempre validará se o usuário realmente possui membership naquele tenant.

Não confiaremos somente em um `tenant_id` vindo do navegador.

---

# 15. Branch Scope

Profissional poderá ter acesso somente à:

```text
Unidade Centro
```

Enquanto proprietário:

```text
Todas as unidades
```

O contexto terá:

```text
branchScope:
[
 branch-a,
 branch-b
]
```

ou:

```text
ALL
```

---

# 16. RLS

Utilizaremos PostgreSQL Row Level Security como segunda camada de proteção.

Regra conceitual:

```sql
tenant_id = current_tenant()
```

Mas não dependeremos exclusivamente do RLS.

Teremos:

```text
Aplicação
+
Repository tenant scoped
+
RLS
```

Defense in depth.

---

# 17. Nunca usar Service Role no navegador

A chave administrativa do Supabase:

**nunca será enviada ao cliente.**

Service credentials existirão somente em ambientes server-side controlados.

---

# 18. Autenticação

Supabase Auth.

Inicialmente:

- e-mail/senha;
- recuperação;
- magic link opcional.

Futuramente:

- Google;
- Apple;
- MFA.

---

# 19. Autorização

Não usaremos:

```text
if role == OWNER
```

espalhado pelo sistema.

Teremos serviço central:

```text
AuthorizationService
```

Exemplo:

```typescript
authorize({
  actor,
  permission: 'finance.expense.create',
  tenant,
  branch,
});
```

---

# 20. Roles

Inicialmente:

```text
OWNER
MANAGER
FINANCE
RECEPTIONIST
PROFESSIONAL
```

Plataforma:

```text
PLATFORM_MASTER
PLATFORM_SUPPORT
```

---

# 21. Permissions

Exemplos:

```text
appointment.read
appointment.create
appointment.update
appointment.cancel

order.create
order.item.add
order.item.remove

payment.receive
payment.refund

cash.open
cash.withdraw
cash.close

finance.read
finance.write

commission.read
commission.manage

inventory.read
inventory.write
```

---

# 22. Banco PostgreSQL

Supabase fornecerá PostgreSQL gerenciado.

O banco será organizado logicamente por domínios.

Possível separação por schemas:

```text
auth
public/app
billing
audit
platform
```

Não é necessário criar um schema por tenant.

Isso complicaria enormemente a operação.

---

# 23. IDs

Utilizar:

**UUID v7** quando possível.

Vantagens:

- globalmente únicos;
- aproximadamente ordenáveis;
- bons para sistemas distribuídos;
- difíceis de enumerar.

---

# 24. Datas e timezone

Banco:

```text
UTC
```

Cada branch terá:

```text
timezone
```

Exemplo:

```text
America/Sao_Paulo
```

Datas exibidas ao usuário serão convertidas para timezone da unidade.

Nunca armazenar agendamento apenas como:

```text
14:00
```

Sem timezone/contexto.

---

# 25. Agenda e concorrência

Esse ponto é crítico.

Dois usuários podem tentar reservar:

```text
Carlos
14:00
```

simultaneamente.

Não podemos depender apenas de:

```text
if horário livre
```

no frontend.

O PostgreSQL deve impedir conflitos.

---

# 26. Proteção contra double booking

Idealmente utilizaremos uma constraint baseada em range temporal.

Conceitualmente:

```text
professional_id
+
[start_at, end_at)
```

Para appointments ativos.

O banco não permitirá interseção para o mesmo profissional.

Assim, mesmo duas requests simultâneas não conseguem duplicar o horário.

---

# 27. Idempotency

Operações críticas aceitarão:

```text
Idempotency-Key
```

Especialmente:

- pagamento;
- webhook;
- criação via IA;
- mensagens;
- billing.

Se a mesma operação chegar duas vezes, não será executada duas vezes.

---

# 28. Agendamento

Aggregate principal:

```text
Appointment
```

Relacionamentos:

```text
Appointment
│
├── Customer
├── Professional
├── Branch
└── AppointmentServices[]
```

Status:

```text
PENDING
CONFIRMED
CHECKED_IN
IN_SERVICE
COMPLETED
CANCELLED
NO_SHOW
```

---

# 29. Check-in

O check-in será uma operação transacional importante.

```text
CheckInCustomer
```

Executará:

```text
Appointment
    ↓
CHECKED_IN
    ↓
OpenOrder
    ↓
Add scheduled services
```

Preferencialmente na mesma transação.

Assim não teremos:

```text
cliente checked-in
mas sem comanda
```

---

# 30. Comanda

Aggregate:

```text
Order
```

Não usaremos `Command` em inglês porque conflitaria semanticamente com Command Pattern.

No código:

```text
Order
```

Na interface:

**Comanda**

---

# 31. Order

Estrutura:

```text
Order
│
├── tenant
├── branch
├── customer?
├── appointment?
├── status
│
├── items[]
│
└── payments[]
```

Appointment será opcional.

Portanto:

```text
Appointment → Order
```

ou:

```text
Manual Order
```

---

# 32. OrderItem

Não poderá depender do preço atual do produto.

Cada item armazenará snapshot:

```text
item_name
item_type
quantity
unit_price
discount
final_price
tax_data future
```

Referência opcional:

```text
service_id
product_id
```

---

# 33. Origem do OrderItem

```text
APPOINTMENT
MANUAL
UPSELL
PACKAGE
SUBSCRIPTION
```

Isso será útil para analytics.

---

# 34. Catálogo

Para o PDV, teremos conceito comum:

```text
CatalogItem
```

Tipos:

```text
SERVICE
PRODUCT
FOOD
BEVERAGE
OTHER
```

Mas internamente serviços continuarão tendo domínio próprio.

O `CatalogItem` funcionará principalmente como:

**representação comercial do item no PDV.**

---

# 35. Produtos arbitrários

Não criaremos tabelas separadas:

```text
beer
candy
hair_product
```

Teremos:

```text
Product
```

e:

```text
ProductCategory
```

O tenant poderá criar qualquer categoria.

---

# 36. Estoque

Movimentações serão imutáveis.

```text
StockMovement
```

Tipos:

```text
PURCHASE
SALE
CONSUMPTION
LOSS
RETURN
ADJUSTMENT
TRANSFER
```

---

# 37. Stock balance

Não alteraremos simplesmente:

```text
product.stock = 10
```

sem histórico.

Fonte:

```text
StockMovement
```

Saldo poderá ser:

- calculado;
- ou mantido como projeção para performance.

Mas toda alteração terá movimento associado.

---

# 38. Venda e estoque

Padrão inicial:

```text
Order PAID
↓
StockMovement SALE
```

Assim adicionar uma cerveja a uma comanda e depois removê-la não gera movimento incorreto.

Futuramente poderá existir:

```text
inventory reservation
```

---

# 39. PDV

Operação:

```text
Order
↓
OrderItems
↓
Payment
↓
Stock
↓
Financial Entry
↓
Commission
```

A finalização deverá ser transacional sempre que possível.

---

# 40. Pagamentos

Entidade:

```text
Payment
```

Um Order poderá ter:

```text
1..N Payments
```

Permitindo:

```text
PIX R$50
Cash R$30
Credit R$20
```

---

# 41. Payment Status

```text
PENDING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Mesmo pagamentos manuais deverão seguir um lifecycle consistente.

---

# 42. Caixa

Teremos:

```text
CashRegister
```

Representando o caixa físico.

E:

```text
CashRegisterSession
```

Representando abertura/fechamento.

---

# 43. Movimentos de caixa

```text
CashMovement
```

Exemplos:

```text
OPENING_BALANCE
SALE
WITHDRAWAL
CASH_IN
REFUND
EXPENSE
ADJUSTMENT
```

Nunca apagar movimentos financeiros.

Corrigir por movimento inverso/ajuste.

---

# 44. Financeiro

A arquitetura deve distinguir:

## Domínio operacional

```text
Order
Payment
Expense
Commission
```

de:

## Visão financeira

```text
FinancialEntry
```

---

# 45. FinancialEntry

Servirá como ledger gerencial normalizado.

Exemplo:

```text
id
tenant_id
branch_id

direction:
IN
OUT

type:
SERVICE_REVENUE
PRODUCT_REVENUE
EXPENSE
COMMISSION
REFUND
OTHER

amount

competence_date
cash_date

source_type
source_id

category_id
```

Isso permitirá gerar:

- fluxo de caixa;
- DRE gerencial;
- relatórios;
- previsões.

---

# 46. Imutabilidade financeira

Uma transação paga não será simplesmente sobrescrita.

Exemplo:

```text
Payment R$100
```

Se houver estorno:

```text
Payment R$100
Refund -R$100
```

Assim temos rastreabilidade.

---

# 47. Comissão

Uma regra de comissão pode mudar.

Exemplo:

Hoje:

```text
Carlos = 50%
```

Daqui dois meses:

```text
Carlos = 55%
```

Os atendimentos antigos não podem mudar.

---

# 48. Commission Accrual

Quando o serviço for concluído/pago:

```text
CommissionRule
↓
snapshot
↓
CommissionAccrual
```

Exemplo:

```text
service_amount: 50
commission_rate: 50%
commission_amount: 25
rule_version: xyz
```

Imutável.

---

# 49. Payout

Posteriormente:

```text
CommissionAccrual[]
↓
Payout
```

Exemplo:

```text
Carlos

01–15 setembro

R$2.450
```

---

# 50. Event Driven Interno

Embora seja monólito, utilizaremos eventos de domínio.

Exemplo:

```text
AppointmentCheckedIn
OrderPaid
CustomerCreated
StockLow
PaymentReceived
CommissionAccrued
```

---

# 51. Transactional Outbox

Esse será um padrão importante.

Imagine:

```text
Payment PAID
```

E depois precisamos:

- atualizar estoque;
- calcular comissão;
- enviar mensagem;
- atualizar CRM.

Não queremos depender de todas essas operações acontecerem sincronamente.

---

# 52. Outbox

Na mesma transação do pagamento:

```text
UPDATE payment
INSERT financial_entry
INSERT outbox_event
```

Depois o worker processa:

```text
outbox_event
↓
jobs
```

Se o worker estiver temporariamente offline:

**o pagamento continua registrado corretamente.**

---

# 53. Worker

Deploy:

```text
Railway
```

Responsabilidades:

```text
Outbox processor
WhatsApp sender
Campaign worker
Reminder jobs
CRM recalculation
Stock alerts
Subscription jobs
AI scheduled insights
Webhook processing
```

---

# 54. Redis

Redis terá quatro principais usos:

### Cache

Exemplo:

- permissions;
- availability;
- entitlements.

### Queue

Jobs.

### Rate limit

Especialmente:

- login;
- IA;
- WhatsApp;
- API.

### Locks

Quando necessário.

---

# 55. Jobs

Exemplo:

```text
appointment.reminder
```

Payload:

```json
{
  "appointmentId": "..."
}
```

O worker buscará o estado atual no banco.

Não devemos colocar todos os dados do cliente no job se não for necessário.

---

# 56. Retry

Jobs externos terão:

```text
retry
exponential backoff
dead-letter
```

Exemplo:

WhatsApp indisponível.

Tentativas:

```text
1 min
5 min
30 min
```

dependendo do tipo.

---

# 57. WhatsApp

Arquitetura:

```text
WhatsApp Provider
       ↓
Webhook
       ↓
Signature Validation
       ↓
Idempotency
       ↓
Event Queue
       ↓
Conversation Router
       ↓
Barber AI
       ↓
Tool Gateway
       ↓
Domain
       ↓
Response
       ↓
Queue
       ↓
WhatsApp Provider
```

---

# 58. Messaging Provider

Criaremos uma abstração:

```text
MessagingProvider
```

Implementações futuras:

```text
MetaWhatsAppProvider
OtherBSPProvider
```

Assim o sistema não ficará preso a um fornecedor.

---

# 59. WhatsApp por tenant

Entidade:

```text
MessagingConnection
```

Vinculada a:

```text
tenant_id
branch_id optional
```

Permitindo futuramente:

```text
Unidade Centro → número A
Unidade Shopping → número B
```

---

# 60. Conversas

Teremos:

```text
Conversation
Message
```

Conectadas a:

```text
tenant
customer
channel
```

Channel:

```text
WHATSAPP
WEB
```

Futuramente:

```text
INSTAGRAM
SMS
```

---

# 61. Arquitetura da IA

Aplicação:

```text
FastAPI
```

Componentes internos:

```text
ai/
├── api/
├── orchestrator/
├── agents/
├── tools/
├── providers/
├── policies/
├── memory/
├── prompts/
├── evaluations/
└── observability/
```

---

# 62. LLM Provider abstraction

Não acoplaremos todo sistema diretamente a um único modelo.

Interface:

```python
class LLMProvider:
    async def chat(...)
    async def structured(...)
    async def tool_call(...)
```

Possibilitando diferentes provedores/modelos no futuro.

---

# 63. IA sem acesso direto ao banco

Regra arquitetural:

```text
AI
X
Database
```

Não permitido:

```text
FastAPI
↓
service_role
↓
SELECT * FROM customers
```

---

# 64. Tool Gateway

Fluxo correto:

```text
FastAPI
↓
Tool Gateway
↓
Authorization
↓
Application Service
↓
Domain
↓
Database
```

---

# 65. Exemplo

IA chama:

```text
appointments.get_availability
```

FastAPI executa:

```text
POST /internal/tools/appointments/get-availability
```

Backend recebe contexto assinado:

```text
tenant
actor
permissions
conversation
```

E executa.

---

# 66. Service Token

O backend fornecerá ao serviço AI um token curto.

Exemplo conceitual:

```text
tenant_id
user_id
membership_id
branch_scope
permissions
conversation_id
expires_at
```

TTL curto.

Por exemplo:

```text
1–5 minutos
```

A IA não escolhe arbitrariamente:

```text
tenant_id
```

---

# 67. AI Tool Registry

No backend:

```text
ToolRegistry
```

Exemplo:

```text
appointments.get_availability
appointments.create
appointments.cancel

customers.search

finance.get_summary

crm.find_at_risk
```

Cada ferramenta define:

```text
schema
permission
risk_level
handler
```

---

# 68. Tool Risk

Exemplo:

```text
appointments.get_availability
risk = READ
```

```text
appointments.create
risk = LOW_WRITE
```

```text
campaign.send
risk = CONFIRMATION_REQUIRED
```

```text
payment.refund
risk = HIGH_RISK
```

---

# 69. Confirmation Token

Para ações sensíveis:

IA solicita:

```text
"Enviar campanha para 347 clientes?"
```

Backend gera:

```text
PendingAction
```

com:

```text
payload_hash
actor
tenant
expires_at
```

Ao usuário confirmar:

```text
ConfirmationToken
```

Então executamos exatamente aquela ação.

A IA não consegue modificar silenciosamente o conteúdo após confirmação.

---

# 70. AI Audit

Todas as ferramentas gerarão:

```text
AIToolExecution
```

Campos:

```text
conversation
tool
actor
tenant
arguments_hash
result
risk
confirmed
duration
model
token_usage
```

---

# 71. Memória da IA

Separaremos:

### Conversation Memory

Contexto daquela conversa.

### Business Context

Dados obtidos pelas tools.

### Knowledge Base

Informações institucionais da barbearia.

Exemplo:

```text
estacionamento
política de cancelamento
endereço
serviços
regras
```

---

# 72. RAG

Não é obrigatório no P0.

No futuro poderemos usar:

```text
PostgreSQL + pgvector
```

para documentos:

- FAQs;
- políticas;
- treinamento;
- procedimentos.

Mas dados transacionais nunca serão recuperados apenas via embeddings.

Exemplo:

> Quanto faturamos ontem?

Sempre via:

```text
finance.get_summary
```

---

# 73. IA e finanças

A IA não calcula o financeiro a partir de mensagens ou texto.

O backend calcula.

A IA interpreta.

Fluxo:

```text
finance.compare_periods()
↓
JSON estruturado
↓
LLM
↓
explicação
```

---

# 74. IA proativa

Jobs poderão detectar:

```text
clientes em risco
horários vagos
estoque baixo
queda de faturamento
contas vencendo
```

Mas inicialmente a IA somente:

**sugere ações.**

Não envia campanhas automaticamente sem política configurada.

---

# 75. CRM Intelligence

Teremos cálculo determinístico inicialmente.

Exemplo:

```text
average_return_days
days_since_last_visit
```

Status:

```text
ACTIVE
COOLING
AT_RISK
INACTIVE
```

Depois poderemos utilizar ML.

Não precisamos de ML no MVP.

---

# 76. Billing SaaS

Separar:

**financeiro da barbearia**

de:

**billing do nosso SaaS.**

São domínios diferentes.

---

# 77. SaaS Billing

Entidades:

```text
SaaSPlan
Feature
PlanEntitlement
TenantSubscription
UsageCounter
Invoice
BillingEvent
```

---

# 78. Feature Entitlements

Exemplo:

```text
feature:
AI_CHAT
```

Plano:

```text
Pro AI
```

Entitlement:

```text
enabled = true
limit = 1000/month
```

Backend verifica:

```text
EntitlementService
```

---

# 79. Nunca esconder recurso apenas no frontend

Errado:

```text
if plan !== PRO:
    hide button
```

Isso ajuda UX, mas não protege nada.

O backend também exige:

```text
requireEntitlement()
```

---

# 80. Usage Metering

Recursos medidos:

```text
ai_requests
ai_tokens
whatsapp_messages
professionals
branches
storage
```

Uso poderá alimentar:

- limites;
- cobrança;
- alertas.

---

# 81. Gateway de pagamento SaaS

Arquitetura terá interface:

```text
BillingProvider
```

Exemplo:

```text
createCustomer
createSubscription
cancelSubscription
createPayment
handleWebhook
```

Assim podemos utilizar inicialmente um gateway e trocar/adicionar outro posteriormente.

---

# 82. Webhooks

Endpoints separados:

```text
/api/webhooks/billing
/api/webhooks/whatsapp
```

Todos deverão:

1. validar assinatura;
2. validar timestamp;
3. verificar idempotência;
4. persistir evento;
5. responder rapidamente;
6. processar assíncronamente.

---

# 83. Storage

Supabase Storage.

Inicialmente:

```text
avatars
product-images
tenant-branding
receipts
documents
```

Organização:

```text
tenant/{tenant_id}/...
```

Com policies correspondentes.

---

# 84. Upload

Utilizar URLs assinadas.

Não enviar arquivos pesados através do backend Next quando pudermos fazer upload direto seguro ao storage.

---

# 85. Auditoria

Tabela:

```text
AuditLog
```

Campos:

```text
id
tenant_id
actor_type
actor_id
action
entity_type
entity_id
before
after
ip
user_agent
request_id
created_at
```

---

# 86. Não auditar tudo indiscriminadamente

Prioridade:

- financeiro;
- pagamento;
- comissão;
- permissões;
- caixa;
- estoque sensível;
- exclusões;
- IA;
- Master Admin.

---

# 87. Soft delete

Nem toda entidade deve ser realmente excluída.

Exemplos:

```text
Customer
Professional
Product
```

podem utilizar:

```text
archived_at
```

Financeiro:

**nunca hard-delete.**

---

# 88. Master Admin

Área separada:

```text
/master
```

Não apenas mais uma opção na sidebar do tenant.

---

# 89. Platform users

Tabela lógica separada:

```text
PlatformMembership
```

Não misturar:

```text
OWNER
```

com:

```text
PLATFORM_MASTER
```

São níveis diferentes.

---

# 90. Impersonation

Se implementado:

```text
Platform Admin
↓
Request Support Access
↓
reason
↓
temporary session
↓
audit log
```

UI deve mostrar:

> Você está acessando Barbearia X como suporte.

---

# 91. API

Estrutura:

```text
/api/v1/
```

Exemplo:

```text
/api/v1/appointments
/api/v1/customers
/api/v1/orders
/api/v1/payments
/api/v1/finance
```

---

# 92. Internal API

A IA e workers poderão usar:

```text
/internal/
```

Exemplo:

```text
/internal/tools/...
```

Não exposto como API pública convencional.

Autenticação service-to-service obrigatória.

---

# 93. Contracts

Schemas serão compartilhados.

TypeScript:

```text
Zod
```

Python:

```text
Pydantic
```

Contratos das tools deverão ser versionados.

---

# 94. Versionamento

Tool:

```text
appointments.create.v1
```

Ou versão global do contrato.

Isso evita quebrar o AI Service durante deploys independentes.

---

# 95. API Error Model

Formato padronizado:

```json
{
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "...",
    "requestId": "..."
  }
}
```

Nunca depender apenas de mensagem textual.

---

# 96. Request ID

Toda request receberá:

```text
request_id
```

Propagado entre:

```text
Next
Worker
FastAPI
External APIs
Logs
```

Muito importante para debugging.

---

# 97. Observabilidade

Três pilares:

```text
Logs
Metrics
Traces
```

Precisaremos acompanhar:

- latência;
- erros;
- jobs;
- DB;
- AI;
- WhatsApp;
- webhooks;
- pagamentos.

---

# 98. Logs estruturados

Não:

```text
console.log("erro")
```

Mas algo como:

```json
{
  "level": "error",
  "requestId": "...",
  "tenantId": "...",
  "module": "payments",
  "event": "payment_failed"
}
```

Dados sensíveis devem ser mascarados.

---

# 99. Product Analytics

Separado da observabilidade.

Eventos:

```text
appointment_created
order_paid
ai_booking_completed
customer_reactivated
```

Servirá para validar o produto.

---

# 100. Segurança de aplicação

Princípios:

```text
least privilege
deny by default
tenant isolation
server-side authorization
immutable audit
secret rotation
```

---

# 101. Rate limiting

Aplicar especialmente:

```text
auth
AI
public booking
WhatsApp
search
webhooks
```

---

# 102. Public Booking

A página pública de agendamento não pode expor:

- IDs sequenciais;
- clientes;
- agenda completa;
- telefones;
- dados internos.

Só retorna disponibilidade permitida.

---

# 103. Anti-abuse

Agendamento público deverá prever:

- rate limiting;
- CAPTCHA adaptativo futuramente;
- confirmação do telefone;
- limits;
- detecção de abuso.

---

# 104. Secrets

Nunca no repositório.

Ambientes:

```text
development
preview
staging
production
```

Cada um terá credenciais distintas.

---

# 105. Deploy

## Vercel

```text
apps/web
```

Responsável por:

- frontend;
- SSR;
- Server Components;
- APIs síncronas;
- webhooks rápidos.

---

# 106. Railway

```text
apps/ai
apps/worker
```

O worker precisa ser processo persistente.

FastAPI também.

---

# 107. Supabase

```text
PostgreSQL
Auth
Storage
```

---

# 108. Redis

Pode ser hospedado separadamente.

Arquitetura não deve depender de recursos específicos do provedor.

---

# 109. O que não executar no Vercel síncronamente

Exemplos:

```text
enviar 5.000 WhatsApps
processar relatório gigante
recalcular CRM inteiro
gerar insights de todos tenants
```

Tudo isso:

```text
Queue
↓
Worker
```

---

# 110. Cron / Scheduler

Exemplos:

```text
08:00 resumo diário
a cada hora horários vagos
01:00 recálculo CRM
lembretes de agendamento
contas vencendo
```

Scheduler somente cria jobs.

Worker executa.

---

# 111. CI/CD

Pipeline:

```text
lint
↓
typecheck
↓
unit tests
↓
integration tests
↓
migration validation
↓
build
↓
deploy
```

---

# 112. Migrations

Todas as alterações do banco via migrations versionadas.

Nunca editar produção manualmente sem registro.

---

# 113. Backward compatibility

Deploy de banco e aplicação deve seguir:

```text
expand
migrate
contract
```

Evitar:

```text
DROP column
```

junto com deploy que ainda depende dela.

---

# 114. Testes

Teremos diferentes camadas.

### Unit

Regras.

Exemplo:

```text
CommissionPolicy
```

### Integration

Banco real/test database.

### API

Endpoints.

### E2E

Fluxos completos.

---

# 115. E2E críticos

Fluxo 1:

```text
login
→ agenda
→ check-in
→ comanda
→ pagamento
→ comissão
```

Fluxo 2:

```text
walk-in
→ nova comanda
→ cerveja + pomada
→ pagamento
→ estoque
→ financeiro
```

Fluxo 3:

```text
WhatsApp
→ IA
→ disponibilidade
→ agendamento
```

---

# 116. Teste obrigatório de tenant isolation

Devemos possuir testes específicos:

```text
Tenant A cria Customer A
Tenant B tenta acessar Customer A
→ 403/404
```

Para diversos módulos.

Esses testes serão parte da pipeline.

---

# 117. Testes da IA

Não testaremos somente texto.

Testaremos:

```text
intent
tool selected
arguments
authorization
side effect
```

Exemplo:

> marque João amanhã às 14.

Esperado:

```text
appointments.create
```

e não resposta inventada.

---

# 118. Feature Flags

Teremos:

```text
FeatureFlag
```

Separado de entitlement.

### Entitlement

O plano permite?

### Feature flag

Nós liberamos?

Isso permite:

```text
AI Finance
apenas beta testers
```

---

# 119. Cache

Não cachear agressivamente dados críticos financeiros.

Bom uso:

```text
services
catalog
permissions
entitlements
availability projection
```

Com invalidação explícita.

---

# 120. Search

P0:

PostgreSQL.

Exemplo:

```text
customers
products
services
```

Usando índices adequados.

Não precisamos Elasticsearch inicialmente.

---

# 121. Índices essenciais

Exemplos:

```text
tenant_id
tenant_id + branch_id

tenant_id + phone

professional_id + start_at

customer_id + created_at

order_id

product_id + branch_id
```

O ERD definirá os detalhes.

---

# 122. Escalabilidade

Primeira escala:

```text
mais instâncias web
mais workers
mais AI replicas
```

Banco permanece central.

---

# 123. Quando extrair um microsserviço

Somente quando houver razão real.

Exemplo:

### Messaging

Milhões de mensagens.

### AI

Já separado.

### Billing

Possivelmente.

### Reports

Processamento pesado.

Mas não antes disso.

---

# 124. Fluxo arquitetural: agendamento pela interface

```text
User
↓
Next.js
↓
CreateAppointment
↓
Authorization
↓
AvailabilityPolicy
↓
PostgreSQL constraint
↓
Appointment created
↓
Outbox
↓
Worker
↓
Reminder scheduled
```

---

# 125. Fluxo: check-in

```text
Reception
↓
Check-in
↓
Transaction
│
├── Appointment → CHECKED_IN
│
├── Order created
│
└── Scheduled services copied to OrderItems
↓
Commit
```

---

# 126. Fluxo: cliente sem agenda

```text
Reception
↓
New Order
↓
Customer OR Walk-in
↓
Add service/product/beverage
↓
Payment
↓
Order PAID
↓
Outbox
├── inventory
├── finance
├── commission
└── CRM
```

---

# 127. Fluxo: venda de bebida

```text
Order
↓
Cerveja x2
↓
Payment
↓
StockMovement
SALE -2
↓
FinancialEntry
PRODUCT_REVENUE
```

---

# 128. Fluxo: comissão

```text
OrderItem(Service)
↓
Order paid
↓
CommissionRule
↓
CommissionAccrual
↓
Professional Wallet
```

---

# 129. Fluxo: IA interna

```text
Owner:
"Quanto lucrei esse mês?"

↓
FastAPI
↓
tool:
finance.get_summary
↓
Tool Gateway
↓
Authorization
↓
Finance Module
↓
Postgres
↓
structured response
↓
FastAPI
↓
natural language
```

---

# 130. Fluxo: WhatsApp

```text
Cliente:
"Tem corte amanhã às 18?"

↓
WhatsApp
↓
Webhook
↓
Queue
↓
FastAPI
↓
appointments.get_availability
↓
Backend
↓
Available slots
↓
FastAPI
↓
WhatsApp
```

---

# 131. Fluxo: confirmação pela IA

Cliente:

```text
Pode marcar às 18:30.
```

↓

IA:

```text
appointments.create
```

↓

Backend:

```text
validate customer
validate service
validate professional
validate availability
validate tenant
```

↓

Banco:

```text
appointment
```

↓

Resposta:

> Agendado.

---

# 132. Arquitetura final resumida

```text
                        ┌──────────────────┐
                        │      CLIENT      │
                        │ Web / Mobile PWA │
                        └────────┬─────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │       NEXT.JS        │
                     │       VERCEL         │
                     │                      │
                     │ UI                   │
                     │ API                  │
                     │ Domain               │
                     │ Tool Gateway         │
                     └──────┬───────┬───────┘
                            │       │
                  ┌─────────┘       └─────────┐
                  ▼                           ▼
        ┌──────────────────┐         ┌────────────────┐
        │     SUPABASE     │         │     REDIS      │
        │                  │         │                │
        │ PostgreSQL       │         │ Cache          │
        │ Auth             │         │ Queue          │
        │ Storage          │         │ Rate Limit     │
        └────────┬─────────┘         └───────┬────────┘
                 │                           │
                 │                           ▼
                 │                    ┌───────────────┐
                 │                    │    WORKER     │
                 │                    │    Railway    │
                 │                    └───────┬───────┘
                 │                            │
                 │              ┌─────────────┼────────────┐
                 │              ▼             ▼            ▼
                 │          WhatsApp       Billing      Jobs
                 │
                 ▼
        ┌──────────────────┐
        │      FASTAPI     │
        │    AI SERVICE    │
        │     Railway      │
        │                  │
        │ Barber AI        │
        │ Orchestrator     │
        │ Function Calls   │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  LLM PROVIDERS   │
        └──────────────────┘

FastAPI
    │
    └──────────── Tool Gateway ────────────► Next.js Domain
```

---

# 133. Decisões arquiteturais oficiais v1

## ADR-001

**Modular Monolith para o backend principal.**

## ADR-002

**Next.js será frontend + application/backend API inicial.**

## ADR-003

**FastAPI será serviço independente exclusivamente para IA.**

## ADR-004

**FastAPI não possui acesso direto ao banco operacional.**

## ADR-005

**PostgreSQL/Supabase será a fonte de verdade.**

## ADR-006

**Todo domínio operacional será tenant-scoped.**

## ADR-007

**Autorização será RBAC + permissions server-side.**

## ADR-008

**RLS será defesa adicional de tenant isolation.**

## ADR-009

**Redis será utilizado para queue/cache/rate limiting.**

## ADR-010

**Worker independente executará tarefas assíncronas.**

## ADR-011

**Transactional Outbox será usado para side effects críticos.**

## ADR-012

**Valores históricos de serviços/produtos/comissões usarão snapshots.**

## ADR-013

**Movimentações financeiras e de estoque serão auditáveis e preferencialmente imutáveis.**

## ADR-014

**Feature Entitlements serão controlados server-side.**

## ADR-015

**Integrações externas serão implementadas através de adapters/providers.**

---

# 134. Sequência de implementação

A arquitetura sugere começar nesta ordem:

### Foundation

```text
Monorepo
Supabase
Auth
Tenant
Branch
Membership
RBAC
Permissions
Audit
```

### Core Operations

```text
Professional
Service
Customer
Schedule
Appointment
```

### POS

```text
Catalog
Product
Order
OrderItem
Payment
CashRegister
```

### Money

```text
Expense
FinancialEntry
Commission
Payout
```

### Infrastructure

```text
Redis
Outbox
Worker
Jobs
```

### AI

```text
FastAPI
Tool Registry
Tool Gateway
Conversation
AI Audit
```

### Communication

```text
WhatsApp
Messaging
Campaigns
```

---

# 135. Próxima etapa

Com essa arquitetura definida, os documentos seguintes devem ser produzidos nesta ordem:

```text
Architecture v1
       ↓
Domain Model
       ↓
ERD / Data Model
       ↓
API Contracts
       ↓
Threat Model
       ↓
Design System
       ↓
Information Architecture
       ↓
Wireframes
       ↓
MVP Backlog
```

O **Domain Model + ERD** agora se torna especialmente importante porque agenda, comanda, pagamento, caixa, comissão, estoque e financeiro precisam se relacionar corretamente antes de desenharmos as telas.
