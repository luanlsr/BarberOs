-- WhatsApp-first messaging, provider events, consent and campaign foundation.

alter table public.outbox_events
  drop constraint if exists outbox_events_event_type_check,
  add constraint outbox_events_event_type_check check (event_type in (
    'APPOINTMENT_CREATED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'ORDER_OPENED',
    'ORDER_PAID',
    'PAYMENT_COMPLETED',
    'PAYMENT_REFUNDED',
    'FINANCE_RECALCULATION_REQUESTED',
    'STOCK_LOW_DETECTED',
    'NOTIFICATION_DELIVERY_REQUESTED',
    'MESSAGING_PROVIDER_EVENT_RECEIVED',
    'MESSAGING_DELIVERY_REQUESTED',
    'CAMPAIGN_DISPATCH_REQUESTED'
  ));

alter table public.outbox_events
  drop constraint if exists outbox_events_source_type_check,
  add constraint outbox_events_source_type_check check (source_type in (
    'APPOINTMENT',
    'ORDER',
    'PAYMENT',
    'CASH_REGISTER',
    'FINANCIAL_ENTRY',
    'COMMISSION',
    'PAYOUT',
    'PRODUCT',
    'STOCK_MOVEMENT',
    'NOTIFICATION_INTENT',
    'MESSAGING_CONNECTION',
    'MESSAGING_CONVERSATION',
    'MESSAGING_MESSAGE',
    'MESSAGING_PROVIDER_EVENT',
    'CAMPAIGN',
    'CAMPAIGN_RUN',
    'SYSTEM'
  ));

alter table public.notification_intents
  drop constraint if exists notification_intents_source_type_check,
  add constraint notification_intents_source_type_check check (source_type in (
    'APPOINTMENT',
    'ORDER',
    'PAYMENT',
    'CASH_REGISTER',
    'FINANCIAL_ENTRY',
    'COMMISSION',
    'PAYOUT',
    'PRODUCT',
    'STOCK_MOVEMENT',
    'NOTIFICATION_INTENT',
    'MESSAGING_CONNECTION',
    'MESSAGING_CONVERSATION',
    'MESSAGING_MESSAGE',
    'MESSAGING_PROVIDER_EVENT',
    'CAMPAIGN',
    'CAMPAIGN_RUN',
    'SYSTEM'
  ));

alter table public.worker_jobs
  drop constraint if exists worker_jobs_type_check,
  add constraint worker_jobs_type_check check (type in (
    'OUTBOX_DISPATCH',
    'APPOINTMENT_REMINDER',
    'POST_SERVICE_FOLLOW_UP',
    'FINANCE_RECALCULATION',
    'STOCK_ALERT',
    'EXPIRED_RECORD_CLEANUP',
    'NOTIFICATION_DELIVERY',
    'MESSAGING_WEBHOOK_PROCESSING',
    'WHATSAPP_DELIVERY',
    'CAMPAIGN_DISPATCH'
  ));

alter table public.worker_jobs
  drop constraint if exists worker_jobs_source_type_check,
  add constraint worker_jobs_source_type_check check (source_type is null or source_type in (
    'APPOINTMENT',
    'ORDER',
    'PAYMENT',
    'CASH_REGISTER',
    'FINANCIAL_ENTRY',
    'COMMISSION',
    'PAYOUT',
    'PRODUCT',
    'STOCK_MOVEMENT',
    'NOTIFICATION_INTENT',
    'MESSAGING_CONNECTION',
    'MESSAGING_CONVERSATION',
    'MESSAGING_MESSAGE',
    'MESSAGING_PROVIDER_EVENT',
    'CAMPAIGN',
    'CAMPAIGN_RUN',
    'SYSTEM'
  ));


