create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  admin_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'PROVISIONING', 'PROVISIONED', 'CANCELED', 'EXPIRED', 'FAILED')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  document text,
  barbershop_name text not null,
  branch_name text not null default 'Unidade Centro',
  city text,
  state text,
  employees_count integer check (employees_count is null or employees_count >= 0),
  marketing_source jsonb not null default '{}'::jsonb,
  asaas_checkout_id text,
  asaas_checkout_url text,
  asaas_customer_id text,
  asaas_subscription_id text,
  amount_cents integer not null check (amount_cents >= 0),
  billing_interval text not null check (billing_interval in ('MONTHLY', 'YEARLY')),
  provisioning_error text,
  paid_at timestamptz,
  provisioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asaas_checkout_id)
);

create index if not exists checkout_sessions_status_idx on public.checkout_sessions (status, created_at desc);
create index if not exists checkout_sessions_email_idx on public.checkout_sessions (lower(customer_email), created_at desc);
create index if not exists checkout_sessions_tenant_idx on public.checkout_sessions (tenant_id) where tenant_id is not null;

create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  preheader text not null,
  html text not null,
  text text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkout_sessions enable row level security;
alter table public.email_templates enable row level security;

drop policy if exists checkout_sessions_platform_select on public.checkout_sessions;
create policy checkout_sessions_platform_select on public.checkout_sessions
  for select to authenticated using (public.has_platform_access());

drop policy if exists checkout_sessions_platform_write on public.checkout_sessions;
create policy checkout_sessions_platform_write on public.checkout_sessions
  for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

drop policy if exists email_templates_platform_select on public.email_templates;
create policy email_templates_platform_select on public.email_templates
  for select to authenticated using (public.has_platform_access());

drop policy if exists email_templates_platform_write on public.email_templates;
create policy email_templates_platform_write on public.email_templates
  for all to authenticated using (public.has_platform_access()) with check (public.has_platform_access());

insert into public.email_templates (key, name, subject, preheader, html, text)
values
  (
    'checkout.credentials.v1',
    'Credenciais iniciais apos pagamento',
    'Seu acesso ao BarberOS está pronto',
    'Pagamento confirmado. Acesse sua barbearia com a senha temporária.',
    '<div style="font-family:Arial,sans-serif;background:#0e0d12;color:#ffffff;padding:32px"><div style="max-width:640px;margin:0 auto;background:#17141c;border:1px solid #342234;border-radius:18px;padding:28px"><h1 style="margin:0 0 12px;font-size:28px">Bem-vindo ao BarberOS</h1><p style="color:#d9cbd6">Seu pagamento foi confirmado e preparamos o acesso inicial da sua barbearia.</p><div style="background:#241725;border:1px solid #ff2f92;border-radius:14px;padding:18px;margin:24px 0"><p style="margin:0 0 8px;color:#ff7fba;font-weight:700">Credenciais temporárias</p><p style="margin:0;color:#fff">Email: {{email}}</p><p style="margin:6px 0 0;color:#fff">Senha inicial: {{temporaryPassword}}</p></div><p style="color:#d9cbd6">Por segurança, altere sua senha no primeiro acesso.</p><a href="{{loginUrl}}" style="display:inline-block;background:#ff2f92;color:#fff;text-decoration:none;padding:14px 18px;border-radius:999px;font-weight:700">Entrar no BarberOS</a></div></div>',
    'Bem-vindo ao BarberOS. Seu pagamento foi confirmado. Email: {{email}} Senha inicial: {{temporaryPassword}} Acesse: {{loginUrl}} e altere sua senha no primeiro acesso.'
  ),
  (
    'auth.password-change.v1',
    'Senha alterada',
    'Sua senha do BarberOS foi alterada',
    'Aviso de segurança da sua conta BarberOS.',
    '<div style="font-family:Arial,sans-serif;background:#f7f7f7;color:#17191c;padding:32px"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6d7df;border-radius:18px;padding:28px"><h1 style="margin:0 0 12px;font-size:26px">Senha alterada</h1><p>Sua senha do BarberOS foi alterada com sucesso.</p><p>Se você não fez essa alteração, acesse o suporte imediatamente.</p><a href="{{loginUrl}}" style="display:inline-block;background:#ff2f92;color:#fff;text-decoration:none;padding:14px 18px;border-radius:999px;font-weight:700">Acessar conta</a></div></div>',
    'Sua senha do BarberOS foi alterada. Se você não fez essa alteração, fale com o suporte. Acesse: {{loginUrl}}'
  ),
  (
    'auth.password-reset.v1',
    'Recuperacao de senha',
    'Recupere sua senha do BarberOS',
    'Use o link seguro para definir uma nova senha.',
    '<div style="font-family:Arial,sans-serif;background:#0e0d12;color:#ffffff;padding:32px"><div style="max-width:640px;margin:0 auto;background:#17141c;border:1px solid #342234;border-radius:18px;padding:28px"><h1 style="margin:0 0 12px;font-size:26px">Recuperar senha</h1><p style="color:#d9cbd6">Recebemos uma solicitação para redefinir sua senha no BarberOS.</p><a href="{{resetUrl}}" style="display:inline-block;background:#ff2f92;color:#fff;text-decoration:none;padding:14px 18px;border-radius:999px;font-weight:700">Criar nova senha</a><p style="color:#a998a8;margin-top:20px">Se você não solicitou isso, pode ignorar este email.</p></div></div>',
    'Recebemos uma solicitação para redefinir sua senha no BarberOS. Acesse: {{resetUrl}}. Se você não solicitou isso, ignore este email.'
  )
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  preheader = excluded.preheader,
  html = excluded.html,
  text = excluded.text,
  status = 'ACTIVE',
  updated_at = now();
