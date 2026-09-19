create or replace function public.claim_worker_jobs(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_until timestamptz default now() + interval '60 seconds',
  p_now timestamptz default now()
)
returns setof public.worker_jobs
language sql
security definer
set search_path = public
as $$
  with claimable as (
    select id
    from public.worker_jobs
    where run_at <= p_now
      and (
        status in ('PENDING', 'RETRY_SCHEDULED')
        or (status in ('CLAIMED', 'RUNNING') and locked_until is not null and locked_until <= p_now)
      )
    order by priority desc, run_at asc, created_at asc
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    for update skip locked
  )
  update public.worker_jobs jobs
  set status = 'CLAIMED',
      locked_by = p_worker_id,
      locked_until = p_lease_until,
      updated_at = p_now
  from claimable
  where jobs.id = claimable.id
  returning jobs.*;
$$;

revoke all on function public.claim_worker_jobs(text, integer, timestamptz, timestamptz) from public;
grant execute on function public.claim_worker_jobs(text, integer, timestamptz, timestamptz) to service_role;
