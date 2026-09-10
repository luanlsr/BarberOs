alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT', 'PAID', 'CANCELLED'));

alter table public.order_history drop constraint if exists order_history_event_type_check;
alter table public.order_history add constraint order_history_event_type_check check (event_type in ('ORDER_CREATED', 'CHECK_IN', 'STATUS_CHANGED', 'ITEM_ADDED', 'ITEM_UPDATED', 'ITEM_REMOVED', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED', 'ORDER_PAID'));

create table if not exists public.cash_register_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  opening_balance_amount_cents integer not null default 0 check (opening_balance_amount_cents >= 0),
  expected_balance_amount_cents integer not null default 0 check (expected_balance_amount_cents >= 0),
  actual_balance_amount_cents integer check (actual_balance_amount_cents >= 0),
  difference_amount_cents integer not null default 0,
  idempotency_key text,
  opened_by uuid,
  opened_at timestamptz not null default now(),
  closed_by uuid,
  closed_at timestamptz,
  closing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'CLOSED' or (closed_by is not null and closed_at is not null))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  method text not null check (method in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')),
  status text not null default 'PAID' check (status in ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  amount_cents integer not null check (amount_cents > 0),
  cash_received_amount_cents integer check (cash_received_amount_cents >= 0),
  change_due_amount_cents integer not null default 0 check (change_due_amount_cents >= 0),
  external_reference text,
  idempotency_key text,
  received_by uuid,
  received_at timestamptz not null default now(),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refunded_amount_cents <= amount_cents),
  check (method = 'CASH' or (cash_received_amount_cents is null and change_due_amount_cents = 0)),
  check (method <> 'CASH' or cash_received_amount_cents is null or cash_received_amount_cents >= amount_cents)
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  status text not null default 'COMPLETED' check (status in ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  amount_cents integer not null check (amount_cents > 0),
  reason text not null check (char_length(trim(reason)) >= 3),
  idempotency_key text,
  refunded_by uuid,
  refunded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  session_id uuid not null references public.cash_register_sessions(id) on delete restrict,
  type text not null check (type in ('OPENING_BALANCE', 'SALE', 'REFUND', 'WITHDRAWAL', 'CASH_IN', 'EXPENSE', 'ADJUSTMENT')),
  amount_cents integer not null check (amount_cents >= 0),
  signed_amount_cents integer not null,
  order_id uuid references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  idempotency_key text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (type not in ('WITHDRAWAL', 'CASH_IN', 'ADJUSTMENT') or char_length(trim(coalesce(reason, ''))) >= 3)
);

create index if not exists payments_tenant_branch_order_idx on public.payments (tenant_id, branch_id, order_id, received_at desc);
create index if not exists payments_status_idx on public.payments (tenant_id, branch_id, status, received_at desc);
create unique index if not exists payments_idempotency_idx on public.payments (tenant_id, idempotency_key) where idempotency_key is not null;
create index if not exists payment_allocations_order_idx on public.payment_allocations (tenant_id, order_id, created_at desc);
create index if not exists payment_allocations_payment_idx on public.payment_allocations (tenant_id, payment_id);
create index if not exists payment_refunds_payment_idx on public.payment_refunds (tenant_id, payment_id, refunded_at desc);
create unique index if not exists payment_refunds_idempotency_idx on public.payment_refunds (tenant_id, idempotency_key) where idempotency_key is not null;
create index if not exists cash_register_sessions_branch_status_idx on public.cash_register_sessions (tenant_id, branch_id, status, opened_at desc);
create unique index if not exists cash_register_sessions_one_open_per_branch_idx on public.cash_register_sessions (tenant_id, branch_id) where status = 'OPEN';
create unique index if not exists cash_register_sessions_idempotency_idx on public.cash_register_sessions (tenant_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists cash_register_sessions_closing_idempotency_idx on public.cash_register_sessions (tenant_id, closing_idempotency_key) where closing_idempotency_key is not null;
create index if not exists cash_movements_session_idx on public.cash_movements (tenant_id, branch_id, session_id, created_at desc);
create index if not exists cash_movements_order_payment_idx on public.cash_movements (tenant_id, order_id, payment_id) where order_id is not null or payment_id is not null;
create unique index if not exists cash_movements_idempotency_idx on public.cash_movements (tenant_id, idempotency_key) where idempotency_key is not null;

alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.cash_register_sessions enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists payments_member_select on public.payments;
create policy payments_member_select on public.payments for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists payments_member_write on public.payments;
create policy payments_member_write on public.payments for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists payment_allocations_member_select on public.payment_allocations;
create policy payment_allocations_member_select on public.payment_allocations for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists payment_allocations_member_write on public.payment_allocations;
create policy payment_allocations_member_write on public.payment_allocations for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists payment_refunds_member_select on public.payment_refunds;
create policy payment_refunds_member_select on public.payment_refunds for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists payment_refunds_member_write on public.payment_refunds;
create policy payment_refunds_member_write on public.payment_refunds for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists cash_register_sessions_member_select on public.cash_register_sessions;
create policy cash_register_sessions_member_select on public.cash_register_sessions for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists cash_register_sessions_member_write on public.cash_register_sessions;
create policy cash_register_sessions_member_write on public.cash_register_sessions for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

drop policy if exists cash_movements_member_select on public.cash_movements;
create policy cash_movements_member_select on public.cash_movements for select to authenticated using (public.has_branch_access(tenant_id, branch_id));
drop policy if exists cash_movements_member_write on public.cash_movements;
create policy cash_movements_member_write on public.cash_movements for all to authenticated using (public.has_branch_access(tenant_id, branch_id)) with check (public.has_branch_access(tenant_id, branch_id));

create or replace function public.open_cash_register_session(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_actor_id uuid,
  p_opening_balance_amount_cents integer,
  p_idempotency_key text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_opening_balance_amount_cents < 0 then
    raise exception 'Opening balance cannot be negative.' using errcode = 'P0001';
  end if;

  select id into v_session_id
    from public.cash_register_sessions
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  select id into v_session_id
    from public.cash_register_sessions
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and status = 'OPEN'
   limit 1;

  if v_session_id is not null then
    raise exception 'Cash register session is already open.' using errcode = 'P0001';
  end if;

  insert into public.cash_register_sessions (
    tenant_id,
    branch_id,
    status,
    opening_balance_amount_cents,
    expected_balance_amount_cents,
    idempotency_key,
    opened_by
  ) values (
    p_tenant_id,
    p_branch_id,
    'OPEN',
    p_opening_balance_amount_cents,
    p_opening_balance_amount_cents,
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_session_id;

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
    v_session_id,
    'OPENING_BALANCE',
    p_opening_balance_amount_cents,
    p_opening_balance_amount_cents,
    nullif(p_idempotency_key, '') || ':opening',
    p_notes,
    p_actor_id
  );

  return v_session_id;
end;
$$;

create or replace function public.record_cash_register_movement(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_actor_id uuid,
  p_type text,
  p_amount_cents integer,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session public.cash_register_sessions%rowtype;
  v_movement_id uuid;
  v_signed_amount_cents integer;
begin
  if p_type not in ('WITHDRAWAL', 'CASH_IN', 'ADJUSTMENT') then
    raise exception 'Unsupported cash movement type.' using errcode = 'P0001';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'Cash movement amount must be positive.' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cash movement reason is required.' using errcode = 'P0001';
  end if;

  select id into v_movement_id
    from public.cash_movements
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_movement_id is not null then
    return v_movement_id;
  end if;

  select * into v_session
    from public.cash_register_sessions
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and status = 'OPEN'
   for update;

  if not found then
    raise exception 'Cash register session is not open.' using errcode = 'P0002';
  end if;

  v_signed_amount_cents := case when p_type = 'WITHDRAWAL' then -p_amount_cents else p_amount_cents end;

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
    p_type,
    p_amount_cents,
    v_signed_amount_cents,
    nullif(p_idempotency_key, ''),
    p_reason,
    p_actor_id
  ) returning id into v_movement_id;

  update public.cash_register_sessions
     set expected_balance_amount_cents = expected_balance_amount_cents + v_signed_amount_cents,
         updated_at = now()
   where id = v_session.id;

  return v_movement_id;
end;
$$;

create or replace function public.receive_order_payment(
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
as $$
declare
  v_order public.orders%rowtype;
  v_session public.cash_register_sessions%rowtype;
  v_payment jsonb;
  v_payment_id uuid;
  v_idx integer := 0;
  v_amount_cents integer;
  v_cash_received_amount_cents integer;
  v_change_due_amount_cents integer;
  v_method text;
  v_total_new_amount_cents integer := 0;
  v_paid_amount_cents integer;
  v_idempotency_key text;
begin
  select id into v_payment_id
    from public.payments
   where tenant_id = p_tenant_id
     and idempotency_key like nullif(p_idempotency_key, '') || ':%'
   limit 1;

  if v_payment_id is not null then
    return p_order_id;
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

  if v_order.status not in ('OPEN', 'IN_SERVICE', 'READY_FOR_PAYMENT') then
    raise exception 'Order is not payable.' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'Payment lines are required.' using errcode = 'P0001';
  end if;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    v_method := v_payment->>'method';
    v_amount_cents := (v_payment->>'amountCents')::integer;
    v_cash_received_amount_cents := nullif(v_payment->>'cashReceivedAmountCents', '')::integer;

    if v_method not in ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER') then
      raise exception 'Unsupported payment method.' using errcode = 'P0001';
    end if;
    if v_amount_cents <= 0 then
      raise exception 'Payment amount must be positive.' using errcode = 'P0001';
    end if;
    if v_method <> 'CASH' and v_cash_received_amount_cents is not null then
      raise exception 'Only cash payments can include cash received.' using errcode = 'P0001';
    end if;
    if v_method = 'CASH' and v_cash_received_amount_cents is not null and v_cash_received_amount_cents < v_amount_cents then
      raise exception 'Cash received amount must cover payment amount.' using errcode = 'P0001';
    end if;

    v_total_new_amount_cents := v_total_new_amount_cents + v_amount_cents;
  end loop;

  select coalesce(sum(amount_cents - refunded_amount_cents), 0)::integer
    into v_paid_amount_cents
    from public.payments
   where tenant_id = p_tenant_id
     and order_id = p_order_id
     and status in ('PAID', 'PARTIALLY_REFUNDED');

  if v_paid_amount_cents + v_total_new_amount_cents > v_order.total_amount_cents then
    raise exception 'Payment exceeds amount due.' using errcode = 'P0001';
  end if;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    v_idx := v_idx + 1;
    v_method := v_payment->>'method';
    v_amount_cents := (v_payment->>'amountCents')::integer;
    v_cash_received_amount_cents := nullif(v_payment->>'cashReceivedAmountCents', '')::integer;
    v_change_due_amount_cents := greatest(coalesce(v_cash_received_amount_cents, v_amount_cents) - v_amount_cents, 0);
    v_idempotency_key := nullif(p_idempotency_key, '') || ':' || v_idx::text;

    insert into public.payments (
      tenant_id,
      branch_id,
      order_id,
      method,
      status,
      amount_cents,
      cash_received_amount_cents,
      change_due_amount_cents,
      external_reference,
      idempotency_key,
      received_by
    ) values (
      p_tenant_id,
      p_branch_id,
      p_order_id,
      v_method,
      'PAID',
      v_amount_cents,
      case when v_method = 'CASH' then v_cash_received_amount_cents else null end,
      case when v_method = 'CASH' then v_change_due_amount_cents else 0 end,
      v_payment->>'externalReference',
      v_idempotency_key,
      p_actor_id
    ) returning id into v_payment_id;

    insert into public.payment_allocations (
      tenant_id,
      branch_id,
      payment_id,
      order_id,
      amount_cents
    ) values (
      p_tenant_id,
      p_branch_id,
      v_payment_id,
      p_order_id,
      v_amount_cents
    );

    if v_method = 'CASH' then
      select * into v_session
        from public.cash_register_sessions
       where tenant_id = p_tenant_id
         and branch_id = p_branch_id
         and status = 'OPEN'
       for update;

      if not found then
        raise exception 'Cash register session is not open.' using errcode = 'P0002';
      end if;

      insert into public.cash_movements (
        tenant_id,
        branch_id,
        session_id,
        type,
        amount_cents,
        signed_amount_cents,
        order_id,
        payment_id,
        idempotency_key,
        reason,
        created_by
      ) values (
        p_tenant_id,
        p_branch_id,
        v_session.id,
        'SALE',
        v_amount_cents,
        v_amount_cents,
        p_order_id,
        v_payment_id,
        v_idempotency_key || ':cash',
        p_notes,
        p_actor_id
      );

      update public.cash_register_sessions
         set expected_balance_amount_cents = expected_balance_amount_cents + v_amount_cents,
             updated_at = now()
       where id = v_session.id;
    end if;
  end loop;

  if v_paid_amount_cents + v_total_new_amount_cents = v_order.total_amount_cents then
    update public.orders
       set status = 'PAID',
           closed_at = now(),
           updated_by = p_actor_id,
           updated_at = now()
     where id = v_order.id;

    insert into public.order_history (
      tenant_id,
      branch_id,
      order_id,
      event_type,
      actor_id,
      reason,
      metadata
    ) values (
      p_tenant_id,
      p_branch_id,
      p_order_id,
      'ORDER_PAID',
      p_actor_id,
      p_notes,
      jsonb_build_object('paid_amount_cents', v_paid_amount_cents + v_total_new_amount_cents)
    );
  else
    insert into public.order_history (
      tenant_id,
      branch_id,
      order_id,
      event_type,
      actor_id,
      reason,
      metadata
    ) values (
      p_tenant_id,
      p_branch_id,
      p_order_id,
      'PAYMENT_RECEIVED',
      p_actor_id,
      p_notes,
      jsonb_build_object('paid_amount_cents', v_paid_amount_cents + v_total_new_amount_cents)
    );
  end if;

  return p_order_id;
end;
$$;

create or replace function public.refund_payment(
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
as $$
declare
  v_payment public.payments%rowtype;
  v_refund_id uuid;
  v_session public.cash_register_sessions%rowtype;
  v_new_refunded_amount_cents integer;
begin
  select id into v_refund_id
    from public.payment_refunds
   where tenant_id = p_tenant_id
     and idempotency_key = nullif(p_idempotency_key, '')
   limit 1;

  if v_refund_id is not null then
    return v_refund_id;
  end if;

  if p_amount_cents <= 0 then
    raise exception 'Refund amount must be positive.' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Refund reason is required.' using errcode = 'P0001';
  end if;

  select * into v_payment
    from public.payments
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_payment_id
   for update;

  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;
  if v_payment.status not in ('PAID', 'PARTIALLY_REFUNDED') then
    raise exception 'Payment cannot be refunded from its current status.' using errcode = 'P0001';
  end if;
  if v_payment.refunded_amount_cents + p_amount_cents > v_payment.amount_cents then
    raise exception 'Refund amount exceeds refundable amount.' using errcode = 'P0001';
  end if;

  insert into public.payment_refunds (
    tenant_id,
    branch_id,
    payment_id,
    order_id,
    status,
    amount_cents,
    reason,
    idempotency_key,
    refunded_by
  ) values (
    p_tenant_id,
    p_branch_id,
    p_payment_id,
    v_payment.order_id,
    'COMPLETED',
    p_amount_cents,
    p_reason,
    nullif(p_idempotency_key, ''),
    p_actor_id
  ) returning id into v_refund_id;

  v_new_refunded_amount_cents := v_payment.refunded_amount_cents + p_amount_cents;

  update public.payments
     set refunded_amount_cents = v_new_refunded_amount_cents,
         status = case when v_new_refunded_amount_cents = amount_cents then 'REFUNDED' else 'PARTIALLY_REFUNDED' end,
         updated_at = now()
   where id = v_payment.id;

  if v_payment.method = 'CASH' then
    select * into v_session
      from public.cash_register_sessions
     where tenant_id = p_tenant_id
       and branch_id = p_branch_id
       and status = 'OPEN'
     for update;

    if not found then
      raise exception 'Cash register session is not open.' using errcode = 'P0002';
    end if;

    insert into public.cash_movements (
      tenant_id,
      branch_id,
      session_id,
      type,
      amount_cents,
      signed_amount_cents,
      order_id,
      payment_id,
      idempotency_key,
      reason,
      created_by
    ) values (
      p_tenant_id,
      p_branch_id,
      v_session.id,
      'REFUND',
      p_amount_cents,
      -p_amount_cents,
      v_payment.order_id,
      v_payment.id,
      nullif(p_idempotency_key, '') || ':cash',
      p_reason,
      p_actor_id
    );

    update public.cash_register_sessions
       set expected_balance_amount_cents = expected_balance_amount_cents - p_amount_cents,
           updated_at = now()
     where id = v_session.id;
  end if;

  insert into public.order_history (
    tenant_id,
    branch_id,
    order_id,
    event_type,
    actor_id,
    reason,
    metadata
  ) values (
    p_tenant_id,
    p_branch_id,
    v_payment.order_id,
    'PAYMENT_REFUNDED',
    p_actor_id,
    p_reason,
    jsonb_build_object('payment_id', p_payment_id, 'refund_amount_cents', p_amount_cents)
  );

  return v_refund_id;
end;
$$;

create or replace function public.close_cash_register_session(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_actual_balance_amount_cents integer,
  p_difference_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session public.cash_register_sessions%rowtype;
  v_difference_amount_cents integer;
begin
  select * into v_session
    from public.cash_register_sessions
   where tenant_id = p_tenant_id
     and branch_id = p_branch_id
     and id = p_session_id
   for update;

  if not found then
    raise exception 'Cash register session was not found.' using errcode = 'P0002';
  end if;
  if v_session.status <> 'OPEN' then
    raise exception 'Cash register session is not open.' using errcode = 'P0001';
  end if;
  if p_actual_balance_amount_cents < 0 then
    raise exception 'Actual balance cannot be negative.' using errcode = 'P0001';
  end if;

  v_difference_amount_cents := p_actual_balance_amount_cents - v_session.expected_balance_amount_cents;
  if v_difference_amount_cents <> 0 and char_length(trim(coalesce(p_difference_reason, ''))) < 3 then
    raise exception 'Cash closing divergence requires a reason.' using errcode = 'P0001';
  end if;

  update public.cash_register_sessions
     set status = 'CLOSED',
         actual_balance_amount_cents = p_actual_balance_amount_cents,
         difference_amount_cents = v_difference_amount_cents,
         closed_by = p_actor_id,
         closed_at = now(),
         closing_notes = p_difference_reason,
         idempotency_key = coalesce(idempotency_key, nullif(p_idempotency_key, '')),
         updated_at = now()
   where id = v_session.id;

  return v_session.id;
end;
$$;