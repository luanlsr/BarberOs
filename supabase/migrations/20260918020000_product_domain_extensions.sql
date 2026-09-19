-- Product domain extensions from the PRD.
-- This migration is additive: existing operational tables remain the source of truth.

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_tag_assignments (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, customer_id, tag_id)
);

create table if not exists public.customer_metrics (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete restrict,
  visit_count integer not null default 0 check (visit_count >= 0),
  total_spent_cents bigint not null default 0 check (total_spent_cents >= 0),
  average_ticket_cents integer not null default 0 check (average_ticket_cents >= 0),
  average_return_days integer check (average_return_days >= 0),
  days_since_last_visit integer check (days_since_last_visit >= 0),
  lifecycle_status text not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE', 'COOLING', 'AT_RISK', 'INACTIVE')),
  calculated_at timestamptz not null default now(),
  primary key (tenant_id, customer_id, branch_id)
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  requested_from timestamptz not null,
  requested_until timestamptz,
  status text not null default 'WAITING' check (status in ('WAITING', 'OFFERED', 'BOOKED', 'EXPIRED', 'CANCELLED')),
  notes text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_until is null or requested_from < requested_until),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  document text,
  email text,
  phone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),
  ordered_at timestamptz,
  received_at timestamptz,
  idempotency_key text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received between 0 and quantity_ordered),
  unit_cost_amount_cents integer not null check (unit_cost_amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  description text,
  price_amount_cents integer not null check (price_amount_cents > 0),
  validity_days integer not null check (validity_days > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_package_items (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (tenant_id, package_id, service_id)
);

create table if not exists public.customer_package_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  package_id uuid not null references public.service_packages(id) on delete restrict,
  purchased_order_id uuid references public.orders(id) on delete restrict,
  remaining_uses integer not null check (remaining_uses >= 0),
  expires_at timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

create table if not exists public.messaging_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  channel text not null check (channel in ('WHATSAPP', 'WEB', 'INSTAGRAM', 'SMS')),
  provider text not null,
  external_account_id text,
  phone_number text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'DISCONNECTED', 'ERROR')),
  secret_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, channel, external_account_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  connection_id uuid references public.messaging_connections(id) on delete set null,
  channel text not null check (channel in ('WHATSAPP', 'WEB', 'INSTAGRAM', 'SMS')),
  external_conversation_id text,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'WAITING_HUMAN', 'ARCHIVED')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, channel, external_conversation_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  channel text not null check (channel in ('WHATSAPP', 'WEB', 'INSTAGRAM', 'SMS')),
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  sender_type text not null check (sender_type in ('CUSTOMER', 'USER', 'SYSTEM', 'AI')),
  content text,
  content_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  external_message_id text,
  idempotency_key text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, channel, external_message_id)
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  message_id uuid not null references public.messages(id) on delete cascade,
  event_type text not null check (event_type in ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REPLIED')),
  provider_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (tenant_id, message_id, event_type, occurred_at)
);

create table if not exists public.messaging_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS')),
  purpose text not null check (purpose in ('TRANSACTIONAL', 'MARKETING')),
  status text not null check (status in ('OPTED_IN', 'OPTED_OUT')),
  source text not null,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id, customer_id, channel, purpose)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider text not null,
  event_type text not null,
  external_event_id text not null,
  signature_valid boolean not null default false,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'QUEUED', 'PROCESSED', 'IGNORED', 'FAILED')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text,
  unique (provider, external_event_id)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  name text not null,
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  template_key text,
  content_template text not null,
  scheduled_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_audiences (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPTED_OUT', 'SKIPPED')),
  notification_intent_id uuid references public.notification_intents(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, campaign_id, customer_id)
);

