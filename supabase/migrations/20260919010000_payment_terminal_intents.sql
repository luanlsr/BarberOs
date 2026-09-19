-- Payment terminal integration foundation.
-- V1 stores no provider secrets. It only tracks branch terminals and
-- idempotent payment intents sent to those terminals.

create table if not exists public.payment_terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  provider text not null check (provider in ('MOCK_TERMINAL', 'MERCADO_PAGO')),
  provider_terminal_id text not null,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ERROR')),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, provider_terminal_id),
  check (char_length(trim(name)) >= 2)
);

create table if not exists public.payment_terminal_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  terminal_id uuid not null references public.payment_terminals(id) on delete restrict,
  provider text not null check (provider in ('MOCK_TERMINAL', 'MERCADO_PAGO')),
  method text not null check (method in ('PIX', 'DEBIT_CARD', 'CREDIT_CARD')),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT_TO_TERMINAL', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED')),
  amount_cents integer not null check (amount_cents > 0),
  installments integer check (installments is null or installments between 1 and 24),
  provider_intent_id text,
  provider_reference text,
  provider_payload jsonb not null default '{}'::jsonb,
  payment_id uuid references public.payments(id) on delete restrict,
  idempotency_key text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  failure_code text,
  failure_message text,
  unique (tenant_id, idempotency_key)
);

create index if not exists payment_terminals_branch_status_idx
  on public.payment_terminals (tenant_id, branch_id, status);

create index if not exists payment_terminal_intents_order_idx
  on public.payment_terminal_intents (tenant_id, branch_id, order_id, created_at desc);

create index if not exists payment_terminal_intents_status_idx
  on public.payment_terminal_intents (tenant_id, branch_id, status, created_at desc);

alter table public.payment_terminals enable row level security;
alter table public.payment_terminal_intents enable row level security;

drop policy if exists payment_terminals_member_select on public.payment_terminals;
create policy payment_terminals_member_select on public.payment_terminals
  for select to authenticated
  using (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access());

drop policy if exists payment_terminals_member_write on public.payment_terminals;
create policy payment_terminals_member_write on public.payment_terminals
  for all to authenticated
  using (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access())
  with check (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access());

drop policy if exists payment_terminal_intents_member_select on public.payment_terminal_intents;
create policy payment_terminal_intents_member_select on public.payment_terminal_intents
  for select to authenticated
  using (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access());

drop policy if exists payment_terminal_intents_member_write on public.payment_terminal_intents;
create policy payment_terminal_intents_member_write on public.payment_terminal_intents
  for all to authenticated
  using (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access())
  with check (public.has_branch_access(tenant_id, branch_id) or public.has_platform_access());

comment on table public.payment_terminals is 'Branch payment terminals available for integrated POS payments. No provider secrets are stored here.';
comment on table public.payment_terminal_intents is 'Idempotent terminal payment requests that become payments after provider confirmation.';

insert into public.payment_terminals (
  tenant_id,
  branch_id,
  provider,
  provider_terminal_id,
  name,
  status,
  provider_metadata
)
select
  branches.tenant_id,
  branches.id,
  'MOCK_TERMINAL',
  'mock-' || branches.id::text,
  'Terminal simulado',
  'ACTIVE',
  jsonb_build_object('mode', 'auto_approve')
from public.branches
on conflict (tenant_id, provider, provider_terminal_id) do nothing;