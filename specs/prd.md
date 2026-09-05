# PRD v1.0 — Plataforma SaaS de Gestão Inteligente para Barbearias

**Nome interno provisório:** BarberOS
**Tipo:** SaaS B2B2C Multi-tenant
**Mercado inicial:** Barbearias e barbeiros no Brasil
**Plataformas iniciais:** Web responsiva / PWA
**Stack pretendida:** Next.js + FastAPI/Python + Supabase + Vercel/Railway
**Status:** Discovery / definição do produto
**Versão:** 1.0
**Data:** setembro de 2026

---

# 1. Resumo executivo

O produto será uma plataforma SaaS de gestão completa para barbeiros, donos de barbearias e equipes, reunindo em um único ambiente:

- agenda;
- clientes e CRM;
- serviços;
- funcionários;
- comissões e repasses;
- fluxo de caixa;
- despesas;
- contas a pagar e receber;
- estoque;
- produtos;
- fornecedores;
- assinaturas;
- fidelização;
- campanhas;
- WhatsApp;
- indicadores;
- inteligência artificial.

O objetivo não é criar apenas um sistema de agendamento.

O produto deverá funcionar como um **sistema operacional da barbearia**, capaz de responder quatro perguntas fundamentais:

1. **O que está acontecendo na minha barbearia?**
2. **Quanto estou realmente ganhando?**
3. **Onde estou perdendo dinheiro ou clientes?**
4. **O que devo fazer agora para melhorar o negócio?**

A camada de IA deverá ir além da geração de texto.

A IA terá acesso controlado a ferramentas do sistema por meio de Function Calling, podendo, dentro das permissões do usuário:

- consultar informações;
- interpretar dados;
- encontrar oportunidades;
- realizar agendamentos;
- reagendar;
- cancelar;
- identificar clientes inativos;
- preparar campanhas;
- enviar mensagens;
- consultar estoque;
- gerar relatórios;
- analisar finanças;
- criar tarefas;
- sugerir ações.

A plataforma será multi-tenant e deverá suportar desde um barbeiro autônomo até redes com várias unidades.

---

# 2. Problema

A operação de uma barbearia frequentemente está distribuída entre diferentes ferramentas e processos:

- WhatsApp;
- caderno;
- agenda;
- planilhas;
- aplicativo bancário;
- sistema de cartão;
- anotações;
- memória do proprietário;
- sistemas separados de agendamento e financeiro.

Isso cria vários problemas.

## 2.1 Problemas operacionais

- horários duplicados;
- dificuldade com encaixes;
- horários ociosos;
- cancelamentos;
- faltas;
- conflitos entre profissionais;
- dificuldade para acompanhar folgas;
- ausência de histórico centralizado.

## 2.2 Problemas financeiros

- mistura entre faturamento e lucro;
- dificuldade para calcular comissão;
- dificuldade para calcular repasses;
- despesas sem categorização;
- falta de previsibilidade;
- dificuldade para saber quanto cada profissional produz;
- dificuldade para determinar margem por serviço;
- dinheiro pessoal misturado ao dinheiro do negócio.

## 2.3 Problemas comerciais

- clientes deixam de frequentar e ninguém percebe;
- relacionamento depende da memória do barbeiro;
- pouca segmentação;
- campanhas genéricas;
- dificuldade de preencher horários ociosos;
- ausência de acompanhamento de frequência e LTV.

## 2.4 Problemas administrativos

- estoque desorganizado;
- reposição tardia;
- pouca visibilidade de custos;
- fornecedores espalhados;
- assinaturas e despesas recorrentes esquecidas;
- dificuldade para controlar várias unidades.

## 2.5 Problemas de tempo

Grande quantidade de tarefas administrativas consome o tempo que poderia ser usado em:

- atendimento;
- gestão;
- marketing;
- treinamento;
- crescimento da empresa.

---

# 3. Oportunidade

Soluções atuais já demonstram que agenda, estoque, pagamentos, marketing, proteção contra faltas, comissões e gestão de equipe são funcionalidades esperadas pelo mercado. Booksy e Fresha, por exemplo, oferecem amplos ecossistemas de agendamento, checkout, marketing, estoque e gestão; no Brasil, o Barberia.io já anuncia inclusive IA no WhatsApp, financeiro, CRM, assinaturas e multiunidade.

Portanto, possuir essas funções isoladamente não será um diferencial sustentável.

O diferencial pretendido será integrar:

**Operação + CRM + Financeiro + Equipe + Automação + IA.**

A proposta é fazer com que os dados de todas essas áreas alimentem uma camada inteligente capaz de transformar informação em ação.

---

# 4. Visão do produto

## Visão

**Ser o sistema operacional inteligente das barbearias.**

## Promessa central

> Administre toda a sua barbearia em um único lugar e deixe a inteligência artificial cuidar de grande parte do trabalho operacional.

## Transformação prometida

De:

> “Tenho vários sistemas e mesmo assim preciso descobrir tudo sozinho.”

Para:

> “Meu sistema entende minha operação, mostra o que importa e me ajuda a agir.”

---

# 5. Princípios do produto

### 5.1 Simplicidade antes de profundidade

Recursos financeiros podem ser sofisticados internamente, mas devem parecer simples ao usuário.

### 5.2 Mobile first

Grande parte dos usuários utilizará o sistema entre atendimentos.

### 5.3 Uma ação em poucos cliques

Agendar, receber e finalizar um atendimento deve ser extremamente rápido.

### 5.4 Dados antes de opinião

A IA deve basear recomendações nos dados reais do tenant.

### 5.5 IA como interface, não como banco

A IA nunca terá acesso irrestrito ao banco de dados.

### 5.6 Segurança por padrão

Todo acesso deve considerar:

- tenant;
- unidade;
- usuário;
- role;
- permission;
- contexto.

### 5.7 Automação com controle humano

Quanto maior o impacto de uma ação, maior será o nível de confirmação exigido.

### 5.8 Modularidade

Uma barbearia pequena não precisa perceber a complexidade necessária para atender uma rede de 30 unidades.

---

# 6. Hipótese principal

Se centralizarmos agenda, clientes, funcionários e financeiro e adicionarmos uma IA capaz de interpretar e executar ações sobre esses dados, então donos de barbearia conseguirão reduzir trabalho administrativo, aumentar ocupação e melhorar a previsibilidade financeira.

---

# 7. Personas

## 7.1 Barbeiro autônomo

Trabalha sozinho ou aluga uma cadeira.

### Objetivos

- organizar agenda;
- acompanhar clientes;
- reduzir faltas;
- saber quanto ganhou;
- automatizar WhatsApp;
- aumentar recorrência.

### Dores

- responde mensagens durante atendimento;
- esquece clientes;
- mistura finanças;
- não possui indicadores;
- perde horários vagos.

---

# 8. Dono de pequena barbearia

Possui aproximadamente 2–5 profissionais.

Será provavelmente nossa persona inicial mais importante.

### Objetivos

- organizar equipe;
- controlar caixa;
- calcular comissões;
- aumentar ocupação;
- acompanhar clientes;
- reduzir trabalho administrativo.

### Dores

- comissão manual;
- dificuldade para saber lucro;
- faltas;
- conflitos de agenda;
- gastos descontrolados;
- clientes desaparecendo;
- dificuldade de acompanhar a equipe.

---

# 9. Gestor de barbearia

Pode administrar operação sem ser proprietário.

Precisa acompanhar:

- agenda;
- funcionários;
- caixa;
- estoque;
- atendimento;
- metas.

Não deve obrigatoriamente enxergar:

- lucro dos sócios;
- configurações SaaS;
- dados sensíveis do proprietário.

---

# 10. Recepcionista

Prioriza velocidade.

Principais tarefas:

- localizar cliente;
- cadastrar cliente;
- consultar disponibilidade;
- agendar;
- reagendar;
- cancelar;
- abrir comanda;
- finalizar atendimento;
- receber pagamento.

A experiência deverá reduzir ao máximo cliques e navegação.

---

# 11. Profissional

Pode ser:

- barbeiro;
- cabeleireiro;
- auxiliar;
- outro profissional configurado.

Precisa principalmente de:

- própria agenda;
- clientes permitidos;
- metas;
- produção;
- comissão;
- repasses;
- gorjetas;
- histórico.

---

# 12. Cliente final

Não precisa possuir necessariamente uma conta administrativa.

Deverá conseguir:

- falar pelo WhatsApp;
- consultar horários;
- selecionar profissional;
- selecionar serviço;
- agendar;
- reagendar;
- cancelar;
- confirmar presença;
- pagar reserva;
- receber lembretes.

---

# 13. Master Admin

Representa a equipe operadora do SaaS.

Possui visão da plataforma, não da operação cotidiana de cada tenant, salvo acesso autorizado para suporte.

Gerencia:

- tenants;
- usuários;
- planos;
- assinaturas;
- limites;
- faturamento SaaS;
- IA;
- integrações;
- custos;
- suporte;
- logs;
- incidentes;
- feature flags.

---

# 14. Jobs To Be Done

## Proprietário

> Quando estou administrando minha barbearia, quero entender rapidamente como está o negócio e conseguir controlar a operação sem depender de diversas ferramentas, para ganhar tempo e aumentar meu lucro.

## Barbeiro

> Quando estou trabalhando, quero enxergar minha agenda, meus clientes e meus ganhos de forma clara para me concentrar nos atendimentos e aumentar minha renda.

## Recepcionista