create table if not exists public.campaign_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  status text not null default 'RUNNING' check (status in ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  total_count integer not null default 0 check (total_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  idempotency_key text,
  unique (tenant_id, idempotency_key)
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  actor_id uuid,
  channel text not null check (channel in ('WEB', 'WHATSAPP', 'INTERNAL')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'ESCALATED', 'ARCHIVED')),
  model text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM')),
  content text,
  tool_name text,
  tool_arguments jsonb,
  tool_result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tool_registry (
  tool_name text primary key,
  version integer not null default 1 check (version > 0),
  permission_code text references public.permissions(code) on delete restrict,
  risk_level text not null check (risk_level in ('READ', 'LOW_WRITE', 'CONFIRMATION_REQUIRED', 'HIGH_RISK', 'PROHIBITED')),
  input_schema jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_pending_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  actor_id uuid,
  tool_name text not null references public.ai_tool_registry(tool_name) on delete restrict,
  payload_hash text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'EXECUTED')),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tool_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  pending_action_id uuid references public.ai_pending_actions(id) on delete set null,
  tool_name text not null,
  tool_version integer not null default 1,
  actor_id uuid,
  arguments_hash text not null,
  result jsonb,
  status text not null check (status in ('SUCCEEDED', 'FAILED', 'DENIED', 'CONFIRMATION_REQUIRED')),
  risk_level text not null check (risk_level in ('READ', 'LOW_WRITE', 'CONFIRMATION_REQUIRED', 'HIGH_RISK', 'PROHIBITED')),
  confirmed boolean not null default false,
  duration_ms integer check (duration_ms >= 0),
  model text,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  period_start date not null,
  metric text not null check (metric in ('AI_REQUESTS', 'AI_TOKENS', 'TOOL_CALLS')),
  quantity bigint not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, branch_id, period_start, metric)
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  title text not null,
  document_type text not null check (document_type in ('FAQ', 'POLICY', 'PROCEDURE', 'BRANDING', 'OTHER')),
  content text not null,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  embedding jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_amount_cents integer not null check (price_amount_cents >= 0),
  billing_interval text not null check (billing_interval in ('MONTHLY', 'YEARLY')),
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  plan_id uuid not null references public.saas_plans(id) on delete cascade,
  entitlement_code text not null references public.entitlements(code) on delete restrict,
  enabled boolean not null default true,
  limit_value integer check (limit_value is null or limit_value >= 0),
  metadata jsonb not null default '{}'::jsonb,
  primary key (plan_id, entitlement_code)
);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  provider text,
  external_subscription_id text,
  status text not null default 'TRIALING' check (status in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_start < current_period_end),
  unique (tenant_id, external_subscription_id)
);

create table if not exists public.usage_counters (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start date not null,
  metric text not null check (metric in ('AI_REQUESTS', 'AI_TOKENS', 'WHATSAPP_MESSAGES', 'PROFESSIONALS', 'BRANCHES', 'STORAGE_BYTES')),
  quantity bigint not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, period_start, metric)
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid references public.tenant_subscriptions(id) on delete restrict,
  provider text,
  external_invoice_id text,
  status text not null default 'OPEN' check (status in ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE')),
  amount_cents integer not null check (amount_cents >= 0),
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, external_invoice_id)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider text not null,
  event_type text not null,
  external_event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.support_access_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_membership_id uuid not null references public.platform_memberships(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  reason text not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED')),
  starts_at timestamptz,
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(trim(reason)) >= 5)
);

create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  bucket text not null check (bucket in ('avatars', 'product-images', 'tenant-branding', 'receipts', 'documents')),
  object_path text not null,
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status text not null default 'ACTIVE' check (status in ('PENDING', 'ACTIVE', 'ARCHIVED', 'DELETED')),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create or replace function public.has_platform_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_memberships pm
    where pm.user_id = auth.uid() and pm.status = 'ACTIVE'
  );
$$;

