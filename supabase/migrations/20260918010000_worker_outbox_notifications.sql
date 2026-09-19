create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  event_type text not null check (event_type in ('APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'ORDER_OPENED', 'ORDER_PAID', 'PAYMENT_COMPLETED', 'PAYMENT_REFUNDED', 'FINANCE_RECALCULATION_REQUESTED', 'STOCK_LOW_DETECTED', 'NOTIFICATION_DELIVERY_REQUESTED')),
  source_type text not null check (source_type in ('APPOINTMENT', 'ORDER', 'PAYMENT', 'CASH_REGISTER', 'FINANCIAL_ENTRY', 'COMMISSION', 'PAYOUT', 'PRODUCT', 'STOCK_MOVEMENT', 'NOTIFICATION_INTENT', 'SYSTEM')),
  source_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'DISPATCHING', 'DISPATCHED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED')),
  correlation_id text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error_code text check (last_error_code is null or last_error_code in ('WORKER_VALIDATION_ERROR', 'WORKER_PERMISSION_DENIED', 'WORKER_BRANCH_SCOPE_DENIED', 'WORKER_UNSUPPORTED_JOB_TYPE', 'WORKER_UNSUPPORTED_JOB_VERSION', 'WORKER_LOCK_NOT_ACQUIRED', 'WORKER_RATE_LIMITED', 'WORKER_PROVIDER_UNAVAILABLE', 'WORKER_RETRY_EXHAUSTED', 'WORKER_HANDLER_FAILED', 'OUTBOX_VALIDATION_ERROR', 'OUTBOX_IDEMPOTENCY_CONFLICT', 'NOTIFICATION_VALIDATION_ERROR', 'NOTIFICATION_DELIVERY_FAILED')),
  last_error_message text,
  last_error_retryable boolean,
  dispatched_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(idempotency_key)) >= 8),
  check (char_length(trim(correlation_id)) >= 1),
  check (status <> 'DISPATCHED' or dispatched_at is not null),
  check (status not in ('FAILED', 'DEAD_LETTERED') or last_error_code is not null)
);

create table if not exists public.notification_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  recipient_type text not null check (recipient_type in ('CUSTOMER', 'PROFESSIONAL', 'MEMBERSHIP', 'TENANT_OPERATOR')),
  recipient_id uuid not null,
  channel text not null check (channel in ('WHATSAPP', 'SMS', 'EMAIL', 'IN_APP', 'LOCAL')),
  template_key text not null,
  source_type text not null check (source_type in ('APPOINTMENT', 'ORDER', 'PAYMENT', 'CASH_REGISTER', 'FINANCIAL_ENTRY', 'COMMISSION', 'PAYOUT', 'PRODUCT', 'STOCK_MOVEMENT', 'NOTIFICATION_INTENT', 'SYSTEM')),
  source_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'READY', 'DISPATCHING', 'SENT', 'FAILED', 'CANCELLED')),
  idempotency_key text not null,
  correlation_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(template_key)) between 2 and 120),
  check (char_length(trim(idempotency_key)) >= 8),
  check (char_length(trim(correlation_id)) >= 1)
);

create table if not exists public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  type text not null check (type in ('OUTBOX_DISPATCH', 'APPOINTMENT_REMINDER', 'POST_SERVICE_FOLLOW_UP', 'FINANCE_RECALCULATION', 'STOCK_ALERT', 'EXPIRED_RECORD_CLEANUP', 'NOTIFICATION_DELIVERY')),
  status text not null default 'PENDING' check (status in ('PENDING', 'CLAIMED', 'RUNNING', 'SUCCEEDED', 'RETRY_SCHEDULED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED')),
  schema_version integer not null default 1 check (schema_version = 1),
  source_type text check (source_type is null or source_type in ('APPOINTMENT', 'ORDER', 'PAYMENT', 'CASH_REGISTER', 'FINANCIAL_ENTRY', 'COMMISSION', 'PAYOUT', 'PRODUCT', 'STOCK_MOVEMENT', 'NOTIFICATION_INTENT', 'SYSTEM')),
  source_id uuid,
  outbox_event_id uuid references public.outbox_events(id) on delete restrict,
  notification_intent_id uuid references public.notification_intents(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  correlation_id text not null,
  priority integer not null default 50 check (priority between 0 and 100),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 25),
  run_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error_code text check (last_error_code is null or last_error_code in ('WORKER_VALIDATION_ERROR', 'WORKER_PERMISSION_DENIED', 'WORKER_BRANCH_SCOPE_DENIED', 'WORKER_UNSUPPORTED_JOB_TYPE', 'WORKER_UNSUPPORTED_JOB_VERSION', 'WORKER_LOCK_NOT_ACQUIRED', 'WORKER_RATE_LIMITED', 'WORKER_PROVIDER_UNAVAILABLE', 'WORKER_RETRY_EXHAUSTED', 'WORKER_HANDLER_FAILED', 'OUTBOX_VALIDATION_ERROR', 'OUTBOX_IDEMPOTENCY_CONFLICT', 'NOTIFICATION_VALIDATION_ERROR', 'NOTIFICATION_DELIVERY_FAILED')),
  last_error_message text,
  last_error_retryable boolean,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(idempotency_key)) >= 8),
  check (char_length(trim(correlation_id)) >= 1),
  check (attempt_count <= max_attempts),
  check (status <> 'SUCCEEDED' or completed_at is not null),
  check (status not in ('FAILED', 'DEAD_LETTERED') or last_error_code is not null),
  check (type <> 'NOTIFICATION_DELIVERY' or notification_intent_id is not null)
);