alter table public.outbox_events
  drop constraint if exists outbox_events_last_error_code_check,
  add constraint outbox_events_last_error_code_check check (last_error_code is null or last_error_code in (
    'WORKER_VALIDATION_ERROR',
    'WORKER_PERMISSION_DENIED',
    'WORKER_BRANCH_SCOPE_DENIED',
    'WORKER_UNSUPPORTED_JOB_TYPE',
    'WORKER_UNSUPPORTED_JOB_VERSION',
    'WORKER_LOCK_NOT_ACQUIRED',
    'WORKER_RATE_LIMITED',
    'WORKER_PROVIDER_UNAVAILABLE',
    'WORKER_RETRY_EXHAUSTED',
    'WORKER_HANDLER_FAILED',
    'OUTBOX_VALIDATION_ERROR',
    'OUTBOX_IDEMPOTENCY_CONFLICT',
    'NOTIFICATION_VALIDATION_ERROR',
    'NOTIFICATION_DELIVERY_FAILED',
    'MESSAGING_VALIDATION_ERROR',
    'MESSAGING_PERMISSION_DENIED',
    'MESSAGING_BRANCH_SCOPE_DENIED',
    'MESSAGING_PROVIDER_EVENT_REPLAY',
    'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
    'MESSAGING_CONSENT_BLOCKED',
    'CAMPAIGN_VALIDATION_ERROR',
    'CAMPAIGN_PERMISSION_DENIED',
    'CAMPAIGN_BRANCH_SCOPE_DENIED',
    'CAMPAIGN_INVALID_STATUS',
    'CAMPAIGN_IDEMPOTENCY_CONFLICT'
  ));

alter table public.worker_jobs
  drop constraint if exists worker_jobs_last_error_code_check,
  add constraint worker_jobs_last_error_code_check check (last_error_code is null or last_error_code in (
    'WORKER_VALIDATION_ERROR',
    'WORKER_PERMISSION_DENIED',
    'WORKER_BRANCH_SCOPE_DENIED',
    'WORKER_UNSUPPORTED_JOB_TYPE',
    'WORKER_UNSUPPORTED_JOB_VERSION',
    'WORKER_LOCK_NOT_ACQUIRED',
    'WORKER_RATE_LIMITED',
    'WORKER_PROVIDER_UNAVAILABLE',
    'WORKER_RETRY_EXHAUSTED',
    'WORKER_HANDLER_FAILED',
    'OUTBOX_VALIDATION_ERROR',
    'OUTBOX_IDEMPOTENCY_CONFLICT',
    'NOTIFICATION_VALIDATION_ERROR',
    'NOTIFICATION_DELIVERY_FAILED',
    'MESSAGING_VALIDATION_ERROR',
    'MESSAGING_PERMISSION_DENIED',
    'MESSAGING_BRANCH_SCOPE_DENIED',
    'MESSAGING_PROVIDER_EVENT_REPLAY',
    'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
    'MESSAGING_CONSENT_BLOCKED',
    'CAMPAIGN_VALIDATION_ERROR',
    'CAMPAIGN_PERMISSION_DENIED',
    'CAMPAIGN_BRANCH_SCOPE_DENIED',
    'CAMPAIGN_INVALID_STATUS',
    'CAMPAIGN_IDEMPOTENCY_CONFLICT'
  ));

alter table public.worker_job_attempts
  drop constraint if exists worker_job_attempts_error_code_check,
  add constraint worker_job_attempts_error_code_check check (error_code is null or error_code in (
    'WORKER_VALIDATION_ERROR',
    'WORKER_PERMISSION_DENIED',
    'WORKER_BRANCH_SCOPE_DENIED',
    'WORKER_UNSUPPORTED_JOB_TYPE',
    'WORKER_UNSUPPORTED_JOB_VERSION',
    'WORKER_LOCK_NOT_ACQUIRED',
    'WORKER_RATE_LIMITED',
    'WORKER_PROVIDER_UNAVAILABLE',
    'WORKER_RETRY_EXHAUSTED',
    'WORKER_HANDLER_FAILED',
    'OUTBOX_VALIDATION_ERROR',
    'OUTBOX_IDEMPOTENCY_CONFLICT',
    'NOTIFICATION_VALIDATION_ERROR',
    'NOTIFICATION_DELIVERY_FAILED',
    'MESSAGING_VALIDATION_ERROR',
    'MESSAGING_PERMISSION_DENIED',
    'MESSAGING_BRANCH_SCOPE_DENIED',
    'MESSAGING_PROVIDER_EVENT_REPLAY',
    'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
    'MESSAGING_CONSENT_BLOCKED',
    'CAMPAIGN_VALIDATION_ERROR',
    'CAMPAIGN_PERMISSION_DENIED',
    'CAMPAIGN_BRANCH_SCOPE_DENIED',
    'CAMPAIGN_INVALID_STATUS',
    'CAMPAIGN_IDEMPOTENCY_CONFLICT'
  ));