> Quando um cliente entra em contato, quero encontrar e reservar um horário em poucos segundos sem cometer erros.

## Cliente

> Quando preciso cortar o cabelo ou fazer a barba, quero marcar rapidamente um horário adequado sem precisar trocar várias mensagens.

---

# 15. North Star Metric

A principal métrica de produto será:

**Atendimentos concluídos com sucesso através da plataforma por tenant ativo.**

Ela conecta:

- adoção;
- agenda;
- clientes;
- operação;
- receita.

Métricas auxiliares:

- ocupação;
- retenção;
- no-show;
- frequência;
- ticket médio;
- receita;
- margem;
- clientes reativados.

---

# 16. Estrutura organizacional

A plataforma deverá utilizar a hierarquia:

```text
PLATFORM
│
├── Tenant A
│   │
│   ├── Unidade A1
│   │
│   └── Unidade A2
│
├── Tenant B
│
└── Tenant C
```

Mesmo que multiunidade não seja disponibilizado no primeiro plano, o domínio deverá prever essa estrutura.

---

# 17. Controle de acesso

## Roles iniciais

### PLATFORM_MASTER

Equipe do SaaS.

### OWNER

Proprietário do tenant.

### MANAGER

Gestor.

### FINANCE

Responsável financeiro.

### RECEPTIONIST

Recepção.

### PROFESSIONAL

Barbeiro/profissional.

Posteriormente:

### CUSTOM_ROLE

Perfil personalizado.

---

# 18. Modelo de permissões

O sistema não deverá depender somente da role.

Utilizar:

**RBAC + Permissions.**

Exemplos:

```text
appointments.read
appointments.create
appointments.update
appointments.cancel

clients.read
clients.create
clients.update
clients.export

finance.read
finance.create
finance.approve

payroll.read
payroll.process

inventory.read
inventory.write

reports.financial
reports.team

settings.manage
```

---

# 19. Matriz resumida de acesso

| Área              | Owner |  Manager |  Finance | Reception | Professional |
| ----------------- | ----: | -------: | -------: | --------: | -----------: |
| Agenda geral      |     ✓ |        ✓ | opcional |         ✓ |     limitada |
| Clientes          |     ✓ |        ✓ | limitada |         ✓ |     limitada |
| Financeiro        |     ✓ | opcional |        ✓ |  limitado |      próprio |
| Comissões         |     ✓ |        ✓ |        ✓ |         — |      própria |
| Estoque           |     ✓ |        ✓ | opcional |  opcional |            — |
| Relatórios gerais |     ✓ |        ✓ | opcional |         — |     próprios |
| Configurações     |     ✓ | limitada |        — |         — |            — |
| Equipe            |     ✓ |        ✓ |        — |         — |            — |

O proprietário poderá limitar permissões específicas posteriormente.

---

# 20. Onboarding

O onboarding deverá levar o usuário ao primeiro valor percebido rapidamente.

## Fluxo

```text
Criar conta
↓
Criar barbearia
↓
Criar unidade
↓
Cadastrar horários
↓
Cadastrar serviços
↓
Cadastrar profissionais
↓
Importar/cadastrar clientes
↓
Configurar pagamentos/comissões
↓
Conectar WhatsApp
↓
Publicar link de agendamento
```

O dashboard mostrará progresso:

```text
Configuração da sua barbearia
████████░░ 80%
```

---

# 21. Dashboard principal

A tela inicial do proprietário deve responder:

### Hoje

- atendimentos;
- faturamento previsto;
- faturamento realizado;
- horários disponíveis;
- cancelamentos;
- faltas.

### Mês

- faturamento;
- despesas;
- lucro estimado;
- ticket médio;
- comissão;
- clientes novos;
- clientes recorrentes.

### Alertas

- horários vagos;
- clientes em risco;
- contas vencendo;
- estoque baixo;
- pagamentos pendentes.

### IA

Exemplo:

> 14 clientes estão no período esperado de retorno e ainda não agendaram.

CTA:

**Criar campanha**

---

# 22. Módulo de agenda

## Requisitos

**FR-AGENDA-01**
Visualização diária.

**FR-AGENDA-02**
Visualização semanal.

**FR-AGENDA-03**
Filtro por profissional.

**FR-AGENDA-04**
Filtro por serviço.

**FR-AGENDA-05**
Agendamento manual.

**FR-AGENDA-06**
Agendamento online.

**FR-AGENDA-07**
Agendamento pelo WhatsApp/IA.

**FR-AGENDA-08**
Reagendamento.

**FR-AGENDA-09**
Cancelamento.

**FR-AGENDA-10**
Bloqueios.

**FR-AGENDA-11**
Folgas.

**FR-AGENDA-12**
Férias.

**FR-AGENDA-13**
Intervalos.

**FR-AGENDA-14**
Agendamentos recorrentes.

**FR-AGENDA-15**
Múltiplos serviços.

---

# 23. Estados do agendamento

```text
PENDING
CONFIRMED
CHECKED_IN
IN_SERVICE
COMPLETED
CANCELLED
NO_SHOW
```

Toda mudança deverá gerar histórico.

---

# 24. Lista de espera

Cliente poderá solicitar um intervalo:

> sábado entre 14h e 18h.

Caso exista cancelamento compatível:

```text
vaga liberada
↓
identificar lista
↓
notificar cliente
↓
cliente aceita
↓
agendamento
```

---

# 25. No-show

Cada tenant poderá configurar política.

Exemplos:

- sem restrição;
- confirmação obrigatória;
- sinal;
- percentual antecipado;
- pagamento completo.

O sistema calculará futuramente um **No-show Score**.

Exemplo:

```text
Risco de falta: Alto
Agendamentos anteriores: 18
Cancelamentos: 3
Faltas: 4
```

---

# 26. Serviços

Cada serviço terá:

- nome;
- categoria;
- descrição;
- duração;
- preço;
- custo estimado;
- comissão;
- profissionais habilitados;
- disponibilidade;
- status;
- imagem opcional.

Exemplos de categorias:

- cabelo;
- barba;
- combos;
- estética;
- infantil;
- adicionais.

---

# 27. Preço por profissional

O sistema deverá permitir opcionalmente:

```text
Corte
Carlos: R$50
João: R$45
Rafael: R$60
```

---

# 28. CRM

CRM deverá ser uma área central do produto.

Cada cliente terá um **Customer 360**.

## Informações

- nome;
- telefone;
- e-mail;
- aniversário;
- observações;
- profissional preferido;
- data de cadastro;
- origem;
- consentimentos.

## Indicadores

- última visita;
- próxima visita;
- número de visitas;
- frequência média;
- ticket médio;
- receita histórica;
- cancelamentos;
- faltas;
- produtos comprados;
- serviços favoritos.

---

# 29. Status comportamental

O sistema poderá classificar:

```text
NEW
ACTIVE
COOLING
AT_RISK
INACTIVE
LOST
```

Os intervalos deverão ser adaptados à frequência individual.

Exemplo:

Um cliente costuma retornar a cada 23 dias.

Passados 35 dias sem agendamento:

```text
AT_RISK
```

---

# 30. CRM de reativação

Fluxo:

```text
histórico
↓
frequência
↓
identificação de atraso
↓
segmentação
↓
ação sugerida
↓
WhatsApp
↓
novo agendamento
```

Métrica:

**Reactivation Rate.**

---

# 31. Segmentação

Segmentos possíveis:

- novos;
- recorrentes;
- VIP;
- aniversário;
- alto ticket;
- inativos;
- em risco;
- serviço específico;
- profissional específico;
- frequência específica;
- localização futura;
- assinantes.

---

# 32. WhatsApp

WhatsApp será canal operacional de primeira classe.

## Casos de uso

- atendimento;
- agendamento;
- confirmação;
- lembrete;
- reagendamento;
- cancelamento;
- lista de espera;
- campanhas;
- retorno;
- cobrança;
- pesquisa de satisfação.

Deverão existir mecanismos de consentimento, opt-out e rastreabilidade apropriados para comunicações comerciais.

---

# 33. Barber AI

A inteligência artificial será uma camada transversal.

Conceitualmente:

```text
Barber AI
│
├── Reception Intelligence
├── CRM Intelligence
├── Finance Intelligence
├── Inventory Intelligence
├── Growth Intelligence
└── Management Intelligence
```

Esses agentes não precisam representar serviços separados.

Inicialmente poderão utilizar um único orquestrador FastAPI.

---

# 34. IA de recepção

Capacidades:

- identificar cliente;
- identificar intenção;
- consultar serviços;
- consultar profissionais;
- consultar agenda;
- sugerir horários;
- agendar;
- reagendar;
- cancelar;
- responder dúvidas da barbearia.

Exemplo:

> Quero cortar amanhã depois das 18.

A IA consulta disponibilidade e oferece horários reais.

---

# 35. IA de gestão

Exemplos:

> Quanto faturamos hoje?

> Qual barbeiro produziu mais este mês?

> Quem teve maior ticket médio?

> Qual serviço gera maior margem?

> Quantos clientes estamos perdendo?

> Por que meu lucro caiu?

---

# 36. IA financeira

A IA poderá chamar ferramentas como:

```text
finance.get_summary
finance.get_cashflow
finance.compare_periods
finance.get_expenses
finance.get_revenue
finance.get_commissions
finance.get_forecast
```

Exemplo de resposta:

> O faturamento aumentou 6%, mas a margem caiu de 31% para 26%. O principal impacto veio de R$1.430 adicionais em produtos e R$620 em comissões.

