# WhatsApp, mensagens e campanhas

Este runbook cobre o setup operacional do recorte `whatsapp-messaging-campaigns`.

## Variáveis de ambiente

Server-side:

- `WHATSAPP_PROVIDER`: `local` para desenvolvimento seguro ou `meta` para Meta WhatsApp Cloud.
- `WHATSAPP_ACCESS_TOKEN`: token server-side do provider Meta. Nunca expor no cliente.
- `WHATSAPP_PHONE_NUMBER_ID`: phone number id do app Meta.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: token usado no desafio `hub.verify_token`.
- `WHATSAPP_WEBHOOK_APP_SECRET`: segredo usado para validar assinatura do webhook.
- `WHATSAPP_WEBHOOK_TOLERANCE_SECONDS`: janela máxima para timestamp do webhook. Padrão: `300`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: necessários para APIs server-side, migrations/seeds e operações administrativas.
- `WORKER_PORT`, `WORKER_POLL_INTERVAL_MS`, `WORKER_BATCH_SIZE`, `WORKER_MAX_ATTEMPTS`, `WORKER_RETRY_BASE_DELAY_MS`, `WORKER_RETRY_MAX_DELAY_MS`: runtime e retry do worker.

Client-side:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: somente credenciais públicas do Supabase.

## Provider local/noop

Use `WHATSAPP_PROVIDER=local` em desenvolvimento. Esse modo permite validar contratos, consentimento, jobs, retries, telas e métricas sem enviar mensagens reais.

O provider local não deve ser apresentado como entrega real ao cliente. Ele registra tentativas e estados de desenvolvimento, preservando idempotência e auditoria sem depender de credenciais externas.

## Provider Meta

Para `WHATSAPP_PROVIDER=meta`, configure as quatro variáveis obrigatórias:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_WEBHOOK_APP_SECRET`

O backend valida essa combinação em `packages/config`. Se alguma estiver ausente, a configuração server-side falha antes de aceitar envio real.

## Setup por tenant

1. Criar uma conexão em `/api/v1/messaging/connections` com `provider`, `displayName`, `displayPhoneNumber`, `branchId` opcional e referências de credenciais.
2. Ativar a conexão no banco/fluxo administrativo apropriado.
3. Garantir permissões e entitlement: `messaging.read`, `messaging.manage`, `campaigns.read`, `campaigns.create`, `campaigns.approve`, `campaigns.send`, `messaging`, `campaigns`.
4. Configurar consentimentos antes de marketing. Campanhas devem respeitar opt-in/opt-out.

## Webhook

Fluxo esperado:

1. `GET` de verificação valida `hub.mode=subscribe`, `hub.challenge` e `hub.verify_token`.
2. `POST` valida assinatura, timestamp e conexão ativa.
3. Evento bruto é persistido de forma idempotente em `messaging_provider_events`.
4. O processamento assíncrono é enfileirado com `MESSAGING_WEBHOOK_PROCESSING`.
5. O worker transforma eventos em mensagens, conversas, opt-out ou status de entrega.

Para teste local, use requests com `x-request-id` fixo e payloads sem dados reais. Não registre payload bruto em logs.

## Observabilidade

APIs e worker emitem:

- `messaging_webhook_accepted_total`
- `messaging_webhook_rejected_total`
- `messaging_webhook_events_enqueued_total`
- `whatsapp_provider_send_latency_ms`
- `whatsapp_provider_send_accepted_total`
- `worker_job_retries_total`
- `worker_job_dead_letters_total`
- `campaign_dispatch_recipients_queued_total`
- `campaign_dispatch_runs_total`

Logs estruturados carregam `requestId`/`correlationId`, `tenantId`, `branchId`, evento e erro sanitizado. Não devem conter token, segredo, telefone cru, corpo bruto de mensagem ou payload do provider.

## Status operacional

Use `GET /api/v1/messaging/operations` para consultar:

- entregas com falha;
- envios bloqueados por consentimento;
- webhooks recebidos e ainda não processados após o SLA configurado;
- campanhas parcialmente falhas.

Filtros:

- `branchId`
- `limit`
- `delayedWebhookMs`

O retorno é resumido e seguro para operação: IDs, status, datas, motivo e metadados técnicos mínimos. Payloads brutos e conteúdo de mensagem não são retornados.

## Checklist de teste manual

1. Local provider: criar conexão local, criar intent WhatsApp e confirmar tentativa registrada.
2. Webhook válido: enviar payload assinado/normalizado e verificar `accepted=true`.
3. Webhook inválido: assinatura inválida deve responder `401` e não persistir evento.
4. Evento duplicado: mesmo idempotency key não deve reenfileirar trabalho.
5. Consentimento: opt-out deve bloquear marketing e aparecer como envio bloqueado.
6. Campanha: aprovar/agendar/enviar deve criar outcomes por destinatário e métricas de run.
7. Operações: `/api/v1/messaging/operations` deve mostrar falhas sem payload bruto.