alter table public.notification_delivery_attempts
  drop constraint if exists notification_delivery_attempts_error_code_check,
  add constraint notification_delivery_attempts_error_code_check check (error_code is null or error_code in (
    'WORKER_VALIDATION_ERROR',
    'WORKER_PERMISSION_DENIED',
    'WORKER_BRANCH_SCOPE_DENIED',
    'WORKER_UNSUPPORTED_JOB_TYPE',
    'WORKER_UNSUPPORTED_JOB_VERSION',
    'WORKER_LOCK_NOT_ACQUIRED',
    'WORKER_RATE_LIMITED',
    'WORKER_PROVIDER_UNAVAILABLE',
    'WORKER_RETRY_EXHAUSTED',
    'WORKER_HANDLER_FAILED',
    'OUTBOX_VALIDATION_ERROR',
    'OUTBOX_IDEMPOTENCY_CONFLICT',
    'NOTIFICATION_VALIDATION_ERROR',
    'NOTIFICATION_DELIVERY_FAILED',
    'MESSAGING_VALIDATION_ERROR',
    'MESSAGING_PERMISSION_DENIED',
    'MESSAGING_BRANCH_SCOPE_DENIED',
    'MESSAGING_PROVIDER_EVENT_REPLAY',
    'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
    'MESSAGING_CONSENT_BLOCKED',
    'CAMPAIGN_VALIDATION_ERROR',
    'CAMPAIGN_PERMISSION_DENIED',
    'CAMPAIGN_BRANCH_SCOPE_DENIED',
    'CAMPAIGN_INVALID_STATUS',
    'CAMPAIGN_IDEMPOTENCY_CONFLICT'
  ));
alter table public.notification_delivery_attempts
  drop constraint if exists notification_delivery_attempts_status_check,
  add constraint notification_delivery_attempts_status_check check (status in (
    'PENDING',
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'SKIPPED',
    'BLOCKED_BY_CONSENT',
    'RETRY_SCHEDULED',
    'FAILED',
    'DEAD_LETTERED'
  ));

create table if not exists public.messaging_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  provider text not null check (provider in ('LOCAL', 'META_WHATSAPP_CLOUD')),
  status text not null default 'INACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'DISCONNECTED')),
  display_name text not null,
  display_phone_number text not null,
  provider_phone_number_id text,
  credential_reference text,
  webhook_secret_reference text,
  allow_tenant_fallback boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(display_name)) between 1 and 120),
  check (char_length(trim(display_phone_number)) between 6 and 40),
  check (credential_reference is null or char_length(trim(credential_reference)) between 1 and 200),
  check (webhook_secret_reference is null or char_length(trim(webhook_secret_reference)) between 1 and 200)
);

-- Earlier product-domain migrations may already have public.messaging_connections
-- with provider-neutral columns. Add the WhatsApp-specific columns without dropping legacy data.
alter table public.messaging_connections
  add column if not exists display_name text,
  add column if not exists display_phone_number text,
  add column if not exists provider_phone_number_id text,
  add column if not exists credential_reference text,
  add column if not exists webhook_secret_reference text,
  add column if not exists allow_tenant_fallback boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.messaging_connections
