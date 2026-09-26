import { readFile, readdir } from 'node:fs/promises';

const migrationName = '20260923010000_whatsapp_messaging_campaigns.sql';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const migration = await readFile(
  new URL('../supabase/migrations/' + migrationName, import.meta.url),
  'utf8',
);
const contracts = await readFile(
  new URL('../packages/contracts/src/index.ts', import.meta.url),
  'utf8',
);
const roleCatalog = await readFile(
  new URL('../apps/web/lib/auth/role-catalog.ts', import.meta.url),
  'utf8',
);
const config = await readFile(new URL('../packages/config/src/index.ts', import.meta.url), 'utf8');
const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const seed = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8');

const migrationLower = migration.toLowerCase();
const contractsLower = contracts.toLowerCase();
const roleCatalogLower = roleCatalog.toLowerCase();
const configLower = config.toLowerCase();
const packageLower = packageJson.toLowerCase();
const seedLower = seed.toLowerCase();
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const workerIndex = files.indexOf('20260918010000_worker_outbox_notifications.sql');
const messagingIndex = files.indexOf(migrationName);

const tables = [
  'messaging_connections',
  'messaging_provider_events',
  'messaging_conversations',
  'messaging_messages',
  'messaging_consent_records',
  'campaigns',
  'campaign_runs',
  'campaign_recipient_outcomes',
  'campaign_metric_rollups',
];

const branchScopedTables = tables;

const requiredMigrationSnippets = [
  "'MESSAGING_PROVIDER_EVENT_RECEIVED'",
  "'MESSAGING_DELIVERY_REQUESTED'",
  "'CAMPAIGN_DISPATCH_REQUESTED'",
  "'MESSAGING_WEBHOOK_PROCESSING'",
  "'WHATSAPP_DELIVERY'",
  "'CAMPAIGN_DISPATCH'",
  "provider text not null check (provider in ('LOCAL', 'META_WHATSAPP_CLOUD'))",
  "status text not null default 'INACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'DISCONNECTED'))",
  "event_kind text not null check (event_kind in ('INBOUND_MESSAGE', 'OUTBOUND_STATUS', 'TEMPLATE_STATUS', 'OPT_OUT', 'UNKNOWN'))",
  "delivery_state text not null check (delivery_state in ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED', 'BLOCKED_BY_CONSENT'))",
  "purpose text not null check (purpose in ('WHATSAPP_TRANSACTIONAL', 'WHATSAPP_MARKETING'))",
  "state text not null check (state in ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN'))",
  "status text not null default 'DRAFT' check (status in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'CANCELLED'))",
  "status text not null default 'PENDING' check (status in ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'BLOCKED_BY_CONSENT'))",
  'messaging_connections_active_branch_provider_idx',
  'messaging_provider_events_provider_event_idx',
  'messaging_provider_events_idempotency_idx',
  'messaging_conversations_contact_idx',
  'messaging_messages_provider_message_idx',
  'campaign_runs_due_idx',
  'campaign_runs_idempotency_idx',
  'campaign_recipient_outcomes_idempotency_idx',
  'campaign_recipient_outcomes_recipient_idx',
  'create or replace function public.has_messaging_access',
  "m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER', 'RECEPTIONIST')",
  'create or replace function public.has_messaging_manage_access',
  "m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER')",
  'create or replace function public.has_campaign_access',
  'create or replace function public.has_campaign_manage_access',
  'public.has_messaging_access(tenant_id, branch_id)',
  'public.has_messaging_manage_access(tenant_id, branch_id)',
  'public.has_campaign_access(tenant_id, branch_id)',
  'public.has_campaign_manage_access(tenant_id, branch_id)',
  'public.has_worker_operations_access(tenant_id, branch_id)',
  'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
  'CAMPAIGN_IDEMPOTENCY_CONFLICT',
  "'messaging.read'",
  "'campaigns.send'",
  "'messaging'",
  "'campaigns'",
  'no-real-provider-secrets',
];

