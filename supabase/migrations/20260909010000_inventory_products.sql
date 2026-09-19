create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2),
  check (status <> 'ARCHIVED' or archived_at is not null)
);

create table if not exists public.product_category_branches (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category_id uuid not null references public.product_categories(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (tenant_id, category_id, branch_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category_id uuid references public.product_categories(id) on delete set null,
  sku text,
  barcode text,
  name text not null,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  sale_price_amount_cents integer not null check (sale_price_amount_cents > 0),
  cost_amount_cents integer check (cost_amount_cents >= 0),
  stock_tracking_policy text not null default 'TRACKED' check (stock_tracking_policy in ('TRACKED', 'NOT_TRACKED')),
  allow_negative_stock boolean not null default false,
  minimum_stock_quantity integer not null default 0 check (minimum_stock_quantity >= 0),
  supplier_metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2),
  check (sku is null or char_length(trim(sku)) >= 1),
  check (barcode is null or char_length(trim(barcode)) >= 3),
  check (status <> 'ARCHIVED' or archived_at is not null)
);

create table if not exists public.product_branches (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (tenant_id, product_id, branch_id)
);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('ENTRY', 'SALE', 'LOSS', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')),
  quantity integer not null check (quantity <> 0),
  balance_after_quantity integer,
  source_type text not null check (source_type in ('MANUAL', 'ORDER_ITEM', 'PAYMENT', 'TRANSFER', 'SYSTEM')),
  source_id text,
  order_id uuid references public.orders(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  idempotency_key text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (
    (type in ('ENTRY', 'TRANSFER_IN') and quantity > 0)
    or (type in ('SALE', 'LOSS', 'CONSUMPTION', 'TRANSFER_OUT') and quantity < 0)
    or type = 'ADJUSTMENT'
  ),
  check (type not in ('LOSS', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT') or char_length(trim(coalesce(reason, ''))) >= 3),
  check (type <> 'SALE' or (order_id is not null and order_item_id is not null and payment_id is not null))
);

create table if not exists public.low_stock_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'RESOLVED')),
  current_quantity integer not null,
  minimum_stock_quantity integer not null check (minimum_stock_quantity >= 0),
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (state <> 'RESOLVED' or resolved_at is not null)
);

create index if not exists product_categories_tenant_status_idx on public.product_categories (tenant_id, status, created_at desc);
create unique index if not exists product_categories_tenant_name_idx on public.product_categories (tenant_id, lower(name)) where status <> 'ARCHIVED';
create index if not exists product_category_branches_tenant_branch_idx on public.product_category_branches (tenant_id, branch_id, category_id);
create index if not exists products_tenant_status_idx on public.products (tenant_id, status, created_at desc);
create index if not exists products_tenant_category_idx on public.products (tenant_id, category_id, status) where category_id is not null;
create index if not exists products_tenant_search_idx on public.products (tenant_id, lower(name));
create unique index if not exists products_tenant_sku_idx on public.products (tenant_id, lower(sku)) where sku is not null and status <> 'ARCHIVED';
create unique index if not exists products_tenant_barcode_idx on public.products (tenant_id, barcode) where barcode is not null and status <> 'ARCHIVED';
create index if not exists product_branches_tenant_branch_idx on public.product_branches (tenant_id, branch_id, product_id);
create index if not exists inventory_locations_tenant_branch_active_idx on public.inventory_locations (tenant_id, branch_id, active, name);
create index if not exists stock_movements_tenant_branch_product_idx on public.stock_movements (tenant_id, branch_id, product_id, created_at desc);
create index if not exists stock_movements_location_idx on public.stock_movements (tenant_id, location_id, created_at desc) where location_id is not null;
create index if not exists stock_movements_order_item_idx on public.stock_movements (tenant_id, order_id, order_item_id) where order_item_id is not null;
create index if not exists stock_movements_payment_idx on public.stock_movements (tenant_id, payment_id) where payment_id is not null;
create unique index if not exists stock_movements_idempotency_idx on public.stock_movements (tenant_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists stock_movements_sale_source_unique_idx on public.stock_movements (tenant_id, branch_id, product_id, order_item_id) where type = 'SALE';
create index if not exists low_stock_alerts_tenant_branch_state_idx on public.low_stock_alerts (tenant_id, branch_id, state, triggered_at desc);
create unique index if not exists low_stock_alerts_active_product_idx on public.low_stock_alerts (tenant_id, branch_id, product_id) where state = 'ACTIVE';

alter table public.product_categories enable row level security;
alter table public.product_category_branches enable row level security;
alter table public.products enable row level security;
alter table public.product_branches enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.low_stock_alerts enable row level security;

create or replace function public.has_inventory_access(target_tenant uuid, target_branch uuid)
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
      and m.role in ('PLATFORM_MASTER', 'OWNER', 'MANAGER', 'FINANCE', 'RECEPTIONIST')
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

drop policy if exists product_categories_inventory_select on public.product_categories;
create policy product_categories_inventory_select on public.product_categories for select to authenticated using (public.has_inventory_access(tenant_id, null));
drop policy if exists product_categories_inventory_write on public.product_categories;
create policy product_categories_inventory_write on public.product_categories for all to authenticated using (public.has_inventory_access(tenant_id, null)) with check (public.has_inventory_access(tenant_id, null));

drop policy if exists product_category_branches_inventory_select on public.product_category_branches;
create policy product_category_branches_inventory_select on public.product_category_branches for select to authenticated using (public.has_inventory_access(tenant_id, branch_id));
drop policy if exists product_category_branches_inventory_write on public.product_category_branches;
create policy product_category_branches_inventory_write on public.product_category_branches for all to authenticated using (public.has_inventory_access(tenant_id, branch_id)) with check (public.has_inventory_access(tenant_id, branch_id));

drop policy if exists products_inventory_select on public.products;
create policy products_inventory_select on public.products for select to authenticated using (public.has_inventory_access(tenant_id, null));
drop policy if exists products_inventory_write on public.products;
create policy products_inventory_write on public.products for all to authenticated using (public.has_inventory_access(tenant_id, null)) with check (public.has_inventory_access(tenant_id, null));

drop policy if exists product_branches_inventory_select on public.product_branches;
create policy product_branches_inventory_select on public.product_branches for select to authenticated using (public.has_inventory_access(tenant_id, branch_id));
drop policy if exists product_branches_inventory_write on public.product_branches;
create policy product_branches_inventory_write on public.product_branches for all to authenticated using (public.has_inventory_access(tenant_id, branch_id)) with check (public.has_inventory_access(tenant_id, branch_id));

drop policy if exists inventory_locations_inventory_select on public.inventory_locations;
create policy inventory_locations_inventory_select on public.inventory_locations for select to authenticated using (public.has_inventory_access(tenant_id, branch_id));
drop policy if exists inventory_locations_inventory_write on public.inventory_locations;
create policy inventory_locations_inventory_write on public.inventory_locations for all to authenticated using (public.has_inventory_access(tenant_id, branch_id)) with check (public.has_inventory_access(tenant_id, branch_id));

drop policy if exists stock_movements_inventory_select on public.stock_movements;
create policy stock_movements_inventory_select on public.stock_movements for select to authenticated using (public.has_inventory_access(tenant_id, branch_id));
drop policy if exists stock_movements_inventory_write on public.stock_movements;
create policy stock_movements_inventory_write on public.stock_movements for all to authenticated using (public.has_inventory_access(tenant_id, branch_id)) with check (public.has_inventory_access(tenant_id, branch_id));

drop policy if exists low_stock_alerts_inventory_select on public.low_stock_alerts;
create policy low_stock_alerts_inventory_select on public.low_stock_alerts for select to authenticated using (public.has_inventory_access(tenant_id, branch_id));
drop policy if exists low_stock_alerts_inventory_write on public.low_stock_alerts;
create policy low_stock_alerts_inventory_write on public.low_stock_alerts for all to authenticated using (public.has_inventory_access(tenant_id, branch_id)) with check (public.has_inventory_access(tenant_id, branch_id));

create or replace function public.record_payment_inventory_sale_effects(
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
as $barberos_inventory_effects$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_product public.products%rowtype;
  v_current_quantity integer;
  v_next_quantity integer;
  v_inserted_count integer := 0;
begin
  if nullif(p_idempotency_key, '') is null then
    raise exception 'Inventory idempotency key is required.' using errcode = 'P0001';
  end if;

  select * into v_order
    from public.orders o
   where o.tenant_id = p_tenant_id
     and o.branch_id = p_branch_id
     and o.id = p_order_id
   for update;

  if not found then
    raise exception 'Order was not found for inventory effects.' using errcode = 'P0002';
  end if;

  if v_order.status <> 'PAID' then
    return 0;
  end if;

  if exists (
    select 1
      from public.stock_movements sm
     where sm.tenant_id = p_tenant_id
       and sm.branch_id = p_branch_id
       and sm.order_id = p_order_id
       and sm.type = 'SALE'
  ) then
    return 0;
  end if;

  for v_item in
    select oi.*
      from public.order_items oi
      join public.products p
        on p.id = oi.source_id
       and p.tenant_id = oi.tenant_id
     where oi.tenant_id = p_tenant_id
       and oi.branch_id = p_branch_id
       and oi.order_id = p_order_id
       and oi.source_type = 'PRODUCT'
       and p.stock_tracking_policy = 'TRACKED'
     order by oi.created_at, oi.id
  loop
    select * into v_product
      from public.products p
     where p.tenant_id = p_tenant_id
       and p.id = v_item.source_id
       and p.status = 'ACTIVE'
       and p.stock_tracking_policy = 'TRACKED'
       and exists (
         select 1
           from public.product_branches pb
          where pb.tenant_id = p.tenant_id
            and pb.product_id = p.id
            and pb.branch_id = p_branch_id
       )
     for update;

    if not found then
      raise exception 'Tracked product is not available for this branch.' using errcode = 'P0002';
    end if;

    select coalesce(sum(quantity), 0) into v_current_quantity
      from public.stock_movements sm
     where sm.tenant_id = p_tenant_id
       and sm.branch_id = p_branch_id
       and sm.product_id = v_product.id;

    v_next_quantity := v_current_quantity - v_item.quantity;

    if v_next_quantity < 0 and not v_product.allow_negative_stock then
      raise exception 'Insufficient stock for product sale.' using errcode = 'P0001';
    end if;

    insert into public.stock_movements (
      tenant_id,
      branch_id,
      product_id,
      type,
      quantity,
      balance_after_quantity,
      source_type,
      source_id,
      order_id,
      order_item_id,
      payment_id,
      idempotency_key,
      reason,
      created_by
    ) values (
      p_tenant_id,
      p_branch_id,
      v_product.id,
      'SALE',
      -v_item.quantity,
      v_next_quantity,
      'PAYMENT',
      p_payment_id::text,
      p_order_id,
      v_item.id,
      p_payment_id,
      nullif(p_idempotency_key, '') || ':' || v_item.id::text,
      'Venda de produto na Comanda.',
      p_actor_id
    );

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return v_inserted_count;
end;
$barberos_inventory_effects$;

create or replace function public.receive_order_payment_with_inventory_effects(
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
as $barberos_inventory_effects$
declare
  v_payment public.payments%rowtype;
begin
  perform public.receive_order_payment_with_money_effects(
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
    perform public.record_payment_inventory_sale_effects(
      p_tenant_id,
      p_branch_id,
      p_order_id,
      v_payment.id,
      p_actor_id,
      nullif(p_idempotency_key, '') || ':inventory:' || v_payment.id::text
    );
  end loop;

  return p_order_id;
end;
$barberos_inventory_effects$;