set
  display_name = coalesce(display_name, nullif(external_account_id, ''), nullif(phone_number, ''), provider),
  display_phone_number = coalesce(display_phone_number, nullif(phone_number, ''), 'unknown')
where display_name is null or display_phone_number is null;

alter table public.messaging_connections
  alter column display_name set not null,
  alter column display_phone_number set not null;

alter table public.messaging_connections
  drop constraint if exists messaging_connections_status_check;
alter table public.messaging_connections
  add constraint messaging_connections_status_check
  check (status in ('PENDING', 'ACTIVE', 'INACTIVE', 'DISCONNECTED', 'ERROR'));

alter table public.messaging_connections
  drop constraint if exists messaging_connections_display_name_check,
  add constraint messaging_connections_display_name_check check (char_length(trim(display_name)) between 1 and 120),
  drop constraint if exists messaging_connections_display_phone_number_check,
  add constraint messaging_connections_display_phone_number_check check (char_length(trim(display_phone_number)) between 6 and 40),
  drop constraint if exists messaging_connections_credential_reference_check,
  add constraint messaging_connections_credential_reference_check check (credential_reference is null or char_length(trim(credential_reference)) between 1 and 200),
  drop constraint if exists messaging_connections_webhook_secret_reference_check,
  add constraint messaging_connections_webhook_secret_reference_check check (webhook_secret_reference is null or char_length(trim(webhook_secret_reference)) between 1 and 200);

create table if not exists public.messaging_provider_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  connection_id uuid not null references public.messaging_connections(id) on delete restrict,
  provider text not null check (provider in ('LOCAL', 'META_WHATSAPP_CLOUD')),
  provider_event_id text not null,
  event_kind text not null check (event_kind in ('INBOUND_MESSAGE', 'OUTBOUND_STATUS', 'TEMPLATE_STATUS', 'OPT_OUT', 'UNKNOWN')),
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  idempotency_key text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  check (char_length(trim(provider_event_id)) >= 1),
  check (char_length(trim(idempotency_key)) >= 8)
);

create table if not exists public.messaging_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  connection_id uuid not null references public.messaging_connections(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  contact_phone_hash text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'ARCHIVED')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(contact_phone_hash)) between 8 and 160)
);

create table if not exists public.messaging_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  connection_id uuid not null references public.messaging_connections(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  channel text not null default 'WHATSAPP' check (channel = 'WHATSAPP'),
  delivery_state text not null check (delivery_state in ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED', 'BLOCKED_BY_CONSENT')),
  provider_message_id text,
  notification_intent_id uuid references public.notification_intents(id) on delete set null,
  campaign_run_id uuid,
  body_preview text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body_preview is null or char_length(trim(body_preview)) <= 500),
  check (provider_message_id is null or char_length(trim(provider_message_id)) between 1 and 200)
);

create table if not exists public.messaging_consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  contact_phone_hash text not null,
  purpose text not null check (purpose in ('WHATSAPP_TRANSACTIONAL', 'WHATSAPP_MARKETING')),
  state text not null check (state in ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN')),
  source text not null check (source in ('CUSTOMER_MESSAGE', 'OPERATOR', 'IMPORT', 'SYSTEM')),
  actor_id uuid references auth.users(id) on delete set null,
  provider_message_id text,
  reason text,
  created_at timestamptz not null default now(),
  check (char_length(trim(contact_phone_hash)) between 8 and 160),
  check (reason is null or char_length(trim(reason)) <= 500)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  name text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'CANCELLED')),
  audience_criteria jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) between 2 and 160),
  check ((status in ('APPROVED', 'SCHEDULED', 'SENDING', 'SENT', 'PARTIALLY_FAILED') and approved_by is not null and approved_at is not null) or status in ('DRAFT', 'READY_FOR_REVIEW', 'CANCELLED')),
  check (status <> 'SCHEDULED' or scheduled_for is not null)
);

