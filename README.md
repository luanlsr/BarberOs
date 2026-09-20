# BarberOS

Plataforma SaaS multi-tenant para operacao inteligente de barbearias.

## Pre-requisitos

- Node.js 20.19 ou superior
- npm 10 ou superior
- Python 3.11 ou superior para `apps/ai`

## Setup

```bash
npm install
cp .env.example .env.local
```

No Windows, copie `.env.example` para `.env.local` pelo Explorer ou PowerShell. Nunca preencha secrets no navegador e nunca versione arquivos `.env`.

## Desenvolvimento

```bash
npm run dev:web
npm run dev:worker
npm run dev:ai
```

A web fica em `http://localhost:3000`, o worker em `http://localhost:4001/health` e a AI em `http://localhost:8000/health` quando as dependencias Python estiverem instaladas.

## Autenticacao local e Supabase

O shell usa uma sessao de desenvolvimento somente fora de producao quando `BARBEROS_DEV_AUTH=true`. Para autenticacao real, preencha `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local`.

A migration em `supabase/migrations/` e o seed em `supabase/seed.sql` modelam auth, tenant, branch, membership, RBAC, entitlements, RLS e auditoria. A service role permanece server-side e nunca deve ser configurada no navegador.

Para criar ou atualizar o usuario local no Supabase Auth e vincular ele ao tenant/filiais da seed, rode:

```bash
npm run auth:create-dev-user
```

Credenciais padrao criadas pelo comando:

- Email: `dev@barberos.local`
- Senha: `BarberOS@123456`

Para forcar o login real em desenvolvimento, configure `BARBEROS_DEV_AUTH=false`.

## Validacao

```bash
npm run validate:foundation
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```