---

# 37. Política de ações da IA

A IA terá níveis de risco.

## Nível 0 — leitura

Pode executar automaticamente.

Exemplo:

- consultar faturamento;
- localizar cliente;
- verificar agenda.

## Nível 1 — alteração operacional de baixo risco

Pode executar quando a intenção estiver clara.

Exemplo:

- criar agendamento solicitado pelo cliente.

## Nível 2 — alteração relevante

Deve solicitar confirmação.

Exemplo:

- cancelar múltiplos horários;
- disparar campanha.

## Nível 3 — financeiro/sensível

Sempre exige confirmação explícita e autorização.

Exemplo:

- estorno;
- alteração de repasse;
- alteração salarial;
- baixa financeira extraordinária.

## Nível 4 — proibido para IA autônoma

Exemplos:

- alterar permissões do proprietário;
- remover tenant;
- excluir registros críticos permanentemente.

---

# 38. Function Calling

Exemplos de tools:

```text
customers.search
customers.get
customers.create

appointments.get_availability
appointments.create
appointments.reschedule
appointments.cancel

services.list

professionals.list
professionals.get_schedule

finance.get_summary
finance.compare_periods

crm.find_at_risk
crm.find_inactive

inventory.get_stock

campaigns.create_draft

whatsapp.send_message
```

Toda ferramenta deve receber contexto autorizado do backend.

A IA não poderá enviar `tenant_id` arbitrariamente para acessar outro tenant.

---

# 39. Comandas

Cada atendimento poderá gerar uma comanda.

## Comanda

- cliente;
- profissional;
- serviços;
- produtos;
- descontos;
- acréscimos;
- gorjeta;
- forma de pagamento;
- observações.

Estados:

```text
OPEN
IN_SERVICE
AWAITING_PAYMENT
PAID
CANCELLED
```

---

# 40. Pagamentos

Formas iniciais:

- dinheiro;
- PIX;
- débito;
- crédito;
- outro.

Posteriormente:

- gateway integrado;
- link de pagamento;
- antecipação;
- split.

O sistema deverá permitir pagamento misto.

Exemplo:

```text
PIX R$50
Cartão R$70
```

---

# 41. Financeiro

O financeiro deverá ser simples visualmente, mas robusto no domínio.

## Receitas

- serviços;
- produtos;
- assinaturas;
- pacotes;
- outras.

## Despesas

- aluguel;
- energia;
- água;
- internet;
- folha;
- parceiros;
- produtos;
- fornecedores;
- marketing;
- manutenção;
- software;
- impostos;
- outras.

---

# 42. Contas a pagar

Campos:

- descrição;
- fornecedor;
- categoria;
- valor;
- vencimento;
- recorrência;
- competência;
- status;
- forma de pagamento;
- comprovante.

Estados:

```text
OPEN
DUE
OVERDUE
PAID
CANCELLED
```

---

# 43. Contas recorrentes

Permitir:

```text
Energia
Internet
Aluguel
Software
Contabilidade
```

com criação automática da próxima competência.

---

# 44. Fluxo de caixa

Visões:

- diário;
- semanal;
- mensal;
- realizado;
- previsto.

---

# 45. DRE gerencial simplificada

Exemplo:

```text
Receita bruta              R$48.200

(-) Comissões              R$17.300
(-) Materiais              R$ 4.200
(-) Despesas operacionais  R$13.500

Resultado                  R$13.200
Margem                        27,4%
```

Não será inicialmente uma ferramenta contábil oficial.

Será uma ferramenta de gestão.

---

# 46. Financeiro pessoal do profissional

Quando permitido, profissional possuirá área:

**Minha carteira**

Exibir:

- produção;
- comissão;
- vendas;
- gorjetas;
- bônus;
- adiantamentos;
- pagamentos;
- saldo previsto.

Sem revelar dados financeiros globais do tenant.

---

# 47. Equipe

Cadastro deverá suportar diferentes relações comerciais.

Exemplos:

```text
EMPLOYEE
FIXED
COMMISSION_ONLY
FIXED_PLUS_COMMISSION
PARTNER
CHAIR_RENTAL
CUSTOM
```

O modelo brasileiro de salão-parceiro/profissional-parceiro merece suporte específico: a Lei nº 13.352/2016 inclui barbeiros, prevê percentual de retenção, condições e periodicidade de pagamento e estabelece a centralização dos recebimentos pelo salão-parceiro quando adotado esse regime.

O software deve permitir configuração, mas não substituir orientação jurídica/contábil.

---

# 48. Comissão

Regras possíveis:

### Percentual único

```text
50%
```

### Por serviço

```text
Corte 50%
Barba 60%
```

### Produto

```text
Venda produto 10%
```

### Progressiva

```text
Até R$5k       40%
R$5k–R$8k      45%
Acima R$8k     50%
```

### Valor fixo

```text
R$20 por serviço
```

---

# 49. Fechamento do profissional

Exemplo:

```text
Produção                     R$9.840
Comissões                    R$4.780
Venda de produtos              R$890
Comissão produtos               R$89
Gorjetas                        R$340
Bônus                           R$200
Adiantamentos                  -R$500

A receber                    R$4.909
```

O fechamento deverá possuir histórico e auditoria.

---

# 50. Metas

Meta poderá ser por:

- faturamento;
- atendimentos;
- vendas;
- ticket médio;
- retorno;
- produto;
- avaliação.

Visualização:

```text
Meta R$10.000

████████░░
82%
```

---

# 51. Estoque

Dois grandes tipos:

## Consumo interno

- lâminas;
- luvas;
- papel;
- shampoo;
- toalhas;
- álcool.

## Revenda

- pomada;
- shampoo;
- óleo;
- perfume;
- acessórios.

---

# 52. Movimentações

```text
PURCHASE
SALE
CONSUMPTION
LOSS
ADJUSTMENT
TRANSFER
RETURN
```

Toda movimentação deverá possuir origem auditável.

---

# 53. Estoque mínimo

Cada produto poderá possuir:

```text
estoque atual: 8
estoque mínimo: 10
```

Gerando alerta:

> Estoque baixo.

---

# 54. Ficha técnica do serviço — fase posterior

Exemplo:

```text
Barba

1 lâmina
3 ml óleo
1 toalha
```

Ao concluir:

```text
consumo automático
```

Isso permitirá calcular melhor a margem.

---

# 55. Margem do serviço

Exemplo:

```text
Corte + barba         R$80,00
Comissão             -R$36,00
Material             -R$ 4,70
Taxas                -R$ 2,40

Margem                R$36,90
```

Esse indicador deverá futuramente alimentar a IA financeira.

---

# 56. Fornecedores

Cadastro:

- nome;
- CNPJ/CPF opcional;
- contatos;
- produtos;
- prazo;
- observações;
- compras;
- pagamentos.

Posteriormente:

- comparação de preços;
- pedido de compra;
- recomendação de reposição.

---

# 57. Produtos

Informações:

- SKU;
- nome;
- categoria;
- custo;
- preço;
- margem;
- estoque;
- estoque mínimo;
- fornecedor;
- código de barras futuro.

---

# 58. Assinaturas de clientes

A barbearia poderá criar planos.

Exemplo:

**Sempre na Régua**

R$99/mês

- 2 cortes;
- 1 barba;
- 10% em produtos.

Controle:

- assinante;
- cobrança;
- benefícios;
- utilização;
- renovação;
- inadimplência;
- cancelamento.

---

# 59. Pacotes

Diferentes de assinatura.

Exemplo:

```text
10 cortes
R$400
Validade: 6 meses
```

---

# 60. Fidelidade

Posteriormente:

- pontos;
- cashback interno;
- visitas;
- níveis;
- recompensas;
- indicações.

---

# 61. Campanhas

Canais iniciais:

- WhatsApp.

Futuros:

- e-mail;
- push;
- SMS.

Exemplos:

- aniversário;
- clientes inativos;
- horários vagos;
- promoção;
- novo serviço;
- profissional específico.

---

# 62. IA para preencher horários ociosos

Fluxo estratégico:

```text
vaga detectada
↓
identificar clientes compatíveis
↓
rankear probabilidade de retorno
↓
gerar campanha
↓
aprovação
↓
contato
↓
resposta
↓
agendamento
```

Esta deverá se tornar uma das principais propostas de valor do produto.

---

# 63. Relatórios

## Operacionais

- atendimentos;
- cancelamentos;
- no-show;
- ocupação;
- horários mais procurados.

## Comerciais

- ticket médio;
- clientes novos;
- recorrentes;
- retenção;
- churn;
- reativação.

## Profissionais

- faturamento;
- atendimentos;
- ticket;
- comissão;
- ocupação.

## Financeiros

- receita;
- despesas;
- lucro;
- margem;
- fluxo de caixa.

---

# 64. Insights automáticos

Em vez de somente dashboards:

> Sua ocupação às terças-feiras entre 14h e 17h está em 38%.

> Clientes de barba retornam em média a cada 19 dias.

> O serviço X possui faturamento alto, mas margem inferior à média.

> Você possui R$3.850 em contas vencendo nos próximos sete dias.

---

# 65. Resumo inteligente diário

Exemplo:

**Bom dia.**

```text
27 atendimentos hoje
R$1.940 de receita prevista

3 horários vagos
2 clientes com risco alto de falta
14 clientes no momento esperado de retorno
1 produto abaixo do estoque mínimo
```

Ações:

**Preencher horários**