create table if not exists public.campaign_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  status text not null check (status in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'CANCELLED')),
  audience_size integer not null default 0 check (audience_size >= 0),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  excluded_count integer not null default 0 check (excluded_count >= 0),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(idempotency_key)) >= 8),
  check (audience_size = eligible_count + excluded_count),
  check (completed_at is null or started_at is not null)
);

create table if not exists public.campaign_recipient_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_run_id uuid not null references public.campaign_runs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  contact_phone_hash text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'BLOCKED_BY_CONSENT')),
  notification_intent_id uuid references public.notification_intents(id) on delete set null,
  provider_message_id text,
  exclusion_reason text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(contact_phone_hash)) between 8 and 160),
  check (char_length(trim(idempotency_key)) >= 8),
  check (exclusion_reason is null or char_length(trim(exclusion_reason)) <= 200)
);

create table if not exists public.campaign_metric_rollups (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_run_id uuid not null references public.campaign_runs(id) on delete cascade,
  audience_size integer not null default 0 check (audience_size >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  blocked_by_consent_count integer not null default 0 check (blocked_by_consent_count >= 0),
  opt_out_count integer not null default 0 check (opt_out_count >= 0),
  reply_count integer not null default 0 check (reply_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, campaign_run_id)
);


-- Earlier product-domain migrations may already have public.campaigns and public.campaign_runs
-- with a simpler lifecycle. Keep this migration additive when those tables exist.
alter table public.campaigns
  add column if not exists audience_criteria jsonb not null default '{}'::jsonb,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_for timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.campaigns
  alter column content_template drop not null;

alter table public.campaigns
  drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'RUNNING', 'PAUSED', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'COMPLETED', 'CANCELLED'));

alter table public.campaign_runs
  add column if not exists branch_id uuid references public.branches(id) on delete restrict,
  add column if not exists audience_size integer not null default 0 check (audience_size >= 0),
  add column if not exists eligible_count integer not null default 0 check (eligible_count >= 0),
  add column if not exists excluded_count integer not null default 0 check (excluded_count >= 0),
  add column if not exists scheduled_for timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.campaign_runs
  drop constraint if exists campaign_runs_status_check;
alter table public.campaign_runs
  add constraint campaign_runs_status_check
  check (status in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'RUNNING', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'COMPLETED', 'FAILED', 'CANCELLED'));alter table public.messaging_messages
  add constraint messaging_messages_campaign_run_fk
  foreign key (campaign_run_id) references public.campaign_runs(id) on delete set null
  not valid;

alter table public.messaging_messages validate constraint messaging_messages_campaign_run_fk;

create index if not exists messaging_connections_tenant_branch_status_idx on public.messaging_connections (tenant_id, branch_id, status);
create unique index if not exists messaging_connections_active_branch_provider_idx on public.messaging_connections (tenant_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), provider) where status = 'ACTIVE';

create index if not exists messaging_provider_events_tenant_received_idx on public.messaging_provider_events (tenant_id, branch_id, received_at desc);
create index if not exists messaging_provider_events_processing_idx on public.messaging_provider_events (tenant_id, processed_at, received_at) where processed_at is null;
create unique index if not exists messaging_provider_events_provider_event_idx on public.messaging_provider_events (tenant_id, provider, provider_event_id);
create unique index if not exists messaging_provider_events_idempotency_idx on public.messaging_provider_events (tenant_id, idempotency_key);

create index if not exists messaging_conversations_tenant_branch_status_idx on public.messaging_conversations (tenant_id, branch_id, status, last_message_at desc nulls last);
create index if not exists messaging_conversations_customer_idx on public.messaging_conversations (tenant_id, customer_id, updated_at desc) where customer_id is not null;
create unique index if not exists messaging_conversations_contact_idx on public.messaging_conversations (tenant_id, connection_id, contact_phone_hash);

