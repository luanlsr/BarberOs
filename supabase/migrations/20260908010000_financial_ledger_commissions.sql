create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2)
);

create table if not exists public.recurring_expense_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  category_id uuid references public.expense_categories(id) on delete set null,
  description text not null,
  vendor_name text,
  amount_cents integer not null check (amount_cents > 0),
  frequency text not null check (frequency in ('WEEKLY', 'MONTHLY', 'YEARLY')),
  starts_on date not null,
  ends_on date,
  next_competence_date date not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(description)) >= 2),
  check (ends_on is null or starts_on <= ends_on),
  check (next_competence_date >= starts_on)
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  direction text not null check (direction in ('IN', 'OUT')),
  type text not null check (type in ('SERVICE_REVENUE', 'PRODUCT_REVENUE', 'EXPENSE', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT', 'OTHER')),
  status text not null default 'POSTED' check (status in ('POSTED', 'REVERSED', 'VOIDED')),
  amount_cents integer not null check (amount_cents > 0),
  signed_amount_cents integer not null,
  competence_date date not null,
  cash_date date,
  source_type text not null check (source_type in ('PAYMENT', 'REFUND', 'EXPENSE', 'COMMISSION_ACCRUAL', 'PAYOUT', 'CASH_MOVEMENT', 'MANUAL_ADJUSTMENT')),
  source_id uuid not null,
  category_id uuid references public.expense_categories(id) on delete set null,
  description text,
  idempotency_key text,
  reversed_entry_id uuid references public.financial_entries(id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (
    (direction = 'IN' and signed_amount_cents = amount_cents)
    or (direction = 'OUT' and signed_amount_cents = -amount_cents)
  ),
  check (char_length(trim(coalesce(description, 'ok'))) >= 2),
  check (status <> 'REVERSED' or reversed_entry_id is not null)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  category_id uuid references public.expense_categories(id) on delete set null,
  recurring_template_id uuid references public.recurring_expense_templates(id) on delete set null,
  description text not null,
  vendor_name text,
  status text not null default 'OPEN' check (status in ('OPEN', 'DUE', 'OVERDUE', 'PAID', 'CANCELLED')),
  amount_cents integer not null check (amount_cents > 0),
  competence_date date not null,
  due_date date,
  cash_date date,
  payment_method text check (payment_method in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')),
  recurrence_key text,
  document_metadata jsonb not null default '{}'::jsonb,
  financial_entry_id uuid references public.financial_entries(id) on delete restrict,
  cash_movement_id uuid references public.cash_movements(id) on delete restrict,
  idempotency_key text,
  payment_idempotency_key text,
  created_by uuid,
  updated_by uuid,
  paid_by uuid,
  paid_at timestamptz,
  cancelled_by uuid,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(description)) >= 2),
  check (status <> 'PAID' or (cash_date is not null and payment_method is not null and paid_by is not null and paid_at is not null and financial_entry_id is not null)),
  check (status <> 'CANCELLED' or (cancelled_by is not null and cancelled_at is not null))
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  scope text not null check (scope in ('TENANT_DEFAULT', 'PROFESSIONAL', 'SERVICE', 'PRODUCT', 'MANUAL_ITEM')),
  type text not null check (type in ('PERCENTAGE', 'FIXED_AMOUNT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  professional_id uuid references public.professionals(id) on delete cascade,
  source_type text check (source_type in ('SERVICE', 'PRODUCT', 'MANUAL')),
  source_id uuid,
  percentage_bps integer check (percentage_bps between 1 and 10000),
  fixed_amount_cents integer check (fixed_amount_cents > 0),
  effective_from date not null,
  effective_until date,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'PERCENTAGE' and percentage_bps is not null and fixed_amount_cents is null)
    or (type = 'FIXED_AMOUNT' and fixed_amount_cents is not null and percentage_bps is null)
  ),
  check (effective_until is null or effective_from <= effective_until),
  check (scope <> 'PROFESSIONAL' or professional_id is not null),
  check (scope not in ('SERVICE', 'PRODUCT', 'MANUAL_ITEM') or (source_type is not null and source_id is not null))
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'CLOSED', 'APPROVED', 'PAID', 'CANCELLED', 'CORRECTED')),
  period_start date not null,
  period_end date not null,
  total_amount_cents integer not null check (total_amount_cents > 0),
  payment_method text check (payment_method in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')),
  financial_entry_id uuid references public.financial_entries(id) on delete restrict,
  cash_movement_id uuid references public.cash_movements(id) on delete restrict,
  idempotency_key text,
  payment_idempotency_key text,
  correction_idempotency_key text,
  closed_by uuid,
  closed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  paid_by uuid,
  paid_at timestamptz,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end),
  check (status not in ('CLOSED', 'APPROVED', 'PAID') or (closed_by is not null and closed_at is not null)),
  check (status <> 'PAID' or (payment_method is not null and paid_by is not null and paid_at is not null and financial_entry_id is not null)),
  check (status <> 'CORRECTED' or char_length(trim(coalesce(correction_reason, ''))) >= 3)
);

