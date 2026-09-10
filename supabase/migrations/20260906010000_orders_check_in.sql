create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT', 'CANCELLED')),
  subtotal_amount_cents integer not null default 0 check (subtotal_amount_cents >= 0),
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),
  notes text,
  idempotency_key text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount_cents <= subtotal_amount_cents),
  check (total_amount_cents = subtotal_amount_cents - discount_amount_cents),
  unique (tenant_id, idempotency_key),
  unique (appointment_id)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  source_type text not null check (source_type in ('SERVICE', 'PRODUCT', 'MANUAL')),
  source_id uuid,
  name_snapshot text not null,
  quantity integer not null default 1 check (quantity between 1 and 999),
  unit_price_amount_cents integer not null check (unit_price_amount_cents >= 0),
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  final_amount_cents integer not null check (final_amount_cents >= 0),
  professional_id uuid references public.professionals(id) on delete set null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (char_length(trim(name_snapshot)) >= 2),
  check (discount_amount_cents <= quantity * unit_price_amount_cents),
  check (final_amount_cents = quantity * unit_price_amount_cents - discount_amount_cents)
);

create table if not exists public.order_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('ORDER_CREATED', 'CHECK_IN', 'STATUS_CHANGED', 'ITEM_ADDED', 'ITEM_UPDATED', 'ITEM_REMOVED')),
  actor_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_tenant_branch_status_idx on public.orders (tenant_id, branch_id, status, opened_at desc);
create index if not exists orders_customer_idx on public.orders (tenant_id, customer_id, opened_at desc);
create index if not exists orders_professional_idx on public.orders (tenant_id, branch_id, professional_id, opened_at desc);
create index if not exists orders_appointment_idx on public.orders (tenant_id, appointment_id) where appointment_id is not null;
create index if not exists orders_idempotency_idx on public.orders (tenant_id, idempotency_key) where idempotency_key is not null;
create index if not exists order_items_order_idx on public.order_items (tenant_id, order_id, created_at);
create index if not exists order_items_source_idx on public.order_items (tenant_id, source_type, source_id) where source_id is not null;
create index if not exists order_history_lookup_idx on public.order_history (tenant_id, order_id, created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_history enable row level security;

drop policy if exists orders_member_select on public.orders;
create policy orders_member_select on public.orders for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists orders_member_write on public.orders;
create policy orders_member_write on public.orders for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists order_items_member_select on public.order_items;
create policy order_items_member_select on public.order_items for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists order_items_member_write on public.order_items;
create policy order_items_member_write on public.order_items for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists order_history_member_select on public.order_history;
create policy order_history_member_select on public.order_history for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists order_history_member_insert on public.order_history;
create policy order_history_member_insert on public.order_history for insert to authenticated with check (public.has_branch_access(tenant_id, branch_id));


create or replace function public.check_in_appointment_order(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_appointment_id uuid,
  p_actor_id uuid,
  p_idempotency_key text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_order_id uuid;
  v_subtotal_amount_cents integer;
begin
  select *
    into v_appointment
    from public.appointments
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_appointment_id
   for update;

  if not found then
    raise exception 'Appointment was not found.' using errcode = 'P0002';
  end if;

  select id
    into v_order_id
    from public.orders
   where tenant_id = p_tenant_id
     and appointment_id = p_appointment_id;

  if v_order_id is not null then
    return v_order_id;
  end if;

  if v_appointment.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'Appointment cannot be checked in from its current status.' using errcode = 'P0001';
  end if;

  select coalesce(sum(price_cents), 0)::integer
    into v_subtotal_amount_cents
    from public.appointment_services
   where tenant_id = p_tenant_id
     and appointment_id = p_appointment_id;

  insert into public.orders (
    tenant_id,
    branch_id,
    appointment_id,
    customer_id,
    professional_id,
    status,
    subtotal_amount_cents,
    discount_amount_cents,
    total_amount_cents,
    notes,
    idempotency_key,
    created_by,
    updated_by
  ) values (
    p_tenant_id,
    p_branch_id,
    p_appointment_id,
    v_appointment.customer_id,
    v_appointment.professional_id,
    'OPEN',
    v_subtotal_amount_cents,
    0,
    v_subtotal_amount_cents,
    p_notes,
    nullif(p_idempotency_key, ''),
    p_actor_id,
    p_actor_id
  )
  returning id into v_order_id;

  insert into public.order_items (
    tenant_id,
    branch_id,
    order_id,
    source_type,
    source_id,
    name_snapshot,
    quantity,
    unit_price_amount_cents,
    discount_amount_cents,
    final_amount_cents,
    professional_id,
    created_by
  )
  select
    p_tenant_id,
    p_branch_id,
    v_order_id,
    'SERVICE',
    service_id,
    service_name,
    1,
    price_cents,
    0,
    price_cents,
    v_appointment.professional_id,
    p_actor_id
  from public.appointment_services
  where tenant_id = p_tenant_id
    and appointment_id = p_appointment_id
  order by sequence;

  update public.appointments
     set status = 'CHECKED_IN',
         updated_by = p_actor_id,
         updated_at = now()
   where tenant_id = p_tenant_id
     and id = p_appointment_id;

  insert into public.appointment_status_history (
    tenant_id,
    appointment_id,
    previous_status,
    next_status,
    actor_id,
    reason
  ) values (
    p_tenant_id,
    p_appointment_id,
    v_appointment.status,
    'CHECKED_IN',
    p_actor_id,
    p_notes
  );

  return v_order_id;
end;
$$;