**Cobrar confirmações**

**Ver clientes para reativar**

---

# 66. Master Admin

Painel da plataforma deverá permitir administrar:

## Tenants

- ativos;
- trial;
- inadimplentes;
- cancelados;
- suspensos.

## Usuários

- quantidade;
- atividade;
- bloqueios.

## Planos

- catálogo;
- limites;
- feature flags.

## Assinaturas SaaS

- status;
- pagamentos;
- upgrades;
- downgrades.

## IA

- tokens;
- chamadas;
- custo por tenant;
- erros;
- ferramentas utilizadas.

## WhatsApp

- mensagens;
- consumo;
- falhas.

## Plataforma

- jobs;
- webhooks;
- status;
- incidentes.

---

# 67. Impersonation de suporte

Master Admin não deverá acessar silenciosamente dados privados.

Caso seja criada função de acesso para suporte:

- motivo obrigatório;
- duração limitada;
- auditoria;
- identificação explícita;
- possibilidade futura de consentimento do tenant.

---

# 68. Planos

Estrutura comercial inicial, ainda como hipótese.

## Solo

Para barbeiro individual.

Inclui:

- agenda;
- clientes;
- serviços;
- financeiro básico;
- relatórios básicos.

## Essencial

Para pequenas barbearias.

Adiciona:

- equipe;
- comissões;
- contas;
- WhatsApp;
- mais usuários.

## Pro

Adiciona:

- CRM avançado;
- estoque;
- fornecedores;
- campanhas;
- relatórios avançados;
- assinaturas.

## AI

Adiciona:

- atendimento IA WhatsApp;
- Barber AI;
- insights;
- automações;
- reativação inteligente.

## Business

Adiciona:

- multiunidade;
- BI consolidado;
- permissões avançadas;
- maior franquia de IA;
- suporte prioritário;
- recursos empresariais.

O benchmark atual possui desde planos próximos de R$49 para solo até aproximadamente R$499 para redes em um concorrente brasileiro específico, enquanto o Booksy anuncia R$99,99 no Brasil mais valor por agenda adicional. Esses valores devem servir apenas como referência de mercado; nosso preço deverá ser validado com disposição real de pagamento.

---

# 69. Feature Entitlements

Não codificar regras de plano diretamente nas telas.

Utilizar conceito:

```text
feature
entitlement
limit
usage
```

Exemplo:

```text
AI_MESSAGES = 500
PROFESSIONALS = 5
BRANCHES = 1
CAMPAIGNS = true
```

Isso permitirá modificar planos sem alterar toda a aplicação.

---

# 70. Billing SaaS

Precisará suportar:

```text
TRIAL
ACTIVE
PAST_DUE
CANCELLED
SUSPENDED
```

E:

- upgrade;
- downgrade;
- cancelamento;
- renovação;
- cupom;
- trial;
- limites.

Gateway será definido na arquitetura.

---

# 71. Entidades de domínio

Principais entidades previstas:

```text
Tenant
Branch

User
Role
Permission
Membership

Professional
EmploymentConfig
CommissionRule

Customer
CustomerTag
CustomerMetric

Service
ServiceCategory

Appointment
AppointmentService
Waitlist

Order
OrderItem
Payment

Revenue
Expense
FinancialCategory
AccountPayable
AccountReceivable

Commission
Payout

Product
Inventory
StockMovement
Supplier
Purchase

SubscriptionPlan
CustomerSubscription
Package

Campaign
Segment
Message

AIConversation
AIToolExecution
AIUsage

AuditLog
Notification

SaaSPlan
Entitlement
TenantSubscription
```

Isso representa domínio de produto, não ainda o schema definitivo do banco.

---

# 72. Auditoria

Devem gerar audit log ações como:

- alteração financeira;
- pagamento;
- comissão;
- cancelamento;
- exclusão;
- mudança de permissão;
- ação executada por IA;
- acesso administrativo.

Campos mínimos:

```text
actor
action
entity
entity_id
tenant
timestamp
before
after
source
```

---

# 73. Requisitos de segurança

## SEC-01

Isolamento completo de tenants.

## SEC-02

Controle de acesso no backend.

## SEC-03

RLS no banco quando aplicável.

## SEC-04

Nenhuma autorização deve depender exclusivamente do frontend.

## SEC-05

Logs de ações sensíveis.

## SEC-06

Segredos fora do código.

## SEC-07

Proteção contra brute force.

## SEC-08

Rate limiting em endpoints sensíveis.

## SEC-09

Sessões revogáveis.

## SEC-10

Possibilidade futura de MFA.

---

# 74. LGPD

O produto processará dados pessoais de:

- clientes;
- funcionários;
- profissionais;
- proprietários.

O desenho deverá suportar:

- transparência;
- finalidade;
- minimização;
- consentimento quando aplicável;
- exclusão/anonimização quando cabível;
- exportação;
- registro de consentimentos;
- opt-out de marketing.

Em cenários SaaS desse tipo, a relação exata entre controlador e operador dependerá do fluxo e da finalidade específica do tratamento, portanto termos, DPA e política de privacidade deverão passar por revisão jurídica antes do lançamento.

---

# 75. Requisitos de performance

Objetivos iniciais:

- carregamento das telas críticas rápido em conexão móvel;
- criação de agendamento percebida como instantânea;
- busca de clientes com resposta rápida;
- agenda preparada para centenas de eventos;
- operações IA assíncronas quando apropriado.

Valores técnicos específicos serão definidos na arquitetura.

---

# 76. Disponibilidade

O produto deverá degradar de forma segura.

Exemplo:

Se IA estiver indisponível:

**agenda continua funcionando.**

Se WhatsApp estiver indisponível:

**sistema continua funcionando.**

IA é camada complementar, não dependência obrigatória da operação principal.

---

# 77. Observabilidade

Precisaremos acompanhar:

- erros;
- latência;
- requests;
- jobs;
- webhooks;
- integrações;
- IA;
- banco;
- custos.

Além de logs técnicos, deverão existir métricas de negócio.

---

# 78. Eventos de analytics

Exemplos:

```text
tenant_created
onboarding_completed

professional_created
service_created

customer_created

appointment_created
appointment_completed
appointment_cancelled
appointment_no_show

order_paid

campaign_created
campaign_sent

ai_conversation_started
ai_tool_called
ai_action_confirmed

subscription_started
subscription_upgraded
subscription_cancelled
```

---

# 79. Métricas de produto

## Activation

- criou tenant;
- cadastrou serviço;
- cadastrou profissional;
- criou primeiro cliente;
- realizou primeiro agendamento.

## Engagement

- atendimentos/semana;
- usuários ativos;
- uso financeiro;
- uso de CRM;
- uso da IA.

## Retention

- tenants ativos mês a mês;
- frequência de uso.

## Revenue

- MRR;
- ARPA;
- expansão;
- churn;
- LTV.

---

# 80. Métricas da IA

- conversas;
- custo por tenant;
- custo por usuário;
- tool calls;
- sucesso;
- erro;
- aprovação;
- conversão em agendamento.

Uma métrica especialmente importante:

**AI Booking Conversion Rate**

```text
agendamentos realizados via IA
/
conversas com intenção de agendamento
```

---

# 81. Métricas do cliente da barbearia

O sistema deverá ajudar a medir:

```text
Occupancy Rate
No-show Rate
Retention Rate
Reactivation Rate
Average Ticket
Visit Frequency
Customer Lifetime Value
Revenue per Professional
Revenue per Chair
```

---

# 82. MVP

O MVP deve provar três loops.

## Loop 1 — Atender

```text
cliente
→ agenda
→ atendimento
→ pagamento
```

## Loop 2 — Administrar

```text
receita
→ comissão
→ despesas
→ resultado
```

## Loop 3 — Retornar

```text
cliente
→ histórico
→ CRM
→ contato
→ novo agendamento
```

---

# 83. Escopo P0 — obrigatório para MVP

### Plataforma

- autenticação;
- tenants;
- unidade;
- memberships;
- roles;
- permissions.

### Operação

- profissionais;
- horários;
- serviços;
- clientes;
- agenda;
- agendamentos;
- check-in;
- conclusão.

### Comercial

- CRM básico;
- histórico do cliente.

### Financeiro

- comanda;
- pagamentos;
- receitas;
- despesas;
- categorias;
- comissão;
- fechamento.

### Dashboard

- resumo operacional;
- resumo financeiro.

### IA

- chat interno;
- consulta de agenda;
- consulta de cliente;
- consulta financeira;
- criação de agendamento com Function Calling.

### SaaS

- Master Admin;
- planos;
- assinatura do tenant;
- feature entitlements básicos.

---

# 84. Escopo P1 — após validação inicial

- WhatsApp integrado;
- IA atendente;
- CRM comportamental;
- cliente em risco;
- campanhas;
- lista de espera;
- depósitos;
- contas recorrentes;
- estoque;
- produtos;
- fornecedores;
- metas;
- insights automáticos.

---

# 85. Escopo P2

- assinaturas;
- fidelidade;
- pacotes;
- ficha técnica;
- margem real;
- folha/repasses avançados;
- multiunidade;
- BI consolidado;
- app móvel;
- marketplace;
- NFS-e;
- integrações contábeis.

---

# 86. Fora do MVP

Não tentar construir inicialmente:

- ERP contábil completo;
- folha CLT completa;
- apuração fiscal;
- marketplace nacional;
- app nativo iOS/Android;
- franquias avançadas;
- dezenas de integrações;
- emissão fiscal nacional universal;
- IA completamente autônoma.

