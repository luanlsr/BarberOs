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

Para criar ou atualizar tenants demo, usuarios no Supabase Auth, filiais, memberships, servicos, clientes, agenda e estoque inicial, rode:

```bash
npm run auth:create-demo-users
```

Credenciais padrao criadas pelo comando:

| Tenant                | Role interna      | Email                                     | Senha               | Escopo de filial           |
| --------------------- | ----------------- | ----------------------------------------- | ------------------- | -------------------------- |
| Plataforma BarberOS   | `PLATFORM_MASTER` | `superadmin@barberos.local`               | `SuperAdmin@123456` | Plataforma + demo          |
| Barbearia Modelo      | `OWNER`           | `admin@modelo.barberos.local`             | `Admin@123456`      | Todas as filiais do tenant |
| Barbearia Modelo      | `RECEPTIONIST`    | `recepcao@modelo.barberos.local`          | `Recepcao@123456`   | Unidade inicial            |
| Barbearia Modelo      | `PROFESSIONAL`    | `barbeiro1@modelo.barberos.local`         | `Barbeiro@123456`   | Unidade inicial            |
| Barbearia Premium Sul | `OWNER`           | `admin@premium-sul.barberos.local`        | `Admin@123456`      | Todas as filiais do tenant |
| Barbearia Premium Sul | `RECEPTIONIST`    | `recepcao@premium-sul.barberos.local`     | `Recepcao@123456`   | Unidade inicial            |
| Barbearia Premium Sul | `PROFESSIONAL`    | `barbeiro1@premium-sul.barberos.local`    | `Barbeiro@123456`   | Unidade inicial            |
| Rede Navalha Urbana   | `OWNER`           | `admin@navalha-urbana.barberos.local`     | `Admin@123456`      | Todas as filiais do tenant |
| Rede Navalha Urbana   | `RECEPTIONIST`    | `recepcao@navalha-urbana.barberos.local`  | `Recepcao@123456`   | Unidade inicial            |
| Rede Navalha Urbana   | `PROFESSIONAL`    | `barbeiro1@navalha-urbana.barberos.local` | `Barbeiro@123456`   | Unidade inicial            |

O comando `npm run auth:create-dev-user` permanece disponivel para criar os usuarios locais legados `admin@barberos.local`, `recepcao@barberos.local` e `barbeiro@barberos.local`.
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