create index if not exists messaging_messages_conversation_idx on public.messaging_messages (tenant_id, conversation_id, created_at desc);
create index if not exists messaging_messages_provider_message_idx on public.messaging_messages (tenant_id, provider_message_id) where provider_message_id is not null;
create index if not exists messaging_messages_delivery_state_idx on public.messaging_messages (tenant_id, branch_id, delivery_state, created_at desc);

create index if not exists messaging_consent_latest_idx on public.messaging_consent_records (tenant_id, contact_phone_hash, purpose, created_at desc);
create index if not exists messaging_consent_customer_idx on public.messaging_consent_records (tenant_id, customer_id, created_at desc) where customer_id is not null;

create index if not exists campaigns_tenant_branch_status_idx on public.campaigns (tenant_id, branch_id, status, updated_at desc);
create index if not exists campaign_runs_due_idx on public.campaign_runs (tenant_id, branch_id, status, scheduled_for) where status = 'SCHEDULED';
create unique index if not exists campaign_runs_idempotency_idx on public.campaign_runs (tenant_id, idempotency_key);
create index if not exists campaign_recipient_outcomes_run_status_idx on public.campaign_recipient_outcomes (tenant_id, campaign_run_id, status);
create unique index if not exists campaign_recipient_outcomes_idempotency_idx on public.campaign_recipient_outcomes (tenant_id, idempotency_key);
create unique index if not exists campaign_recipient_outcomes_recipient_idx on public.campaign_recipient_outcomes (tenant_id, campaign_run_id, contact_phone_hash);
create index if not exists campaign_metric_rollups_campaign_idx on public.campaign_metric_rollups (tenant_id, campaign_id, updated_at desc);

alter table public.messaging_connections enable row level security;
alter table public.messaging_provider_events enable row level security;
alter table public.messaging_conversations enable row level security;
alter table public.messaging_messages enable row level security;
alter table public.messaging_consent_records enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_runs enable row level security;
alter table public.campaign_recipient_outcomes enable row level security;
alter table public.campaign_metric_rollups enable row level security;

create or replace function public.has_messaging_access(target_tenant uuid, target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.status = 'ACTIVE'
      and m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER', 'RECEPTIONIST')
      and (
        target_branch is null
        or exists (
          select 1
          from public.membership_branches mb
          join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
          where mb.membership_id = m.id
            and mb.branch_id = target_branch
            and b.status = 'ACTIVE'
        )
      )
  );
$$;

create or replace function public.has_messaging_manage_access(target_tenant uuid, target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.status = 'ACTIVE'
      and m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER')
      and (
        target_branch is null
        or exists (
          select 1
          from public.membership_branches mb
          join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
          where mb.membership_id = m.id
            and mb.branch_id = target_branch
            and b.status = 'ACTIVE'
        )
      )
  );
$$;

create or replace function public.has_campaign_access(target_tenant uuid, target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.status = 'ACTIVE'
      and m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER', 'RECEPTIONIST')
      and (
        target_branch is null
        or exists (
          select 1
          from public.membership_branches mb
          join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
          where mb.membership_id = m.id
            and mb.branch_id = target_branch
            and b.status = 'ACTIVE'
        )
      )
  );
$$;

create or replace function public.has_campaign_manage_access(target_tenant uuid, target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.status = 'ACTIVE'
      and m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER')
      and (
        target_branch is null
        or exists (
          select 1
          from public.membership_branches mb
          join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
          where mb.membership_id = m.id
            and mb.branch_id = target_branch
            and b.status = 'ACTIVE'
        )
      )
  );
$$;

drop policy if exists messaging_connections_read on public.messaging_connections;
create policy messaging_connections_read on public.messaging_connections for select to authenticated using (public.has_messaging_access(tenant_id, branch_id));
drop policy if exists messaging_connections_manage on public.messaging_connections;
create policy messaging_connections_manage on public.messaging_connections for all to authenticated using (public.has_messaging_manage_access(tenant_id, branch_id)) with check (public.has_messaging_manage_access(tenant_id, branch_id));