---

# 87. Critérios de sucesso do MVP

Consideraremos o MVP validado quando conseguirmos demonstrar que barbearias reais conseguem operar diariamente utilizando o sistema.

Sinais:

### Produto

- onboarding completo;
- agenda usada diariamente;
- pagamentos registrados;
- comissão calculada automaticamente;
- clientes mantidos no CRM.

### Comportamento

- usuário volta espontaneamente;
- não depende de planilha paralela para processos cobertos.

### Valor

Proprietário consegue responder:

> Quanto vendi?

> Quanto gastei?

> Quanto devo aos profissionais?

> Quanto lucrei aproximadamente?

> Quem são meus clientes em risco?

---

# 88. Critérios de aceitação P0

## Tenant

- usuário Owner só acessa seu tenant;
- profissional nunca acessa outro tenant;
- Master possui fluxo distinto.

## Agenda

- impedir conflito do mesmo profissional;
- considerar horário de trabalho;
- considerar bloqueios;
- registrar histórico.

## Comissão

- comissão deve ser reproduzível;
- alteração posterior de regra não pode mudar silenciosamente fechamentos históricos.

## Financeiro

- valores pagos devem ser auditáveis;
- cancelamentos não podem desaparecer do histórico.

## IA

- não pode inventar disponibilidade;
- deve consultar ferramentas;
- deve respeitar permissions;
- tool calls devem ser auditáveis.

---

# 89. Hipóteses que precisam ser validadas

### H1

Dono considera financeiro integrado mais valioso que somente agenda.

### H2

Cálculo automático de comissão reduz uma dor significativa.

### H3

WhatsApp é o principal canal de agendamento.

### H4

Usuários aceitariam IA realizando agendamentos automaticamente.

### H5

Reativação de clientes gera ROI percebido.

### H6

Barbeiros desejam acompanhar ganhos individualmente.

### H7

Donos pagariam mais por uma camada AI operacional.

### H8

Estoque é suficientemente doloroso para justificar módulo avançado.

---

# 90. Pesquisa com usuários

Realizar entrevistas com pelo menos:

- 3 barbeiros autônomos;
- 5 donos de barbearias pequenas;
- 2 gestores de operações maiores.

Ideal:

15–20 entrevistas.

---

# 91. Perguntas essenciais

1. Como os clientes agendam hoje?
2. Quantas mensagens você responde diariamente?
3. O que mais toma seu tempo administrativo?
4. Como calcula comissão?
5. Como controla despesas?
6. Como sabe seu lucro?
7. Como sabe quanto cada profissional produziu?
8. Como controla faltas?
9. Como identifica cliente que não voltou?
10. Como faz campanhas?
11. Como controla estoque?
12. O que você usa hoje?
13. O que gosta nesse sistema?
14. O que odeia?
15. Quanto paga?
16. O que faria trocar de sistema?
17. Que informação gostaria de saber todo dia?
18. Qual tarefa você pagaria para alguém fazer por você?

---

# 92. Teste de conceito

Após entrevistas:

criar protótipo navegável contendo:

1. Dashboard
2. Agenda
3. Novo agendamento
4. CRM
5. Cliente
6. Financeiro
7. Comissão
8. Barber AI

E observar o usuário sem explicar o funcionamento.

---

# 93. Posicionamento

Evitar posicionar como:

> “Mais um aplicativo para agendar cortes.”

Posicionar como:

> **A plataforma que administra sua barbearia com você.**

Ou conceitualmente:

> **Seu negócio. Seus clientes. Sua equipe. Seu dinheiro. Uma inteligência.**

---

# 94. Diferenciais estratégicos

## 1. Financial OS

Entender o dinheiro da barbearia, não apenas faturamento.

## 2. Professional Wallet

Cada profissional entende sua própria produção e remuneração.

## 3. Customer Intelligence

CRM entende comportamento e frequência.

## 4. Barber AI

Interface inteligente sobre toda a operação.

## 5. Actionable Intelligence

Sistema não mostra somente:

> Você possui 3 horários livres.

Ele pergunta:

> Quer que eu procure clientes com maior chance de ocupar esses horários?

---

# 95. Flywheel do produto

```text
mais agendamentos
        ↓
mais dados
        ↓
melhor entendimento
        ↓
melhor segmentação
        ↓
melhores ações da IA
        ↓
mais retorno de clientes
        ↓
mais receita
        ↓
mais agendamentos
```

Com o tempo, o valor do produto aumenta junto com o histórico do tenant.

---

# 96. Riscos

## Produto excessivamente grande

Mitigação:

P0 rígido.

## Interface complexa

Mitigação:

progressive disclosure.

## IA cara

Mitigação:

feature entitlements, caching, modelos adequados por tarefa e limite de utilização.

## IA executar ação errada

Mitigação:

Function Calling + validação + níveis de aprovação.

## Vazamento entre tenants

Mitigação:

isolamento na arquitetura, RLS, testes específicos e autorização server-side.

## WhatsApp se tornar dependência crítica

Mitigação:

operação principal independente.

## Financeiro virar contabilidade

Mitigação:

posicionar como financeiro gerencial.

---

# 97. Critério para novas funcionalidades

Uma funcionalidade só deverá entrar caso aumente pelo menos uma destas dimensões:

### SAVE TIME

economiza trabalho.

### MAKE MONEY

gera receita.

### SAVE MONEY

reduz custo.

### RETAIN CUSTOMER

retém clientes.

### REDUCE RISK

reduz erros ou risco operacional.

Caso não faça nenhuma delas claramente, deverá possuir prioridade baixa.

---

# 98. Roadmap conceitual

## Fase 0 — Discovery

Pesquisa.

JTBD.

Protótipo.

Validação.

## Fase 1 — Foundation

Auth.

Tenant.

RBAC.

Design system.

Infraestrutura.

## Fase 2 — Operations

Clientes.

Serviços.

Profissionais.

Agenda.

## Fase 3 — Money

Comandas.

Pagamentos.

Financeiro.

Comissões.

## Fase 4 — Intelligence

FastAPI.

Barber AI.

Function Calling.

Insights.

## Fase 5 — Communication

WhatsApp.

Atendimento IA.

CRM Automation.

## Fase 6 — Growth

Campanhas.

Retenção.

Reativação.

Assinaturas.

## Fase 7 — Scale

Estoque avançado.

Multiunidade.

BI.

Enterprise.

---

# 99. Definição do produto

O produto não será:

**um calendário para barbearias.**

Também não será simplesmente:

**um ERP de beleza.**

A visão de longo prazo será:

> **Uma plataforma de gestão inteligente que conecta toda a operação da barbearia e utiliza IA para transformar os dados do negócio em decisões e ações.**

---

# 100. Resultado esperado

Quando o produto estiver maduro, um proprietário deverá conseguir abrir o sistema pela manhã e receber:

> Bom dia. Hoje existem 31 atendimentos agendados, com receita prevista de R$2.420.

> Existem três horários ociosos entre 15h e 18h.

> Identifiquei 17 clientes que normalmente retornariam nesta semana e ainda não possuem agendamento.

> Duas contas totalizando R$1.480 vencem amanhã.

> O estoque de lâminas atingiu o mínimo.

> Sua margem acumulada no mês está 2,8 pontos percentuais abaixo do mês passado.

E então perguntar:

> **O que você quer que eu faça?**

Esse será o conceito central do produto.

---

# 101. Estado deste PRD

Este documento representa a:

**Product Definition v1.0 / Pre-validation.**

Ainda não representa decisões arquiteturais definitivas.

A sequência oficial do projeto será:

```text
PRD
↓
Domain Model
↓
Arquitetura
↓
Threat Model / Segurança
↓
Data Model
↓
API Contracts
↓
AI Architecture
↓
Design System
↓
Information Architecture
↓
Wireframes
↓
MVP Backlog
↓
Implementação
```

---

# 102. Próximos documentos

## Documento 2 — Arquitetura Técnica

Deverá definir:

- monólito modular vs serviços;
- frontend Next.js;
- FastAPI AI;
- Supabase;
- PostgreSQL;
- RLS;
- autenticação;
- tenants;
- RBAC;
- API;
- jobs;
- filas;
- eventos;
- WhatsApp;
- pagamentos;
- observabilidade;
- deploy Vercel/Railway;
- cache;
- storage;
- backups;
- segurança;
- Function Calling;
- AI Gateway;
- custos.

## Documento 3 — Arquitetura de Dados

ERD completo.

Entidades.

Relacionamentos.

Índices.

Constraints.

Tenant isolation.

Histórico financeiro.

Ledger.

Auditoria.

## Documento 4 — Design e UX

Definirá:

- identidade visual;
- design system;
- cores;
- tipografia;
- componentes;
- sidebar;
- mobile navigation;
- dashboard;
- agenda;
- CRM;
- financeiro;
- IA;
- estados vazios;
- onboarding;
- responsividade;
- acessibilidade.

Esses documentos deverão derivar deste PRD e não redefinir arbitrariamente as regras de negócio.

# Adendo ao PRD — Caixa, PDV e Comandas

## A.1 Objetivo

O sistema deverá possuir uma estrutura completa de **caixa / PDV / comandas**, permitindo registrar tudo o que o cliente consumir ou contratar durante sua permanência na barbearia.

A comanda poderá incluir:

- serviços;
- bebidas;
- produtos para cabelo;
- produtos para barba;
- doces;
- alimentos;
- acessórios;
- produtos diversos;
- qualquer outro item comercializado pela barbearia.