create or replace function public.has_product_domain_access(target_tenant uuid, target_branch uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_active_membership(target_tenant)
    and (target_branch is null or public.has_branch_access(target_tenant, target_branch));
$$;

create or replace function public.has_support_session_access(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.support_access_sessions s
    join public.platform_memberships pm on pm.id = s.platform_membership_id
    where pm.user_id = auth.uid()
      and pm.status = 'ACTIVE'
      and s.tenant_id = target_tenant
      and s.status = 'ACTIVE'
      and s.expires_at > now()
  );
$$;

create unique index if not exists customer_tags_tenant_name_idx on public.customer_tags (tenant_id, lower(name));
create unique index if not exists suppliers_tenant_name_idx on public.suppliers (tenant_id, lower(name));
create unique index if not exists service_packages_tenant_name_idx on public.service_packages (tenant_id, lower(name));
create index if not exists customer_metrics_lookup_idx on public.customer_metrics (tenant_id, branch_id, lifecycle_status, calculated_at desc);
create index if not exists waitlist_branch_status_idx on public.waitlist_entries (tenant_id, branch_id, status, requested_from);
create index if not exists suppliers_tenant_status_idx on public.suppliers (tenant_id, status, name);
create index if not exists purchase_orders_branch_status_idx on public.purchase_orders (tenant_id, branch_id, status, created_at desc);
create index if not exists purchase_order_items_product_idx on public.purchase_order_items (tenant_id, branch_id, product_id);
create index if not exists package_balances_customer_idx on public.customer_package_balances (tenant_id, branch_id, customer_id, status, expires_at);
create index if not exists conversations_customer_idx on public.conversations (tenant_id, customer_id, updated_at desc);
create index if not exists messages_conversation_idx on public.messages (tenant_id, conversation_id, created_at);
create index if not exists message_events_message_idx on public.message_events (tenant_id, message_id, occurred_at);
create index if not exists webhook_events_status_idx on public.webhook_events (tenant_id, status, received_at);
create index if not exists campaign_status_idx on public.campaigns (tenant_id, branch_id, status, scheduled_at);
create index if not exists campaign_audience_status_idx on public.campaign_audiences (tenant_id, campaign_id, status);
create index if not exists ai_conversations_actor_idx on public.ai_conversations (tenant_id, actor_id, started_at desc);
create index if not exists ai_messages_conversation_idx on public.ai_messages (tenant_id, conversation_id, created_at);
create index if not exists ai_tool_executions_lookup_idx on public.ai_tool_executions (tenant_id, branch_id, tool_name, created_at desc);
create index if not exists ai_pending_actions_status_idx on public.ai_pending_actions (tenant_id, status, expires_at);
create index if not exists knowledge_documents_search_idx on public.knowledge_documents (tenant_id, branch_id, status, updated_at desc);
create index if not exists tenant_subscriptions_status_idx on public.tenant_subscriptions (tenant_id, status, current_period_end);
create index if not exists billing_invoices_status_idx on public.billing_invoices (tenant_id, status, due_at);
create index if not exists billing_events_status_idx on public.billing_events (tenant_id, status, received_at);
create index if not exists support_access_tenant_idx on public.support_access_sessions (tenant_id, status, expires_at);
create index if not exists storage_objects_tenant_idx on public.storage_objects (tenant_id, branch_id, bucket, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customer_tags', 'customer_tag_assignments', 'customer_metrics', 'waitlist_entries',
    'suppliers', 'purchase_orders', 'purchase_order_items', 'service_packages',
    'service_package_items', 'customer_package_balances', 'messaging_connections',
    'conversations', 'messages', 'message_events', 'messaging_consents',
    'campaigns', 'campaign_audiences', 'campaign_runs', 'ai_conversations', 'ai_messages',
    'ai_pending_actions', 'ai_tool_executions', 'ai_usage', 'knowledge_documents',
    'tenant_subscriptions', 'usage_counters', 'billing_invoices', 'storage_objects'
  ] loop
    execute format('alter table public.%I add column if not exists branch_id uuid references public.branches(id) on delete restrict', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_select', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_product_domain_access(tenant_id, branch_id))', table_name || '_member_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_member_write', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_product_domain_access(tenant_id, branch_id)) with check (public.has_product_domain_access(tenant_id, branch_id))', table_name || '_member_write', table_name);
  end loop;
end $$;

alter table public.ai_tool_registry enable row level security;
drop policy if exists ai_tool_registry_authenticated_select on public.ai_tool_registry;
create policy ai_tool_registry_authenticated_select on public.ai_tool_registry for select to authenticated using (enabled = true or public.has_platform_access());
drop policy if exists ai_tool_registry_platform_write on public.ai_tool_registry;
create policy ai_tool_registry_platform_write on public.ai_tool_registry for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.saas_plans enable row level security;
drop policy if exists saas_plans_authenticated_select on public.saas_plans;
create policy saas_plans_authenticated_select on public.saas_plans for select to authenticated using (status = 'ACTIVE' or public.has_platform_access());
drop policy if exists saas_plans_platform_write on public.saas_plans;
create policy saas_plans_platform_write on public.saas_plans for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.plan_entitlements enable row level security;
drop policy if exists plan_entitlements_authenticated_select on public.plan_entitlements;
create policy plan_entitlements_authenticated_select on public.plan_entitlements for select to authenticated using (true);
drop policy if exists plan_entitlements_platform_write on public.plan_entitlements;
create policy plan_entitlements_platform_write on public.plan_entitlements for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.platform_memberships enable row level security;
drop policy if exists platform_memberships_self_select on public.platform_memberships;
create policy platform_memberships_self_select on public.platform_memberships for select to authenticated using (user_id = auth.uid() or public.has_platform_access());
drop policy if exists platform_memberships_platform_write on public.platform_memberships;
create policy platform_memberships_platform_write on public.platform_memberships for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.support_access_sessions enable row level security;
drop policy if exists support_access_platform_select on public.support_access_sessions;
create policy support_access_platform_select on public.support_access_sessions for select to authenticated using (public.has_platform_access() or public.has_support_session_access(tenant_id));
drop policy if exists support_access_platform_write on public.support_access_sessions;
create policy support_access_platform_write on public.support_access_sessions for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.billing_events enable row level security;
drop policy if exists billing_events_platform_select on public.billing_events;
create policy billing_events_platform_select on public.billing_events for select to authenticated using (public.has_platform_access() or (tenant_id is not null and public.has_active_membership(tenant_id)));
drop policy if exists billing_events_platform_write on public.billing_events;
create policy billing_events_platform_write on public.billing_events for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

alter table public.webhook_events enable row level security;
drop policy if exists webhook_events_member_select on public.webhook_events;
create policy webhook_events_member_select on public.webhook_events for select to authenticated using (tenant_id is not null and (public.has_product_domain_access(tenant_id, null) or public.has_platform_access()));
drop policy if exists webhook_events_platform_write on public.webhook_events;
create policy webhook_events_platform_write on public.webhook_events for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

comment on table public.messaging_connections is 'Provider-neutral channel connection; secrets stay outside the database and are referenced by secret_reference.';
comment on table public.ai_tool_executions is 'Immutable operational audit of AI tool calls; raw credentials and sensitive tokens must never be stored.';
comment on table public.billing_events is 'Idempotent SaaS billing webhook inbox.';