drop policy if exists messaging_provider_events_worker_read on public.messaging_provider_events;
create policy messaging_provider_events_worker_read on public.messaging_provider_events for select to authenticated using (public.has_worker_operations_access(tenant_id, branch_id) or public.has_messaging_access(tenant_id, branch_id));
drop policy if exists messaging_provider_events_worker_write on public.messaging_provider_events;
create policy messaging_provider_events_worker_write on public.messaging_provider_events for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));

drop policy if exists messaging_conversations_read on public.messaging_conversations;
create policy messaging_conversations_read on public.messaging_conversations for select to authenticated using (public.has_messaging_access(tenant_id, branch_id));
drop policy if exists messaging_conversations_manage on public.messaging_conversations;
create policy messaging_conversations_manage on public.messaging_conversations for all to authenticated using (public.has_messaging_manage_access(tenant_id, branch_id)) with check (public.has_messaging_manage_access(tenant_id, branch_id));

drop policy if exists messaging_messages_read on public.messaging_messages;
create policy messaging_messages_read on public.messaging_messages for select to authenticated using (public.has_messaging_access(tenant_id, branch_id));
drop policy if exists messaging_messages_worker_write on public.messaging_messages;
create policy messaging_messages_worker_write on public.messaging_messages for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id) or public.has_messaging_manage_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id) or public.has_messaging_manage_access(tenant_id, branch_id));

drop policy if exists messaging_consent_records_read on public.messaging_consent_records;
create policy messaging_consent_records_read on public.messaging_consent_records for select to authenticated using (public.has_messaging_access(tenant_id, branch_id));
drop policy if exists messaging_consent_records_manage on public.messaging_consent_records;
create policy messaging_consent_records_manage on public.messaging_consent_records for all to authenticated using (public.has_messaging_manage_access(tenant_id, branch_id)) with check (public.has_messaging_manage_access(tenant_id, branch_id));

drop policy if exists campaigns_read on public.campaigns;
create policy campaigns_read on public.campaigns for select to authenticated using (public.has_campaign_access(tenant_id, branch_id));
drop policy if exists campaigns_manage on public.campaigns;
create policy campaigns_manage on public.campaigns for all to authenticated using (public.has_campaign_manage_access(tenant_id, branch_id)) with check (public.has_campaign_manage_access(tenant_id, branch_id));

drop policy if exists campaign_runs_read on public.campaign_runs;
create policy campaign_runs_read on public.campaign_runs for select to authenticated using (public.has_campaign_access(tenant_id, branch_id));
drop policy if exists campaign_runs_worker_write on public.campaign_runs;
create policy campaign_runs_worker_write on public.campaign_runs for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id));

drop policy if exists campaign_recipient_outcomes_read on public.campaign_recipient_outcomes;
create policy campaign_recipient_outcomes_read on public.campaign_recipient_outcomes for select to authenticated using (public.has_campaign_access(tenant_id, branch_id));
drop policy if exists campaign_recipient_outcomes_worker_write on public.campaign_recipient_outcomes;
create policy campaign_recipient_outcomes_worker_write on public.campaign_recipient_outcomes for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id));

drop policy if exists campaign_metric_rollups_read on public.campaign_metric_rollups;
create policy campaign_metric_rollups_read on public.campaign_metric_rollups for select to authenticated using (public.has_campaign_access(tenant_id, branch_id));
drop policy if exists campaign_metric_rollups_worker_write on public.campaign_metric_rollups;
create policy campaign_metric_rollups_worker_write on public.campaign_metric_rollups for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id) or public.has_campaign_manage_access(tenant_id, branch_id));

insert into public.permissions (code, description)
values
  ('messaging.read', 'Ler conversas, mensagens e status de mensageria.'),
  ('messaging.manage', 'Gerenciar conexoes e preferencias de mensageria.'),
  ('campaigns.read', 'Ler campanhas, audiencias e metricas.'),
  ('campaigns.create', 'Criar e editar rascunhos de campanhas.'),
  ('campaigns.approve', 'Aprovar campanhas antes do envio.'),
  ('campaigns.send', 'Agendar, enviar ou cancelar disparos de campanhas.')