create table if not exists public.worker_job_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.worker_jobs(id) on delete cascade,
  outbox_event_id uuid references public.outbox_events(id) on delete restrict,
  status text not null check (status in ('RUNNING', 'SUCCEEDED', 'FAILED', 'RETRY_SCHEDULED', 'DEAD_LETTERED')),
  attempt_number integer not null check (attempt_number >= 1),
  worker_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  error_code text check (error_code is null or error_code in ('WORKER_VALIDATION_ERROR', 'WORKER_PERMISSION_DENIED', 'WORKER_BRANCH_SCOPE_DENIED', 'WORKER_UNSUPPORTED_JOB_TYPE', 'WORKER_UNSUPPORTED_JOB_VERSION', 'WORKER_LOCK_NOT_ACQUIRED', 'WORKER_RATE_LIMITED', 'WORKER_PROVIDER_UNAVAILABLE', 'WORKER_RETRY_EXHAUSTED', 'WORKER_HANDLER_FAILED', 'OUTBOX_VALIDATION_ERROR', 'OUTBOX_IDEMPOTENCY_CONFLICT', 'NOTIFICATION_VALIDATION_ERROR', 'NOTIFICATION_DELIVERY_FAILED')),
  error_message text,
  error_retryable boolean,
  check (char_length(trim(worker_id)) >= 1),
  check (status = 'RUNNING' or finished_at is not null),
  check (status not in ('FAILED', 'RETRY_SCHEDULED', 'DEAD_LETTERED') or error_code is not null)
);

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  notification_intent_id uuid not null references public.notification_intents(id) on delete cascade,
  channel text not null check (channel in ('WHATSAPP', 'SMS', 'EMAIL', 'IN_APP', 'LOCAL')),
  status text not null check (status in ('PENDING', 'SENT', 'RETRY_SCHEDULED', 'FAILED', 'DEAD_LETTERED')),
  attempt_number integer not null check (attempt_number >= 1),
  provider text,
  provider_message_id text,
  error_code text check (error_code is null or error_code in ('WORKER_VALIDATION_ERROR', 'WORKER_PERMISSION_DENIED', 'WORKER_BRANCH_SCOPE_DENIED', 'WORKER_UNSUPPORTED_JOB_TYPE', 'WORKER_UNSUPPORTED_JOB_VERSION', 'WORKER_LOCK_NOT_ACQUIRED', 'WORKER_RATE_LIMITED', 'WORKER_PROVIDER_UNAVAILABLE', 'WORKER_RETRY_EXHAUSTED', 'WORKER_HANDLER_FAILED', 'OUTBOX_VALIDATION_ERROR', 'OUTBOX_IDEMPOTENCY_CONFLICT', 'NOTIFICATION_VALIDATION_ERROR', 'NOTIFICATION_DELIVERY_FAILED')),
  error_message text,
  error_retryable boolean,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (provider is null or char_length(trim(provider)) >= 2),
  check (status <> 'SENT' or sent_at is not null),
  check (status not in ('FAILED', 'RETRY_SCHEDULED', 'DEAD_LETTERED') or error_code is not null)
);

create index if not exists outbox_events_tenant_branch_status_idx on public.outbox_events (tenant_id, branch_id, status, available_at, created_at);
create index if not exists outbox_events_source_idx on public.outbox_events (tenant_id, source_type, source_id, event_type);
create index if not exists outbox_events_correlation_idx on public.outbox_events (tenant_id, correlation_id);
create unique index if not exists outbox_events_idempotency_idx on public.outbox_events (tenant_id, idempotency_key);
create unique index if not exists outbox_events_source_event_unique_idx on public.outbox_events (tenant_id, source_type, source_id, event_type, idempotency_key);

