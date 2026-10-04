# Deployment Readiness

## Environments

BarberOS production readiness assumes separate credentials for:

- development
- preview
- staging
- production

Secrets must never be committed. Browser-visible variables must use public/anonymous credentials only.

## Vercel: `apps/web`

Responsibilities:

- Next.js frontend and SSR.
- Route handlers and synchronous APIs.
- Fast webhooks that enqueue durable work.

Required server-side environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- payment provider credentials and webhook secrets
- WhatsApp provider credentials and webhook secrets when webhooks terminate in web
- AI/tool gateway shared secret or short-token signing secret
- Redis connection string for rate limits where enabled

Allowed client-side environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Health checks:

- `/api/health`
- smoke request with `x-request-id`
- webhook signature rejection test

## Railway: `apps/worker`

Responsibilities:

- Persistent outbox/job processing.
- Notifications and campaign dispatch.
- Retries, dead-letter visibility and asynchronous side effects.

Required environment:

- Supabase server credentials.
- Redis connection string.
- Worker polling/retry configuration.
- Provider credentials needed for asynchronous delivery.

Health checks:

- process boot without missing config;
- worker can claim no-op batch;
- failed job visibility remains queryable.

## Railway: `apps/ai`

Responsibilities:

- FastAPI Barber AI service.
- Orchestration, prompts, provider adapters and function calling policy.

Required environment:

- AI provider credentials.
- Tool Gateway endpoint.
- short-lived auth/signing secret for authorized context.
- observability environment/service name.

Health checks:

- FastAPI health route;
- tool registry read-only check;
- denied unauthorized tool call check.

## Supabase

Responsibilities:

- PostgreSQL.
- Supabase Auth.
- Storage where applicable.
- RLS as defense in depth.

Readiness checks:

- all migrations applied through versioned migration flow;
- all migration validators pass;
- RLS enabled on tenant-scoped production tables;
- service role restricted to server-side environments.

## Redis

Responsibilities:

- queue/cache/rate limit/locks.

Readiness checks:

- worker can connect;
- rate-limit adapter can read/write;
- eviction policy and memory class documented by hosting provider.