on conflict (code) do nothing;

insert into public.entitlements (code, description)
values
  ('messaging', 'Mensageria WhatsApp operacional.'),
  ('campaigns', 'Campanhas e reativacao de clientes.')
on conflict (code) do nothing;

with active_tenants as (
  select id from public.tenants where status = 'ACTIVE'
)
insert into public.tenant_entitlements (tenant_id, entitlement_code, enabled)
select active_tenants.id, entitlement_code, true
from active_tenants
cross join (values ('messaging'), ('campaigns')) as requested(entitlement_code)
on conflict (tenant_id, entitlement_code) do update set enabled = excluded.enabled;

insert into public.messaging_connections (
  tenant_id,
  branch_id,
  channel,
  provider,
  external_account_id,
  phone_number,
  secret_reference,
  status,
  display_name,
  display_phone_number,
  allow_tenant_fallback,
  metadata,
  created_by,
  updated_by
)
select
  branches.tenant_id,
  branches.id,
  'WHATSAPP',
  'LOCAL',
  'local-whatsapp-' || branches.id::text,
  '+5500000000000',
  null,
  'ACTIVE',
  'WhatsApp local - ' || branches.name,
  '+5500000000000',
  false,
  jsonb_build_object('demo', true, 'secretPolicy', 'no-real-provider-secrets'),
  null,
  null
from public.branches
join public.tenants on tenants.id = branches.tenant_id
where tenants.status = 'ACTIVE'
  and branches.status = 'ACTIVE'
on conflict do nothing;

with demo_campaigns as (
  select
    branches.tenant_id,
    branches.id as branch_id,
    'Reativacao local - ' || branches.name as name,
    jsonb_build_object('branchIds', jsonb_build_array(branches.id::text), 'customerStatus', jsonb_build_array('INACTIVE', 'AT_RISK')) as audience_criteria,
    jsonb_build_object('templateKey', 'campaign.reactivation.local.v1', 'bodyPreview', 'Sentimos sua falta por aqui.') as content
  from public.branches
  join public.tenants on tenants.id = branches.tenant_id
  where tenants.status = 'ACTIVE'
    and branches.status = 'ACTIVE'
)
insert into public.campaigns (tenant_id, branch_id, name, channel, status, template_key, content_template, audience_criteria, content, created_by, updated_by)
select tenant_id, branch_id, name, 'WHATSAPP', 'DRAFT', 'campaign.reactivation.local.v1', 'Sentimos sua falta por aqui.', audience_criteria, content, null, null
from demo_campaigns
where not exists (
  select 1 from public.campaigns existing
  where existing.tenant_id = demo_campaigns.tenant_id
    and existing.branch_id = demo_campaigns.branch_id
    and existing.name = demo_campaigns.name
);

comment on table public.messaging_connections is 'Tenant/branch-scoped WhatsApp provider connections; credential fields store server-only secret references.';
comment on table public.messaging_provider_events is 'Idempotent raw provider webhook events processed asynchronously by the worker.';
comment on table public.messaging_conversations is 'Tenant-scoped WhatsApp conversation summaries for linked or unresolved customers.';
comment on table public.messaging_messages is 'Sanitized inbound/outbound WhatsApp messages and delivery states.';
comment on table public.messaging_consent_records is 'Auditable WhatsApp transactional and marketing consent/opt-out history.';
comment on table public.campaigns is 'Campaign drafts and approval/scheduling lifecycle.';
comment on table public.campaign_runs is 'Frozen campaign dispatch runs and audience counts.';
comment on table public.campaign_recipient_outcomes is 'Per-recipient campaign dispatch outcome and idempotency records.';
comment on table public.campaign_metric_rollups is 'Campaign delivery and response metric rollups.';