create table if not exists public.commission_accruals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  rule_id uuid references public.commission_rules(id) on delete set null,
  rule_type_snapshot text not null check (rule_type_snapshot in ('PERCENTAGE', 'FIXED_AMOUNT')),
  rule_scope_snapshot text not null check (rule_scope_snapshot in ('TENANT_DEFAULT', 'PROFESSIONAL', 'SERVICE', 'PRODUCT', 'MANUAL_ITEM')),
  rule_percentage_bps_snapshot integer check (rule_percentage_bps_snapshot between 1 and 10000),
  rule_fixed_amount_cents_snapshot integer check (rule_fixed_amount_cents_snapshot > 0),
  base_amount_cents integer not null check (base_amount_cents > 0),
  commission_amount_cents integer not null check (commission_amount_cents > 0),
  status text not null default 'OPEN' check (status in ('OPEN', 'SETTLED', 'REVERSED', 'ADJUSTED')),
  accrued_at timestamptz not null default now(),
  reversed_accrual_id uuid references public.commission_accruals(id) on delete restrict,
  payout_id uuid references public.payouts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rule_type_snapshot = 'PERCENTAGE' and rule_percentage_bps_snapshot is not null and rule_fixed_amount_cents_snapshot is null)
    or (rule_type_snapshot = 'FIXED_AMOUNT' and rule_fixed_amount_cents_snapshot is not null and rule_percentage_bps_snapshot is null)
  ),
  check (status <> 'REVERSED' or reversed_accrual_id is not null),
  check (status <> 'SETTLED' or payout_id is not null)
);

create table if not exists public.payout_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  payout_id uuid not null references public.payouts(id) on delete cascade,
  accrual_id uuid not null references public.commission_accruals(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, payout_id, accrual_id)
);