O catálogo não deverá ficar limitado ao segmento de beleza.

A barbearia deverá poder cadastrar qualquer item vendável.

---

## A.2 Conceito de produto vendável

Todo item comercializado deverá pertencer a uma estrutura genérica de catálogo.

Exemplos de tipos:

```text
SERVICE
RETAIL_PRODUCT
FOOD
BEVERAGE
OTHER
```

As categorias serão configuráveis pelo tenant.

Exemplo:

```text
Bebidas
├── Água
├── Refrigerante
├── Cerveja
└── Energético

Barba
├── Óleo
├── Balm
└── Shampoo

Cabelo
├── Pomada
├── Shampoo
└── Condicionador

Alimentos
├── Chocolate
├── Salgados
└── Doces
```

O proprietário poderá criar livremente novas categorias.

---

## A.3 Comanda automática a partir do agendamento

Quando um cliente possuir um agendamento, o sistema deverá conseguir abrir sua comanda automaticamente.

Fluxo:

```text
Agendamento
↓
Cliente chega
↓
Check-in
↓
Comanda aberta automaticamente
↓
Serviço agendado inserido na comanda
↓
Consumos adicionais
↓
Fechamento
↓
Pagamento
```

A comanda deverá estar vinculada ao:

- tenant;
- unidade;
- cliente;
- agendamento;
- profissional principal;
- data;
- horário.

---

## A.4 Momento da abertura automática

Por padrão, a comanda deverá ser criada no momento do:

**CHECKED_IN**

e não necessariamente na criação do agendamento.

Isso evita milhares de comandas abertas para clientes que cancelaram ou não compareceram.

O tenant poderá futuramente configurar:

```text
Abrir comanda:
○ Na criação do agendamento
● No check-in
○ Quando iniciar atendimento
```

Recomendação padrão:

**No check-in.**

---

## A.5 Sincronização com o agendamento

Quando a comanda for criada automaticamente:

1. recuperar agendamento;
2. recuperar cliente;
3. recuperar serviços agendados;
4. recuperar preço aplicável;
5. recuperar profissional;
6. criar comanda;
7. inserir os serviços;
8. vincular `appointment_id`.

Exemplo:

```text
14:00 — João
Corte + Barba

CHECK-IN

COMANDA #1042

Corte                R$50
Barba                R$35

Subtotal             R$85
```

Durante o atendimento:

```text
+ Refrigerante       R$ 8
+ Pomada             R$32
```

Total:

```text
R$125
```

---

## A.6 Atualização entre agenda e comanda

Agenda e comanda deverão permanecer sincronizadas onde fizer sentido.

Exemplo:

Agendamento:

```text
Corte
Barba
```

Comanda:

```text
Corte
Barba
```

Caso o cliente adicione:

```text
Sobrancelha
```

durante o atendimento, esse serviço poderá ser registrado como item adicional da comanda.

O histórico deverá indicar:

```text
Origem:
AGENDAMENTO
ADICIONADO_DURANTE_ATENDIMENTO
```

---

## A.7 Comanda manual

O sistema deverá permitir criar uma comanda sem qualquer agendamento.

Casos:

- cliente entrou sem marcar;
- cliente comprou apenas um produto;
- cliente tomou uma bebida;
- venda rápida;
- visitante;
- consumo interno posteriormente cobrado.

Fluxo:

```text
Nova comanda
↓
Selecionar cliente
ou
Cliente avulso
↓
Adicionar itens
↓
Pagamento
```

---

## A.8 Cliente avulso

Não deverá ser obrigatório criar um CRM completo para toda venda.

Exemplo:

```text
COMANDA #1051

Cliente:
Consumidor avulso
```

Posteriormente poderá haver opção:

**Cadastrar como cliente**

Isso é particularmente importante para vendas rápidas.

---

## A.9 Tela de caixa / PDV

O sistema deverá possuir uma interface própria para operação rápida.

Sugestão:

```text
┌───────────────────────────────────────────┐
│ BUSCAR ITEM                               │
├─────────────────────┬─────────────────────┤
│ Produtos/Serviços   │ Comanda             │
│                     │                     │
│ Corte       R$50    │ Corte       R$50    │
│ Barba       R$35    │ Coca-Cola    R$8    │
│ Pomada      R$32    │                     │
│ Coca-Cola    R$8    │                     │
│ Água         R$5    │                     │
│                     │                     │
│                     │ TOTAL       R$58    │
│                     │                     │
│                     │ [ RECEBER ]         │
└─────────────────────┴─────────────────────┘
```

A prioridade será velocidade.

---

## A.10 Busca rápida

O operador deverá localizar itens por:

- nome;
- SKU;
- categoria;
- código de barras futuramente;
- favoritos;
- mais vendidos.

---

## A.11 Favoritos do PDV

O tenant poderá marcar produtos usados frequentemente.

Exemplo:

```text
Favoritos

Água
Coca-Cola
Cerveja
Pomada
Corte
Barba
```

Isso permite adicionar itens com um toque/clique.

---

## A.12 Itens da comanda

Cada item deverá registrar:

```text
product_id/service_id
description_snapshot
quantity
unit_price
discount
subtotal
professional_id opcional
source
created_at
```

É fundamental armazenar um **snapshot** do nome e preço.

Exemplo:

Uma pomada custa hoje:

```text
R$32
```

Daqui três meses:

```text
R$39
```

Uma venda histórica não pode ser recalculada com o novo preço.

---

## A.13 Quantidade

Produtos deverão permitir quantidade.

```text
Cerveja
3 x R$10
R$30
```

Serviços normalmente serão quantidade 1, mas o domínio não deverá impedir outros cenários.

---

## A.14 Estoque sincronizado

Ao adicionar um produto de estoque à venda, o sistema deverá realizar a baixa conforme a política definida.

Preferencialmente:

```text
Comanda aberta
↓
Produto reservado opcionalmente

Pagamento confirmado
↓
StockMovement = SALE
```

Assim, um cancelamento de comanda não gera perda incorreta de estoque.

---

## A.15 Produtos sem controle de estoque

Alguns itens poderão ser vendidos sem controle de quantidade.

Exemplo:

```text
Cafezinho especial
Taxa
Serviço adicional
```

Configuração:

```text
track_inventory = false
```

---

## A.16 Produto composto futuramente

Exemplo:

```text
Combo cerveja + petisco
```

ou:

```text
Kit barba
```

Poderá possuir componentes, mas não é obrigatório para P0.

---

## A.17 Comissão por venda

Produtos poderão gerar comissão.

Exemplo:

```text
Pomada          R$40
Comissão:       10%

Barbeiro:       R$4
Barbearia:      R$36
```

A regra poderá depender de:

- produto;
- categoria;
- profissional;
- tenant.

---

## A.18 Serviço e produto na mesma comanda

Exemplo real:

```text
João — Comanda #1082

Corte                      R$50
Barba                      R$35
Cerveja                    R$12
Cerveja                    R$12
Pomada                     R$35

Subtotal                  R$144

Desconto                    R$4

TOTAL                     R$140
```

---

## A.19 Divisão da receita

O sistema deverá distinguir corretamente:

```text
Receita de serviços
Receita de produtos
Receita de alimentos
Receita de bebidas
Outras receitas
```

Isso permitirá relatórios como:

```text
Faturamento agosto

Serviços       R$42.800
Produtos       R$ 6.200
Bebidas        R$ 2.350
Alimentos      R$   780

Total          R$52.130
```

---

## A.20 Margem por categoria

Quando houver custo cadastrado:

```text
Cerveja

Custo:        R$5
Venda:       R$10
Margem bruta: R$5
```

O proprietário poderá posteriormente analisar:

> Qual categoria mais gera lucro?

---

## A.21 Status da comanda

Estados recomendados:

```text
OPEN
IN_SERVICE
AWAITING_PAYMENT
PARTIALLY_PAID
PAID
CANCELLED
REFUNDED
```

---

## A.22 Múltiplos profissionais na mesma comanda

Uma comanda deverá permitir mais de um profissional.

Exemplo:

```text
Corte
Profissional: Carlos

Barba
Profissional: João
```

Isso será necessário para calcular corretamente:

- produção;
- comissão;
- metas.

---

## A.23 Pagamento dividido

Exemplo:

```text
Total: R$140

PIX           R$70
Crédito       R$50
Dinheiro      R$20
```

Todos os pagamentos serão vinculados à mesma comanda.

---

## A.24 Pagamento parcial

O sistema deverá suportar:

```text
Total:         R$200
Pago:          R$100
Saldo:         R$100
```

Especialmente útil futuramente para:

- sinal;
- reservas;
- crédito interno;
- contas corporativas.

---

## A.25 Descontos

Poderão existir:

```text
Desconto por item
Desconto na comanda
Cupom
Desconto percentual
Desconto em valor
```

A permissão para conceder desconto poderá ser controlada.

Exemplo:

```text
sales.discount
```

---

## A.26 Cancelamento de item

Remoções após determinado estágio deverão ficar registradas.

Nunca simplesmente apagar.

Exemplo:

```text
Cerveja removida
Por: Recepcionista Ana
Motivo: cliente desistiu
16:42
```

Isso reduz fraude e erros de caixa.

---

## A.27 Caixa

Além da comanda, haverá o conceito de **sessão de caixa**.

Fluxo:

