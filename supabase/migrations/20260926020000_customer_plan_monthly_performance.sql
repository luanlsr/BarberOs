create or replace view public.customer_plan_monthly_performance
with (security_invoker = true)
as
with plan_usage as (
  select
    cpu.tenant_id,
    cpu.branch_id,
    date_trunc('month', cpu.used_at)::date as month_start,
    count(*)::integer as plan_haircut_count,
    count(distinct cpu.customer_id)::integer as plan_customer_count
  from public.customer_plan_usage cpu
  where cpu.usage_type in ('INCLUDED_SERVICE', 'FULL_DISCOUNT_SERVICE', 'DISCOUNT')
  group by cpu.tenant_id, cpu.branch_id, date_trunc('month', cpu.used_at)::date
), plan_revenue as (
  select
    cpbe.tenant_id,
    cpbe.branch_id,
    date_trunc('month', cpbe.occurred_at)::date as month_start,
    coalesce(sum(cpbe.amount_cents), 0)::integer as plan_revenue_amount_cents
  from public.customer_plan_billing_events cpbe
  where cpbe.event_type = 'PAYMENT_RECEIVED'
    and cpbe.status = 'RECORDED'
  group by cpbe.tenant_id, cpbe.branch_id, date_trunc('month', cpbe.occurred_at)::date
), walk_in_usage as (
  select
    oi.tenant_id,
    oi.branch_id,
    date_trunc('month', coalesce(p.received_at, o.closed_at, o.opened_at))::date as month_start,
    count(*)::integer as walk_in_haircut_count,
    count(distinct o.customer_id)::integer as walk_in_customer_count,
    coalesce(sum(oi.final_amount_cents), 0)::integer as walk_in_revenue_amount_cents
  from public.order_items oi
  join public.orders o
    on o.tenant_id = oi.tenant_id
   and o.id = oi.order_id
  left join public.payments p
    on p.tenant_id = oi.tenant_id
   and p.order_id = oi.order_id
   and p.status in ('PAID', 'PARTIALLY_REFUNDED')
  left join public.customer_plan_usage cpu
    on cpu.tenant_id = oi.tenant_id
   and cpu.order_item_id = oi.id
  where oi.source_type = 'SERVICE'
    and o.status = 'PAID'
    and cpu.id is null
  group by oi.tenant_id, oi.branch_id, date_trunc('month', coalesce(p.received_at, o.closed_at, o.opened_at))::date
), dimensions as (
  select tenant_id, branch_id, month_start from plan_usage
  union
  select tenant_id, branch_id, month_start from plan_revenue
  union
  select tenant_id, branch_id, month_start from walk_in_usage
)
select
  dimensions.tenant_id,
  dimensions.branch_id,
  dimensions.month_start,
  coalesce(plan_usage.plan_haircut_count, 0) as plan_haircut_count,
  coalesce(plan_usage.plan_customer_count, 0) as plan_customer_count,
  coalesce(plan_revenue.plan_revenue_amount_cents, 0) as plan_revenue_amount_cents,
  coalesce(walk_in_usage.walk_in_haircut_count, 0) as walk_in_haircut_count,
  coalesce(walk_in_usage.walk_in_customer_count, 0) as walk_in_customer_count,
  coalesce(walk_in_usage.walk_in_revenue_amount_cents, 0) as walk_in_revenue_amount_cents,
  case
    when coalesce(plan_usage.plan_customer_count, 0) = 0 then 0
    else round(coalesce(plan_revenue.plan_revenue_amount_cents, 0)::numeric / plan_usage.plan_customer_count)::integer
  end as plan_revenue_per_customer_amount_cents,
  case
    when coalesce(walk_in_usage.walk_in_customer_count, 0) = 0 then 0
    else round(coalesce(walk_in_usage.walk_in_revenue_amount_cents, 0)::numeric / walk_in_usage.walk_in_customer_count)::integer
  end as walk_in_revenue_per_customer_amount_cents,
  case
    when coalesce(plan_usage.plan_haircut_count, 0) = 0 then 0
    else round(coalesce(plan_revenue.plan_revenue_amount_cents, 0)::numeric / plan_usage.plan_haircut_count)::integer
  end as plan_revenue_per_haircut_amount_cents,
  case
    when coalesce(walk_in_usage.walk_in_haircut_count, 0) = 0 then 0
    else round(coalesce(walk_in_usage.walk_in_revenue_amount_cents, 0)::numeric / walk_in_usage.walk_in_haircut_count)::integer
  end as walk_in_revenue_per_haircut_amount_cents
from dimensions
left join plan_usage
  on plan_usage.tenant_id = dimensions.tenant_id
 and plan_usage.branch_id is not distinct from dimensions.branch_id
 and plan_usage.month_start = dimensions.month_start
left join plan_revenue
  on plan_revenue.tenant_id = dimensions.tenant_id
 and plan_revenue.branch_id is not distinct from dimensions.branch_id
 and plan_revenue.month_start = dimensions.month_start
left join walk_in_usage
  on walk_in_usage.tenant_id = dimensions.tenant_id
 and walk_in_usage.branch_id is not distinct from dimensions.branch_id
 and walk_in_usage.month_start = dimensions.month_start;

comment on view public.customer_plan_monthly_performance is 'Monthly tenant/branch performance split between customer plan usage and walk-in service revenue.';