create index if not exists expense_categories_tenant_branch_status_idx on public.expense_categories (tenant_id, branch_id, status);
create unique index if not exists expense_categories_tenant_branch_name_idx on public.expense_categories (tenant_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index if not exists recurring_expense_templates_tenant_branch_next_idx on public.recurring_expense_templates (tenant_id, branch_id, next_competence_date) where active;
create index if not exists recurring_expense_templates_category_idx on public.recurring_expense_templates (tenant_id, category_id) where category_id is not null;
create index if not exists financial_entries_tenant_branch_competence_idx on public.financial_entries (tenant_id, branch_id, competence_date desc, created_at desc);
create index if not exists financial_entries_tenant_branch_cash_idx on public.financial_entries (tenant_id, branch_id, cash_date desc, created_at desc) where cash_date is not null;
create index if not exists financial_entries_source_idx on public.financial_entries (tenant_id, source_type, source_id);
create index if not exists financial_entries_category_idx on public.financial_entries (tenant_id, category_id, competence_date desc) where category_id is not null;
create index if not exists expenses_tenant_branch_status_idx on public.expenses (tenant_id, branch_id, status, due_date);
create index if not exists expenses_tenant_branch_competence_idx on public.expenses (tenant_id, branch_id, competence_date desc);
create index if not exists expenses_category_idx on public.expenses (tenant_id, category_id, competence_date desc) where category_id is not null;
create index if not exists expenses_financial_entry_idx on public.expenses (tenant_id, financial_entry_id) where financial_entry_id is not null;
create index if not exists commission_rules_tenant_branch_status_idx on public.commission_rules (tenant_id, branch_id, status, effective_from desc);
create index if not exists commission_rules_professional_idx on public.commission_rules (tenant_id, professional_id, status, effective_from desc) where professional_id is not null;
create index if not exists commission_rules_source_idx on public.commission_rules (tenant_id, source_type, source_id, status, effective_from desc) where source_id is not null;
create index if not exists payouts_tenant_branch_professional_status_idx on public.payouts (tenant_id, branch_id, professional_id, status, period_start desc);
create index if not exists payouts_period_idx on public.payouts (tenant_id, branch_id, period_start, period_end);
create index if not exists payouts_financial_entry_idx on public.payouts (tenant_id, financial_entry_id) where financial_entry_id is not null;
create index if not exists commission_accruals_tenant_branch_professional_status_idx on public.commission_accruals (tenant_id, branch_id, professional_id, status, accrued_at desc);
create index if not exists commission_accruals_order_item_idx on public.commission_accruals (tenant_id, order_id, order_item_id);
create index if not exists commission_accruals_payment_idx on public.commission_accruals (tenant_id, payment_id) where payment_id is not null;
create index if not exists commission_accruals_payout_idx on public.commission_accruals (tenant_id, payout_id) where payout_id is not null;
create index if not exists payout_allocations_payout_idx on public.payout_allocations (tenant_id, payout_id);
create index if not exists payout_allocations_accrual_idx on public.payout_allocations (tenant_id, accrual_id);
create unique index if not exists financial_entries_idempotency_idx on public.financial_entries (tenant_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists financial_entries_source_unique_idx on public.financial_entries (tenant_id, source_type, source_id, type, direction) where status = 'POSTED';
create unique index if not exists expenses_idempotency_idx on public.expenses (tenant_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists expenses_payment_idempotency_idx on public.expenses (tenant_id, payment_idempotency_key) where payment_idempotency_key is not null;
create unique index if not exists commission_accruals_source_item_unique_idx on public.commission_accruals (tenant_id, order_item_id) where reversed_accrual_id is null;
create unique index if not exists payouts_idempotency_idx on public.payouts (tenant_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists payouts_payment_idempotency_idx on public.payouts (tenant_id, payment_idempotency_key) where payment_idempotency_key is not null;
create unique index if not exists payouts_correction_idempotency_idx on public.payouts (tenant_id, correction_idempotency_key) where correction_idempotency_key is not null;
create or replace function public.has_money_management_access(target_tenant uuid, target_branch uuid)
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
      and m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER', 'FINANCE')
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

create or replace function public.has_professional_wallet_access(target_tenant uuid, target_branch uuid, target_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.professionals p on p.tenant_id = m.tenant_id
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.status = 'ACTIVE'
      and m.role = 'PROFESSIONAL'
      and p.id = target_professional
      and p.status = 'ACTIVE'
      and lower(coalesce(p.email, '')) = lower(coalesce(auth.jwt()->>'email', ''))
      and exists (
        select 1
        from public.membership_branches mb
        join public.branches b on b.id = mb.branch_id and b.tenant_id = m.tenant_id
        where mb.membership_id = m.id
          and mb.branch_id = target_branch
          and b.status = 'ACTIVE'
      )
  );
$$;

alter table public.expense_categories enable row level security;
alter table public.recurring_expense_templates enable row level security;
alter table public.financial_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.commission_rules enable row level security;
alter table public.payouts enable row level security;
alter table public.commission_accruals enable row level security;
alter table public.payout_allocations enable row level security;

drop policy if exists expense_categories_money_select on public.expense_categories;
create policy expense_categories_money_select on public.expense_categories for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists expense_categories_money_write on public.expense_categories;
create policy expense_categories_money_write on public.expense_categories for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists recurring_expense_templates_money_select on public.recurring_expense_templates;
create policy recurring_expense_templates_money_select on public.recurring_expense_templates for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists recurring_expense_templates_money_write on public.recurring_expense_templates;
create policy recurring_expense_templates_money_write on public.recurring_expense_templates for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists financial_entries_money_select on public.financial_entries;
create policy financial_entries_money_select on public.financial_entries for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists financial_entries_money_write on public.financial_entries;
create policy financial_entries_money_write on public.financial_entries for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists expenses_money_select on public.expenses;
create policy expenses_money_select on public.expenses for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists expenses_money_write on public.expenses;
create policy expenses_money_write on public.expenses for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists commission_rules_money_select on public.commission_rules;
create policy commission_rules_money_select on public.commission_rules for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists commission_rules_money_write on public.commission_rules;
create policy commission_rules_money_write on public.commission_rules for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists payouts_money_select on public.payouts;
create policy payouts_money_select on public.payouts for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists payouts_professional_wallet_select on public.payouts;
create policy payouts_professional_wallet_select on public.payouts for select to authenticated using (public.has_professional_wallet_access(tenant_id, branch_id, professional_id));
drop policy if exists payouts_money_write on public.payouts;
create policy payouts_money_write on public.payouts for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists commission_accruals_money_select on public.commission_accruals;
create policy commission_accruals_money_select on public.commission_accruals for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists commission_accruals_professional_wallet_select on public.commission_accruals;
create policy commission_accruals_professional_wallet_select on public.commission_accruals for select to authenticated using (public.has_professional_wallet_access(tenant_id, branch_id, professional_id));
drop policy if exists commission_accruals_money_write on public.commission_accruals;
create policy commission_accruals_money_write on public.commission_accruals for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));

drop policy if exists payout_allocations_money_select on public.payout_allocations;
create policy payout_allocations_money_select on public.payout_allocations for select to authenticated using (public.has_money_management_access(tenant_id, branch_id));
drop policy if exists payout_allocations_professional_wallet_select on public.payout_allocations;
create policy payout_allocations_professional_wallet_select on public.payout_allocations for select to authenticated using (
  exists (
    select 1
    from public.payouts p
    where p.id = payout_id
      and p.tenant_id = tenant_id
      and p.branch_id = branch_id
      and public.has_professional_wallet_access(p.tenant_id, p.branch_id, p.professional_id)
  )
);
drop policy if exists payout_allocations_money_write on public.payout_allocations;
create policy payout_allocations_money_write on public.payout_allocations for all to authenticated using (public.has_money_management_access(tenant_id, branch_id)) with check (public.has_money_management_access(tenant_id, branch_id));
create or replace function public.record_payment_finance_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_payment_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_entry_id uuid;
  v_entry_type text;
begin
  select id into v_entry_id
    from public.financial_entries
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_payment
    from public.payments
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and order_id = p_order_id
     and id = p_payment_id
   for update;

  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;

  if v_payment.status not in ('PAID', 'PARTIALLY_REFUNDED') then
    raise exception 'Payment is not posted.' using errcode = 'P0001';
  end if;

  select * into v_order
    from public.orders
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_order_id
   for update;

  if not found then
    raise exception 'Order was not found.' using errcode = 'P0002';
  end if;

  select case
      when exists (
        select 1 from public.order_items oi
        where oi.tenant_id = p_tenant_id
          and oi.branch_id = p_branch_id
          and oi.order_id = p_order_id
          and oi.source_type = 'PRODUCT'
      ) then 'PRODUCT_REVENUE'
      else 'SERVICE_REVENUE'
    end into v_entry_type;

  insert into public.financial_entries (
    tenant_id,
    branch_id,
    direction,
    type,
    status,
    amount_cents,
    signed_amount_cents,
    competence_date,
    cash_date,
    source_type,
    source_id,
    description,
    idempotency_key,
    created_by
  ) values (
    p_tenant_id,
    p_branch_id,
    'IN',
    v_entry_type,
    'POSTED',
    v_payment.amount_cents,
    v_payment.amount_cents,
    v_payment.received_at::date,
    v_payment.received_at::date,
    'PAYMENT',
    p_payment_id,
    'Paid Comanda revenue',
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

create or replace function public.record_refund_finance_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_refund_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_refund public.payment_refunds%rowtype;
  v_entry_id uuid;
begin
  select id into v_entry_id
    from public.financial_entries
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_refund
    from public.payment_refunds
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_refund_id
   for update;

  if not found then
    raise exception 'Refund was not found.' using errcode = 'P0002';
  end if;

  if v_refund.status <> 'COMPLETED' then
    raise exception 'Refund is not completed.' using errcode = 'P0001';
  end if;

  insert into public.financial_entries (
    tenant_id,
    branch_id,
    direction,
    type,
    status,
    amount_cents,
    signed_amount_cents,
    competence_date,
    cash_date,
    source_type,
    source_id,
    description,
    idempotency_key,
    created_by
  ) values (
    p_tenant_id,
    p_branch_id,
    'OUT',
    'REFUND',
    'POSTED',
    v_refund.amount_cents,
    -v_refund.amount_cents,
    v_refund.refunded_at::date,
    v_refund.refunded_at::date,
    'REFUND',
    p_refund_id,
    'Payment refund reversal',
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;


create or replace function public.record_payment_commission_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_payment_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $barberos_money_effects$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_rule public.commission_rules%rowtype;
  v_commission_amount_cents integer;
  v_created_count integer := 0;
begin
  select * into v_payment
    from public.payments
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and order_id = p_order_id
     and id = p_payment_id
   for update;

  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;

  if v_payment.status not in ('PAID', 'PARTIALLY_REFUNDED') then
    raise exception 'Payment is not posted.' using errcode = 'P0001';
  end if;

  select * into v_order
    from public.orders
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_order_id
   for update;

  if not found then
    raise exception 'Order was not found.' using errcode = 'P0002';
  end if;

  if v_order.status <> 'PAID' then
    return 0;
  end if;

  for v_item in
    select *
      from public.order_items
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and order_id = p_order_id
       and professional_id is not null
       and final_amount_cents > 0
     order by created_at, id
  loop
    if exists (
      select 1
        from public.commission_accruals ca
       where ca.tenant_id = p_tenant_id
         and ca.order_item_id = v_item.id
         and ca.reversed_accrual_id is null
    ) then
      continue;
    end if;

    select * into v_rule
      from public.commission_rules cr
     where cr.tenant_id = p_tenant_id
       and cr.status = 'ACTIVE'
       and (cr.branch_id is null or cr.branch_id = p_branch_id)
       and (cr.professional_id is null or cr.professional_id = v_item.professional_id)
       and cr.effective_from <= v_payment.received_at::date
       and (cr.effective_until is null or cr.effective_until >= v_payment.received_at::date)
       and (
         cr.scope = 'TENANT_DEFAULT'
         or (cr.scope = 'PROFESSIONAL' and cr.professional_id = v_item.professional_id)
         or (
           cr.scope = 'SERVICE'
           and v_item.source_type = 'SERVICE'
           and cr.source_type = 'SERVICE'
           and cr.source_id = v_item.source_id
         )
         or (
           cr.scope = 'PRODUCT'
           and v_item.source_type = 'PRODUCT'
           and cr.source_type = 'PRODUCT'
           and cr.source_id = v_item.source_id
         )
         or (
           cr.scope = 'MANUAL_ITEM'
           and v_item.source_type = 'MANUAL'
           and cr.source_type = 'MANUAL'
           and cr.source_id = v_item.source_id
         )
       )
     order by
       (
         case
           when cr.scope in ('SERVICE', 'PRODUCT', 'MANUAL_ITEM') and cr.source_id is not null then 300
           when cr.scope in ('SERVICE', 'PRODUCT', 'MANUAL_ITEM') then 250
           when cr.scope = 'PROFESSIONAL' then 200
           when cr.scope = 'TENANT_DEFAULT' then 100
           else 0
         end
         + case when cr.professional_id is not null then 20 else 0 end
         + case when cr.branch_id = p_branch_id then 10 else 0 end
       ) desc,
       cr.effective_from desc,
       cr.id asc
     limit 1;

    if not found then
      continue;
    end if;

    v_commission_amount_cents := case
      when v_rule.type = 'FIXED_AMOUNT' then coalesce(v_rule.fixed_amount_cents, 0)
      else ((v_item.final_amount_cents * coalesce(v_rule.percentage_bps, 0) + 5000) / 10000)::integer
    end;

    if v_commission_amount_cents <= 0 then
      continue;
    end if;

    insert into public.commission_accruals (
      tenant_id,
      branch_id,
      professional_id,
      order_id,
      order_item_id,
      payment_id,
      rule_id,
      rule_type_snapshot,
      rule_scope_snapshot,
      rule_percentage_bps_snapshot,
      rule_fixed_amount_cents_snapshot,
      base_amount_cents,
      commission_amount_cents,
      status,
      accrued_at
    ) values (
      p_tenant_id,
      p_branch_id,
      v_item.professional_id,
      p_order_id,
      v_item.id,
      p_payment_id,
      v_rule.id,
      v_rule.type,
      v_rule.scope,
      case when v_rule.type = 'PERCENTAGE' then v_rule.percentage_bps else null end,
      case when v_rule.type = 'FIXED_AMOUNT' then v_rule.fixed_amount_cents else null end,
      v_item.final_amount_cents,
      v_commission_amount_cents,
      'OPEN',
      v_payment.received_at
    ) on conflict do nothing;

    if found then
      v_created_count := v_created_count + 1;
    end if;
  end loop;

  return v_created_count;
end;
$barberos_money_effects$;

create or replace function public.record_refund_commission_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_payment_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $barberos_money_effects$
declare
  v_payment public.payments%rowtype;
  v_accrual public.commission_accruals%rowtype;
  v_created_count integer := 0;
begin
  select * into v_payment
    from public.payments
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and order_id = p_order_id
     and id = p_payment_id
   for update;

  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;

  for v_accrual in
    select *
      from public.commission_accruals ca
     where ca.tenant_id = p_tenant_id
       and ca.branch_id = p_branch_id
       and ca.order_id = p_order_id
       and ca.reversed_accrual_id is null
       and ca.status <> 'REVERSED'
       and (ca.payment_id is null or ca.payment_id = p_payment_id)
       and not exists (
         select 1
           from public.commission_accruals reversal
          where reversal.tenant_id = p_tenant_id
            and reversal.reversed_accrual_id = ca.id
       )
     order by ca.accrued_at, ca.id
  loop
    insert into public.commission_accruals (
      tenant_id,
      branch_id,
      professional_id,
      order_id,
      order_item_id,
      payment_id,
      rule_id,
      rule_type_snapshot,
      rule_scope_snapshot,
      rule_percentage_bps_snapshot,
      rule_fixed_amount_cents_snapshot,
      base_amount_cents,
      commission_amount_cents,
      status,
      accrued_at,
      reversed_accrual_id
    ) values (
      p_tenant_id,
      p_branch_id,
      v_accrual.professional_id,
      p_order_id,
      v_accrual.order_item_id,
      p_payment_id,
      v_accrual.rule_id,
      v_accrual.rule_type_snapshot,
      v_accrual.rule_scope_snapshot,
      v_accrual.rule_percentage_bps_snapshot,
      v_accrual.rule_fixed_amount_cents_snapshot,
      v_accrual.base_amount_cents,
      v_accrual.commission_amount_cents,
      'REVERSED',
      now(),
      v_accrual.id
    );

    v_created_count := v_created_count + 1;
  end loop;

  return v_created_count;
end;
$barberos_money_effects$;

create or replace function public.receive_order_payment_with_money_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_actor_id uuid,
  p_idempotency_key text,
  p_payments jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $barberos_money_effects$
declare
  v_payment public.payments%rowtype;
begin
  perform public.receive_order_payment(
    p_tenant_id,
    p_branch_id,
    p_order_id,
    p_actor_id,
    p_idempotency_key,
    p_payments,
    p_notes
  );

  for v_payment in
    select *
      from public.payments
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and order_id = p_order_id
       and idempotency_key like nullif(p_idempotency_key, '') || ':%'
     order by received_at, id
  loop
    perform public.record_payment_finance_effects(
      p_tenant_id,
      p_branch_id,
      p_order_id,
      v_payment.id,
      p_actor_id,
      nullif(p_idempotency_key, '') || ':finance:' || v_payment.id::text
    );
    perform public.record_payment_commission_effects(
      p_tenant_id,
      p_branch_id,
      p_order_id,
      v_payment.id,
      p_actor_id,
      nullif(p_idempotency_key, '') || ':commission:' || v_payment.id::text
    );
  end loop;

  return p_order_id;
end;
$barberos_money_effects$;

create or replace function public.refund_payment_with_money_effects(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_payment_id uuid,
  p_actor_id uuid,
  p_amount_cents integer,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $barberos_money_effects$
declare
  v_refund public.payment_refunds%rowtype;
begin
  perform public.refund_payment(
    p_tenant_id,
    p_branch_id,
    p_payment_id,
    p_actor_id,
    p_amount_cents,
    p_reason,
    p_idempotency_key
  );

  select * into v_refund
    from public.payment_refunds
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and payment_id = p_payment_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if not found then
    raise exception 'Refund was not found.' using errcode = 'P0002';
  end if;

  perform public.record_refund_finance_effects(
    p_tenant_id,
    p_branch_id,
    v_refund.id,
    p_actor_id,
    nullif(p_idempotency_key, '') || ':finance'
  );
  perform public.record_refund_commission_effects(
    p_tenant_id,
    p_branch_id,
    v_refund.order_id,
    p_payment_id,
    p_actor_id,
    nullif(p_idempotency_key, '') || ':commission'
  );

  return v_refund.id;
end;
$barberos_money_effects$;

create or replace function public.pay_expense(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_expense_id uuid,
  p_actor_id uuid,
  p_payment_method text,
  p_cash_date date,
  p_cash_session_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense public.expenses%rowtype;
  v_session public.cash_register_sessions%rowtype;
  v_entry_id uuid;
  v_cash_movement_id uuid;
begin
  select financial_entry_id into v_entry_id
    from public.expenses
   where tenant_id = p_tenant_id
     and payment_idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_expense
    from public.expenses
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_expense_id
   for update;

  if not found then
    raise exception 'Expense was not found.' using errcode = 'P0002';
  end if;

  if v_expense.status = 'PAID' then
    raise exception 'Paid expenses cannot be paid again.' using errcode = 'P0001';
  end if;

  if v_expense.status = 'CANCELLED' then
    raise exception 'Cancelled expenses cannot be paid.' using errcode = 'P0001';
  end if;

  if p_payment_method not in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER') then
    raise exception 'Unsupported expense payment method.' using errcode = 'P0001';
  end if;

  if p_cash_date is null then
    raise exception 'Expense cash date is required.' using errcode = 'P0001';
  end if;

  if p_payment_method = 'CASH' then
    select * into v_session
      from public.cash_register_sessions
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and status = 'OPEN'
       and (p_cash_session_id is null or id = p_cash_session_id)
     for update;

    if not found then
      raise exception 'Cash register session is not open.' using errcode = 'P0002';
    end if;
  end if;

  insert into public.financial_entries (
    tenant_id,
    branch_id,
    direction,
    type,
    status,
    amount_cents,
    signed_amount_cents,
    competence_date,
    cash_date,
    source_type,
    source_id,
    category_id,
    description,
    idempotency_key,
    created_by
  ) values (
    p_tenant_id,
    p_branch_id,
    'OUT',
    'EXPENSE',
    'POSTED',
    v_expense.amount_cents,
    -v_expense.amount_cents,
    v_expense.competence_date,
    p_cash_date,
    'EXPENSE',
    p_expense_id,
    v_expense.category_id,
    v_expense.description,
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_entry_id;

  if p_payment_method = 'CASH' then
    insert into public.cash_movements (
      tenant_id,
      branch_id,
      session_id,
      type,
      amount_cents,
      signed_amount_cents,
      idempotency_key,
      reason,
      created_by
    ) values (
      p_tenant_id,
      p_branch_id,
      v_session.id,
      'EXPENSE',
      v_expense.amount_cents,
      -v_expense.amount_cents,
      nullif(p_idempotency_key, '') || ':cash',
      v_expense.description,
      p_actor_id
    ) returning id into v_cash_movement_id;

    update public.cash_register_sessions
       set expected_balance_amount_cents = expected_balance_amount_cents - v_expense.amount_cents,
           updated_at = now()
     where id = v_session.id;
  end if;

  update public.expenses
     set status = 'PAID',
         cash_date = p_cash_date,
         payment_method = p_payment_method,
         financial_entry_id = v_entry_id,
         cash_movement_id = v_cash_movement_id,
         payment_idempotency_key = nullif(p_idempotency_key, ''),
         paid_by = p_actor_id,
         paid_at = now(),
         updated_by = p_actor_id,
         updated_at = now()
   where id = v_expense.id;

  return v_entry_id;
end;
$$;

create or replace function public.close_professional_payout(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_professional_id uuid,
  p_period_start date,
  p_period_end date,
  p_actor_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payout_id uuid;
  v_accrual public.commission_accruals%rowtype;
  v_total_amount_cents integer := 0;
begin
  select id into v_payout_id
    from public.payouts
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_payout_id is not null then
    return v_payout_id;
  end if;

  if p_period_start > p_period_end then
    raise exception 'Payout period is invalid.' using errcode = 'P0001';
  end if;

  for v_accrual in
    select *
      from public.commission_accruals
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and professional_id = p_professional_id
       and status = 'OPEN'
       and accrued_at::date between p_period_start and p_period_end
     for update
  loop
    v_total_amount_cents := v_total_amount_cents + v_accrual.commission_amount_cents;
  end loop;

  if v_total_amount_cents <= 0 then
    raise exception 'No open commission accruals for payout.' using errcode = 'P0002';
  end if;

  insert into public.payouts (
    tenant_id,
    branch_id,
    professional_id,
    status,
    period_start,
    period_end,
    total_amount_cents,
    idempotency_key,
    closed_by,
    closed_at
  ) values (
    p_tenant_id,
    p_branch_id,
    p_professional_id,
    'CLOSED',
    p_period_start,
    p_period_end,
    v_total_amount_cents,
    nullif(p_idempotency_key, ''),
    p_actor_id,
    now()
  ) returning id into v_payout_id;

  for v_accrual in
    select *
      from public.commission_accruals
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and professional_id = p_professional_id
       and status = 'OPEN'
       and accrued_at::date between p_period_start and p_period_end
     for update
  loop
    insert into public.payout_allocations (
      tenant_id,
      branch_id,
      payout_id,
      accrual_id,
      amount_cents
    ) values (
      p_tenant_id,
      p_branch_id,
      v_payout_id,
      v_accrual.id,
      v_accrual.commission_amount_cents
    );

    update public.commission_accruals
       set status = 'SETTLED',
           payout_id = v_payout_id,
           updated_at = now()
     where id = v_accrual.id;
  end loop;

  return v_payout_id;
end;
$$;

create or replace function public.pay_professional_payout(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_payout_id uuid,
  p_actor_id uuid,
  p_payment_method text,
  p_cash_session_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payout public.payouts%rowtype;
  v_session public.cash_register_sessions%rowtype;
  v_entry_id uuid;
  v_cash_movement_id uuid;
begin
  select financial_entry_id into v_entry_id
    from public.payouts
   where tenant_id = p_tenant_id
     and payment_idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_payout
    from public.payouts
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_payout_id
   for update;

  if not found then
    raise exception 'Payout was not found.' using errcode = 'P0002';
  end if;

  if v_payout.status not in ('CLOSED', 'APPROVED') then
    raise exception 'Payout cannot be paid from its current status.' using errcode = 'P0001';
  end if;

  if p_payment_method not in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER') then
    raise exception 'Unsupported payout payment method.' using errcode = 'P0001';
  end if;

  if p_payment_method = 'CASH' then
    select * into v_session
      from public.cash_register_sessions
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and status = 'OPEN'
       and (p_cash_session_id is null or id = p_cash_session_id)
     for update;

    if not found then
      raise exception 'Cash register session is not open.' using errcode = 'P0002';
    end if;
  end if;

  insert into public.financial_entries (
    tenant_id,
    branch_id,
    direction,
    type,
    status,
    amount_cents,
    signed_amount_cents,
    competence_date,
    cash_date,
    source_type,
    source_id,
    description,
    idempotency_key,
    created_by
  ) values (
    p_tenant_id,
    p_branch_id,
    'OUT',
    'PAYOUT',
    'POSTED',
    v_payout.total_amount_cents,
    -v_payout.total_amount_cents,
    v_payout.period_end,
    now()::date,
    'PAYOUT',
    p_payout_id,
    'Professional payout payment',
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_entry_id;

  if p_payment_method = 'CASH' then
    insert into public.cash_movements (
      tenant_id,
      branch_id,
      session_id,
      type,
      amount_cents,
      signed_amount_cents,
      idempotency_key,
      reason,
      created_by
    ) values (
      p_tenant_id,
      p_branch_id,
      v_session.id,
      'EXPENSE',
      v_payout.total_amount_cents,
      -v_payout.total_amount_cents,
      nullif(p_idempotency_key, '') || ':cash',
      'Professional payout payment',
      p_actor_id
    ) returning id into v_cash_movement_id;

    update public.cash_register_sessions
       set expected_balance_amount_cents = expected_balance_amount_cents - v_payout.total_amount_cents,
           updated_at = now()
     where id = v_session.id;
  end if;

  update public.payouts
     set status = 'PAID',
         payment_method = p_payment_method,
         financial_entry_id = v_entry_id,
         cash_movement_id = v_cash_movement_id,
         payment_idempotency_key = nullif(p_idempotency_key, ''),
         paid_by = p_actor_id,
         paid_at = now(),
         updated_at = now()
   where id = v_payout.id;

  return v_entry_id;
end;
$$;