```text
Abrir caixa
↓
Saldo inicial
↓
Vendas
↓
Entradas/saídas
↓
Sangrias
↓
Reforços
↓
Fechamento
```

---

## A.28 Sessão de caixa

Entidade conceitual:

```text
CashRegisterSession
```

Campos:

```text
branch_id
opened_by
opened_at
opening_balance
closed_by
closed_at
expected_balance
actual_balance
difference
status
```

---

## A.29 Movimentações de caixa

Tipos:

```text
SALE
REFUND
WITHDRAWAL
CASH_IN
EXPENSE
ADJUSTMENT
```

Exemplo:

```text
Sangria R$500
Motivo: depósito bancário
```

---

## A.30 Fechamento

Exemplo:

```text
CAIXA — 05/09/2026

Dinheiro esperado     R$1.240
Dinheiro informado    R$1.230

Diferença              -R$10

PIX                    R$3.140
Débito                 R$1.920
Crédito                R$2.680

TOTAL                  R$8.970
```

---

## A.31 Permissões do caixa

Exemplos:

```text
pos.open_order
pos.add_item
pos.remove_item

pos.discount

payment.receive
payment.refund

cash_register.open
cash_register.withdraw
cash_register.close
```

---

## A.32 Auditoria

Eventos importantes:

```text
order.created
order.item_added
order.item_removed
order.discount_applied

payment.created
payment.cancelled
payment.refunded

cash_register.opened
cash_register.withdrawal
cash_register.closed
```

---

## A.33 Entidades adicionais do domínio

Adicionar ao Domain Model:

```text
Order
OrderItem
OrderItemAllocation

Payment
PaymentAllocation

CashRegister
CashRegisterSession
CashMovement

CatalogItem
ProductCategory

Product
Inventory
StockMovement
```

Recomendação importante:

`CatalogItem` poderá futuramente servir como abstração comum para tudo que aparece no PDV:

```text
CatalogItem
├── Service
├── Product
├── Food
├── Beverage
└── Other
```

A decisão final dessa modelagem ficará para a arquitetura.

---

## A.34 Relação principal

O modelo deverá suportar:

```text
Appointment
      │
      │ 0..1
      ▼
Order
      │
      ├── OrderItem → Service
      ├── OrderItem → Product
      ├── OrderItem → Beverage
      └── OrderItem → Other
             │
             ▼
          Payment
```

Mas também:

```text
Manual Order
     │
     └── sem Appointment
```

---

## A.35 Experiência ideal

No atendimento agendado:

```text
14:00 João — Carlos
[ CHECK-IN ]
```

Ao clicar:

```text
✓ Cliente chegou
✓ Comanda #1048 aberta
✓ Corte adicionado
```

A partir daí a equipe apenas adiciona consumos.

No final:

```text
[ FECHAR COMANDA ]
```

---

## A.36 Venda sem agendamento

No PDV:

```text
[ + NOVA COMANDA ]
```

Escolher:

```text
Cliente cadastrado
Consumidor avulso
```

Adicionar:

```text
2 cervejas
1 pomada
```

Receber.

Finalizar.

Todo o processo deve levar poucos segundos.

---

## A.37 Impacto no produto

Com esse adendo, o fluxo principal passa a ser:

```text
CLIENTE
↓
AGENDAMENTO
↓
CHECK-IN
↓
COMANDA / PDV
↓
SERVIÇOS + CONSUMO
↓
PAGAMENTO
↓
COMISSÕES
↓
ESTOQUE
↓
FINANCEIRO
↓
CRM
```

Isso reforça o posicionamento da plataforma como sistema operacional completo da barbearia, porque uma única transação passa a alimentar automaticamente:

- agenda;
- CRM;
- produção do profissional;
- comissão;
- estoque;
- faturamento;
- caixa;
- financeiro;
- indicadores.

```

```

# Adendo ao PRD — PWA, Mobile First e Responsividade

## 1. Diretriz principal

O sistema será desenvolvido como uma **Progressive Web App (PWA), mobile first e altamente responsiva**.

A experiência deverá funcionar adequadamente em:

- smartphones Android;
- iPhones;
- tablets Android;
- iPads;
- notebooks;
- desktops;
- monitores ultrawide;
- telas pequenas;
- telas de alta resolução.

A interface não deverá depender de uma resolução específica.

---

# 2. Mobile First

O design começará pela menor experiência utilizável e crescerá progressivamente.

Não faremos:

```text
Desktop
↓
"espremer" para mobile
```

Faremos:

```text
Mobile
↓
Tablet
↓
Desktop
↓
Wide desktop
```

Isso é particularmente importante porque barbeiros e recepcionistas provavelmente utilizarão o sistema frequentemente pelo celular.

---

# 3. PWA

O sistema deverá ser instalável como aplicativo.

O usuário poderá utilizar:

```text
Adicionar à tela inicial
```

No Android e navegadores compatíveis.

A experiência instalada deverá possuir:

- ícone próprio;
- splash screen;
- nome do aplicativo;
- modo standalone;
- theme color;
- manifest;
- service worker.

Objetivo:

O usuário perceber o produto quase como um aplicativo nativo.

---

# 4. Estratégia responsiva

Não utilizaremos layouts baseados somente em breakpoints tradicionais.

A interface deverá combinar:

- CSS Grid;
- Flexbox;
- container queries;
- fluid sizing;
- min/max/clamp;
- conteúdo adaptativo.

A responsividade será baseada principalmente no **espaço disponível para cada componente**.

---

# 5. Breakpoints de referência

Podemos trabalhar inicialmente com faixas conceituais:

```text
XS
320–479px

SM
480–767px

MD
768–1023px

LG
1024–1439px

XL
1440–1919px

2XL
1920px+
```

Mas componentes não deverão depender exclusivamente desses valores.

---

# 6. Tamanho mínimo suportado

O produto deverá funcionar adequadamente a partir de aproximadamente:

```text
320px de largura
```

Isso cobre smartphones pequenos.

Nenhuma funcionalidade principal poderá exigir scroll horizontal da página.

Exceções específicas poderão existir para componentes naturalmente bidimensionais, como agenda, mas deverão possuir UX apropriada.

---

# 7. Navegação mobile

No smartphone, evitar sidebar permanente.

Sugestão:

```text
┌─────────────────────┐
│ Dashboard           │
│                     │
│ conteúdo            │
│                     │
│                     │
├─────────────────────┤
│ ⌂   📅   +   👥   ☰ │
└─────────────────────┘
```

Bottom Navigation para funções frequentes.

Exemplo:

- Início
- Agenda
- Nova ação
- Clientes
- Mais

---

# 8. Navegação desktop

Desktop:

```text
┌──────────┬─────────────────────────────┐
│          │                             │
│ Sidebar  │        Conteúdo             │
│          │                             │
│          │                             │
│          │                             │
└──────────┴─────────────────────────────┘
```

Sidebar poderá ser:

```text
expandida
```

ou:

```text
compacta
```

de acordo com espaço e preferência.

---

# 9. Tablet

Tablet não deverá ser tratado automaticamente como desktop pequeno.

Em muitos casos será usado no balcão da barbearia.

O PDV, principalmente, deverá possuir experiência específica para tablet.

Exemplo:

```text
┌──────────────────┬───────────────┐
│                  │ COMANDA       │
│ Produtos         │               │
│                  │ Corte R$50    │
│ Serviços         │ Água   R$5    │
│                  │               │
│                  │ TOTAL R$55    │
└──────────────────┴───────────────┘
```

Ideal para uso touch.

---

# 10. Touch First

Mesmo no desktop, componentes deverão considerar interfaces touch.

Tamanho mínimo recomendado para áreas clicáveis:

```text
44 × 44 px
```

Evitar:

- links pequenos;
- botões próximos demais;
- ações dependentes de hover;
- menus que só aparecem com mouse.

---

# 11. Agenda responsiva

A agenda precisará de UX diferente por tamanho.

## Mobile

Preferência:

```text
Agenda do dia
```

Exemplo:

```text
Hoje — 5 setembro

09:00
Carlos
João Silva
Corte

10:00
Pedro
Barba
```

Ou timeline vertical.

---

## Tablet

Possibilidade:

```text
2–3 profissionais lado a lado
```

---

## Desktop

Visualização completa:

```text
horários × profissionais
```

com drag-and-drop quando apropriado.

---

# 12. PDV mobile

No celular, não tentaremos replicar duas colunas grandes.

Fluxo:

```text
Produtos
↓
Adicionar
↓
Comanda
↓
Pagamento
```

Com um botão persistente:

```text
Comanda • 4 itens • R$128
```

Ao tocar:

abre drawer ou página da comanda.

---

# 13. PDV tablet/desktop

Em telas maiores:

```text
CATÁLOGO | COMANDA
```

lado a lado.

Assim ganhamos velocidade operacional.

---

# 14. Dashboard responsivo

Desktop:

```text
4 KPIs por linha
```

Tablet:

```text
2 KPIs por linha
```

Mobile:

```text
1 ou 2 KPIs
```

dependendo do conteúdo.

Evitar excesso de gráficos no celular.

No mobile, priorizar:

```text
Hoje
Agenda
Receita
Alertas
Ações
```

---

# 15. Tabelas

Não dependeremos de tabelas largas no mobile.

Desktop:

```text
Nome | Telefone | Última visita | Ticket | Status
```

Mobile:

```text
┌─────────────────────┐
│ João Silva          │
│ Ativo               │
│ Última visita 20/08 │
│ Ticket médio R$68   │
└─────────────────────┘
```