create index if not exists notification_intents_tenant_branch_status_idx on public.notification_intents (tenant_id, branch_id, status, created_at desc);
create index if not exists notification_intents_source_idx on public.notification_intents (tenant_id, source_type, source_id, channel);
create index if not exists notification_intents_recipient_idx on public.notification_intents (tenant_id, recipient_type, recipient_id, created_at desc);
create unique index if not exists notification_intents_idempotency_idx on public.notification_intents (tenant_id, idempotency_key);
create unique index if not exists notification_intents_source_channel_unique_idx on public.notification_intents (tenant_id, source_type, source_id, channel, template_key, idempotency_key);

create index if not exists worker_jobs_tenant_branch_status_idx on public.worker_jobs (tenant_id, branch_id, status, run_at, priority desc);
create index if not exists worker_jobs_outbox_event_idx on public.worker_jobs (tenant_id, outbox_event_id) where outbox_event_id is not null;
create index if not exists worker_jobs_notification_intent_idx on public.worker_jobs (tenant_id, notification_intent_id) where notification_intent_id is not null;
create index if not exists worker_jobs_source_idx on public.worker_jobs (tenant_id, type, source_type, source_id) where source_id is not null;
create unique index if not exists worker_jobs_idempotency_idx on public.worker_jobs (tenant_id, idempotency_key);
create unique index if not exists worker_jobs_source_unique_idx on public.worker_jobs (tenant_id, type, source_type, source_id, idempotency_key) where source_id is not null;

create index if not exists worker_job_attempts_job_idx on public.worker_job_attempts (tenant_id, job_id, attempt_number);
create index if not exists worker_job_attempts_outbox_event_idx on public.worker_job_attempts (tenant_id, outbox_event_id) where outbox_event_id is not null;
create unique index if not exists worker_job_attempts_attempt_unique_idx on public.worker_job_attempts (tenant_id, job_id, attempt_number);

create index if not exists notification_delivery_attempts_intent_idx on public.notification_delivery_attempts (tenant_id, notification_intent_id, attempt_number);
create index if not exists notification_delivery_attempts_status_idx on public.notification_delivery_attempts (tenant_id, branch_id, status, created_at desc);
create unique index if not exists notification_delivery_attempts_attempt_unique_idx on public.notification_delivery_attempts (tenant_id, notification_intent_id, channel, attempt_number);

alter table public.outbox_events enable row level security;
alter table public.worker_jobs enable row level security;
alter table public.worker_job_attempts enable row level security;
alter table public.notification_intents enable row level security;
alter table public.notification_delivery_attempts enable row level security;

create or replace function public.has_worker_operations_access(target_tenant uuid, target_branch uuid)
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
      and m.role in ('PLATFORM_MASTER', 'PLATFORM_SUPPORT', 'OWNER', 'MANAGER')
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

create or replace function public.has_notification_status_access(target_tenant uuid, target_branch uuid)
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

drop policy if exists outbox_events_worker_select on public.outbox_events;
create policy outbox_events_worker_select on public.outbox_events for select to authenticated using (public.has_worker_operations_access(tenant_id, branch_id));
drop policy if exists outbox_events_worker_write on public.outbox_events;
create policy outbox_events_worker_write on public.outbox_events for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));

drop policy if exists worker_jobs_worker_select on public.worker_jobs;
create policy worker_jobs_worker_select on public.worker_jobs for select to authenticated using (public.has_worker_operations_access(tenant_id, branch_id));
drop policy if exists worker_jobs_worker_write on public.worker_jobs;
create policy worker_jobs_worker_write on public.worker_jobs for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));

drop policy if exists worker_job_attempts_worker_select on public.worker_job_attempts;
create policy worker_job_attempts_worker_select on public.worker_job_attempts for select to authenticated using (public.has_worker_operations_access(tenant_id, branch_id));
drop policy if exists worker_job_attempts_worker_write on public.worker_job_attempts;
create policy worker_job_attempts_worker_write on public.worker_job_attempts for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));

drop policy if exists notification_intents_status_select on public.notification_intents;
create policy notification_intents_status_select on public.notification_intents for select to authenticated using (public.has_notification_status_access(tenant_id, branch_id));
drop policy if exists notification_intents_worker_write on public.notification_intents;
create policy notification_intents_worker_write on public.notification_intents for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));

drop policy if exists notification_delivery_attempts_status_select on public.notification_delivery_attempts;
create policy notification_delivery_attempts_status_select on public.notification_delivery_attempts for select to authenticated using (public.has_notification_status_access(tenant_id, branch_id));
drop policy if exists notification_delivery_attempts_worker_write on public.notification_delivery_attempts;
create policy notification_delivery_attempts_worker_write on public.notification_delivery_attempts for all to authenticated using (public.has_worker_operations_access(tenant_id, branch_id)) with check (public.has_worker_operations_access(tenant_id, branch_id));