const requiredContractSnippets = [
  'export const messagingConnectionSchema',
  'export const rawMessagingProviderEventSchema',
  'export const messagingConversationSchema',
  'export const messagingMessageSchema',
  'export const messagingConsentRecordSchema',
  'export const campaignSchema',
  'export const campaignRunSchema',
  'export const campaignRecipientOutcomeSchema',
  'export const whatsappDeliveryPayloadSchema',
  'export const whatsappWebhookEventPayloadSchema',
  'export const providerStatusEventPayloadSchema',
  'export const campaignDispatchPayloadSchema',
  'messaging.read',
  'campaigns.send',
  'MESSAGING_WEBHOOK_PROCESSING',
  'CAMPAIGN_DISPATCH',
];

const requiredSeedSnippets = [
  'insert into public.messaging_connections',
  'WhatsApp Local Centro',
  'no-real-provider-secrets',
  'insert into public.messaging_provider_events',
  'seed-provider-event-9411',
  'insert into public.messaging_conversations',
  'insert into public.messaging_messages',
  'Quero remarcar meu horario',
  'insert into public.messaging_consent_records',
  'WHATSAPP_MARKETING',
  'insert into public.campaigns',
  'Reativacao clientes inativos',
  'insert into public.campaign_runs',
  'seed-campaign-run-9461',
  'insert into public.campaign_recipient_outcomes',
  'seed-campaign-recipient-9471',
  'insert into public.campaign_metric_rollups',
  "'messaging.read'",
  "'campaigns.send'",
  "'messaging'",
  "'campaigns'",
];

const requiredConfigSnippets = [
  'WHATSAPP_PROVIDER',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'WHATSAPP_WEBHOOK_APP_SECRET',
  'WHATSAPP_WEBHOOK_TOLERANCE_SECONDS',
  'CAMPAIGN_DISPATCH_BATCH_SIZE',
  'CAMPAIGN_DISPATCH_RATE_LIMIT_PER_MINUTE',
];

const missing = [];

if (workerIndex === -1) missing.push('worker migration file');
if (messagingIndex === -1) missing.push(migrationName + ' file');
if (workerIndex !== -1 && messagingIndex !== -1 && messagingIndex <= workerIndex) {
  missing.push('messaging migration ordered after worker/outbox migration');
}

for (const table of tables) {
  if (!migrationLower.includes('create table if not exists public.' + table)) {
    missing.push('create table if not exists public.' + table);
  }
  if (!migrationLower.includes('alter table public.' + table + ' enable row level security')) {
    missing.push('alter table public.' + table + ' enable row level security');
  }
}

for (const table of branchScopedTables) {
  const tableMatch = migrationLower.match(
    new RegExp('create table if not exists public\\.' + table + ' \\(([\\s\\S]*?)\\n\\);'),
  );
  const tableBody = tableMatch?.[1] ?? '';
  if (
    !tableBody.includes('tenant_id uuid not null references public.tenants(id) on delete restrict')
  ) {
    missing.push(table + ' tenant foreign key');
  }
  if (!tableBody.includes('branch_id uuid references public.branches(id) on delete restrict')) {
    missing.push(table + ' branch foreign key');
  }
}

for (const snippet of requiredMigrationSnippets) {
  if (!migrationLower.includes(snippet.toLowerCase())) missing.push('migration: ' + snippet);
}

for (const snippet of requiredContractSnippets) {
  if (!contractsLower.includes(snippet.toLowerCase())) missing.push('contract: ' + snippet);
}

for (const snippet of requiredSeedSnippets) {
  if (!seedLower.includes(snippet.toLowerCase())) missing.push('seed: ' + snippet);
}

for (const snippet of requiredConfigSnippets) {
  if (!configLower.includes(snippet.toLowerCase())) missing.push('config: ' + snippet);
}

if (!roleCatalogLower.includes('messaging.manage')) missing.push('role catalog: messaging.manage');
if (!roleCatalogLower.includes('campaigns.approve'))
  missing.push('role catalog: campaigns.approve');
if (!packageLower.includes('"validate:messaging"'))
  missing.push('validate:messaging package script');

if (missing.length > 0) {
  console.error('Messaging/campaign migration validation missing: ' + missing.join(', '));
  process.exit(1);
}

console.log(
  'Messaging/campaign migration validated (' +
    tables.length +
    ' tables, ' +
    requiredMigrationSnippets.length +
    ' migration checks, ' +
    requiredContractSnippets.length +
    ' contract checks, ' +
    requiredSeedSnippets.length +
    ' seed checks).',
);