Cards/list rows responsivos.

---

# 16. Forms

No desktop:

```text
Nome            Telefone
E-mail          Nascimento
```

No mobile:

```text
Nome
Telefone
E-mail
Nascimento
```

Uma coluna.

---

# 17. Drawers e modais

Desktop:

Modais poderão ser usados para tarefas rápidas.

Mobile:

Preferência por:

- bottom sheets;
- full-screen dialogs;
- páginas dedicadas.

Evitar modal pequeno comprimido.

---

# 18. Barber AI responsivo

Desktop:

Pode funcionar em um painel lateral:

```text
┌──────────────┬──────────────┐
│ Sistema      │ Barber AI    │
│              │              │
└──────────────┴──────────────┘
```

Mobile:

```text
botão flutuante
```

ou área própria.

Ao abrir:

```text
full screen
```

Isso permite uma experiência melhor de conversa.

---

# 19. Navegação contextual

No mobile, a quantidade de opções visíveis deverá ser limitada.

Exemplo:

Bottom navigation:

```text
Início
Agenda
+
Clientes
Mais
```

Em:

```text
Mais
```

podemos colocar:

- Financeiro;
- Estoque;
- Equipe;
- Relatórios;
- Configurações.

---

# 20. Atalho central

O botão central poderá ser extremamente útil.

```text
+
```

Abrindo:

```text
Novo agendamento
Nova comanda
Novo cliente
Nova despesa
Nova venda
```

Isso reduz navegação.

---

# 21. Role-aware navigation

A interface será diferente conforme permissões.

### Barbeiro

Principal:

```text
Minha Agenda
Clientes
Ganhos
Barber AI
```

### Recepção

```text
Agenda
Comandas
Clientes
Caixa
```

### Dono

```text
Dashboard
Agenda
CRM
Financeiro
Equipe
Estoque
IA
```

Isso reduz complexidade.

---

# 22. Safe Areas

Precisamos considerar dispositivos com:

- notch;
- Dynamic Island;
- barras inferiores;
- navegação Android.

Utilizar:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

quando necessário.

---

# 23. Orientação

O sistema deverá funcionar em:

```text
portrait
landscape
```

Principalmente tablets.

O PDV poderá se beneficiar bastante do modo landscape.

---

# 24. Teclado mobile

Formulários deverão utilizar corretamente:

```text
inputmode
autocomplete
type
```

Exemplo:

Telefone:

```text
teclado numérico
```

E-mail:

```text
teclado de e-mail
```

Valores:

```text
decimal
```

Isso melhora bastante a experiência no celular.

---

# 25. PWA Offline

Não recomendo tentar deixar todo o sistema offline no MVP.

Teremos níveis.

## P0

Quando offline:

```text
Você está sem conexão.
Algumas funções estão temporariamente indisponíveis.
```

A interface continua carregada quando possível.

---

## Futuro

Poderemos permitir offline parcial:

- consulta de agenda já carregada;
- dados básicos;
- rascunhos.

Mas operações como:

- pagamentos;
- alteração de agenda;
- estoque;
- financeiro;

precisam de sincronização segura.

---

# 26. Atualizações da PWA

Quando houver nova versão:

```text
Nova versão disponível
[ Atualizar ]
```

Evitar atualizar silenciosamente durante uma operação de caixa.

---

# 27. Push Notifications

A PWA deverá ficar preparada para push.

Casos futuros:

### Barbeiro

> Você possui atendimento em 15 minutos.

### Dono

> Sua barbearia possui 3 horários ociosos hoje.

### Recepção

> Cliente respondeu à confirmação.

### Cliente

Web push poderá ser utilizado quando suportado e autorizado.

---

# 28. Câmera

A PWA poderá futuramente utilizar câmera para:

- foto de produto;
- avatar;
- comprovante;
- código de barras;
- QR Code.

---

# 29. Instalação

Podemos ter CTA discreto:

```text
Instalar aplicativo
```

Quando o navegador permitir.

Nunca bloquear o sistema exigindo instalação.

---

# 30. Performance mobile

O produto deverá priorizar conexões móveis.

Evitar:

- bundles enormes;
- bibliotecas desnecessárias;
- imagens gigantes;
- gráficos carregados sem necessidade.

Usaremos:

- code splitting;
- lazy loading;
- server components onde fizer sentido;
- skeleton states;
- optimistic UI com segurança.

---

# 31. Imagens

Produtos e avatares:

```text
responsive images
```

com diferentes tamanhos.

Não carregar imagem de 2000px para exibir 48px.

---

# 32. Fontes

Preferência por fontes web otimizadas.

Poucos pesos.

Exemplo:

```text
400
500
600
700
```

Evitar baixar 10 variações tipográficas.

---

# 33. Feedback visual

Toda ação precisa responder imediatamente.

Exemplo:

```text
Adicionar cerveja
```

Ao clicar:

```text
✓ adicionado
```

Mesmo que a confirmação definitiva do servidor venha alguns milissegundos depois.

---

# 34. Estados necessários

Todo componente deverá considerar:

```text
loading
empty
error
success
disabled
offline
permission denied
```

Não desenhar somente o cenário perfeito.

---

# 35. Acessibilidade

Meta:

**WCAG 2.2 AA** onde aplicável.

Considerar:

- contraste;
- navegação por teclado;
- leitores de tela;
- labels;
- foco;
- tamanho de alvo;
- semântica HTML.

---

# 36. Dark e Light Mode

O design system nascerá com:

```text
Light
Dark
System
```

Não será dark mode adicionado posteriormente.

Todos os tokens deverão possuir versões apropriadas.

---

# 37. Responsividade por componente

Cada componente deverá responder à pergunta:

> Como ele funciona em 320px?

> Como funciona em 768px?

> Como funciona em 1440px?

Não apenas a página.

Exemplo:

```text
AppointmentCard
```

pode ter:

```text
compact
default
expanded
```

---

# 38. Design Tokens

A UI será construída usando tokens:

```text
space
font
radius
shadow
surface
border
foreground
accent
success
warning
danger
```

Isso facilita responsividade, dark mode e consistência.

---

# 39. Component variants

Exemplo:

```text
Button

size:
sm
md
lg

variant:
primary
secondary
ghost
danger

density:
comfortable
compact
```

Desktop operacional poderá utilizar density compacta.

Mobile poderá utilizar comfortable.

---

# 40. Container máximo

Dashboard em monitor ultrawide não deve simplesmente esticar indefinidamente.

Exemplo:

```text
sidebar
+
max content width
```

ou grids que aproveitam espaço de forma controlada.

Agenda e PDV são exceções e podem aproveitar mais largura.

---

# 41. Grandes monitores

Em 1920px+ podemos aproveitar espaço com:

- painel AI;
- insights;
- filtros;
- agenda expandida.

Mas nunca aumentar simplesmente o tamanho dos textos.

---

# 42. Estratégia de teste responsivo

Precisaremos testar ao menos classes de dispositivos:

### Pequeno mobile

```text
320–375px
```

### Mobile padrão

```text
390–430px
```

### Tablet

```text
768–1024px
```

### Notebook

```text
1280–1440px
```

### Desktop

```text
1920px
```

---

# 43. Dispositivos reais

Não depender somente do responsive mode do navegador.

Antes do lançamento, testar em dispositivos físicos representativos:

- iPhone;
- Android pequeno;
- Android grande;
- iPad/tablet;
- notebook;
- desktop.

O objetivo é testar comportamento, touch, teclado virtual e PWA — não uma marca específica.

---

# 44. Browsers

Suporte inicial:

```text
Chrome
Safari
Edge
Firefox
```

Nas versões modernas suportadas.

Em mobile:

```text
Safari iOS
Chrome Android
```

são prioridade.

---

# 45. Critério de aceite responsivo

Nenhuma feature P0 será considerada pronta sem funcionar:

```text
Mobile
Tablet
Desktop
```

Portanto o Definition of Done deverá incluir responsividade.

---

# 46. Definition of Done

Uma tela só estará concluída quando:

- funcionar em 320px;
- funcionar em smartphone padrão;
- funcionar em tablet;
- funcionar em notebook;
- funcionar em desktop;
- funcionar com touch;
- funcionar com mouse;
- possuir dark mode;
- possuir light mode;
- possuir loading;
- possuir empty state;
- possuir error state;
- respeitar permissions;
- possuir acessibilidade mínima definida.

---

# 47. Direção do UX

A regra central será:

> **O mesmo produto, mas não necessariamente o mesmo layout em todas as telas.**

Ou seja:

```text
mesmos dados
mesmas regras
mesmas funcionalidades
```

mas com composição adaptada ao dispositivo.

---

# 48. Prioridade por dispositivo

## Barbeiro

```text
Mobile > Tablet > Desktop
```

## Recepção / caixa

```text
Tablet ≈ Desktop > Mobile
```

## Proprietário / financeiro / relatórios

```text
Desktop > Tablet > Mobile
```

Mas **todos os fluxos essenciais devem permanecer disponíveis em todos os dispositivos**.

---

# 49. Objetivo final

Um barbeiro deverá conseguir utilizar o sistema com uma mão no smartphone entre dois atendimentos.

Uma recepcionista deverá conseguir operar a agenda e o caixa rapidamente em um tablet.

Um proprietário deverá conseguir analisar toda a empresa confortavelmente em um notebook ou monitor grande.

Tudo usando a mesma aplicação PWA e o mesmo domínio de negócio.
