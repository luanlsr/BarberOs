import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const DEFAULTS = {
  email: 'dev@barberos.local',
  password: 'BarberOS@123456',
  fullName: 'Luan Ribeiro',
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchIds: ['00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012'],
  role: 'OWNER',
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function readOption(name, fallback) {
  const argPrefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(argPrefix));
  if (arg) return arg.slice(argPrefix.length);

  const envKey = `BARBEROS_AUTH_${name.replaceAll('-', '_').toUpperCase()}`;
  return process.env[envKey] ?? fallback;
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  throw new Error(`Usuario ${email} nao encontrado nas primeiras 2000 contas do Supabase Auth.`);
}

async function createOrUpdateAuthUser(supabase, { email, password, fullName }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      name: fullName,
    },
  });

  if (!error) return { user: data.user, action: 'created' };

  const alreadyExists =
    error.message.toLowerCase().includes('already') ||
    error.message.toLowerCase().includes('registered') ||
    error.status === 422;

  if (!alreadyExists) throw error;

  const existingUser = await findUserByEmail(supabase, email);
  if (!existingUser) throw error;

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
    existingUser.id,
    {
      password,
      email_confirm: true,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: fullName,
        name: fullName,
      },
    },
  );

  if (updateError) throw updateError;
  return { user: updated.user, action: 'updated' };
}

async function ensureSeedTenantAndBranches(supabase, { tenantId, branchIds }) {
  const { error: tenantError } = await supabase.from('tenants').upsert(
    {
      id: tenantId,
      name: 'Barbearia Modelo',
      status: 'ACTIVE',
    },
    { onConflict: 'id' },
  );
  if (tenantError) throw tenantError;

  const branches = branchIds.map((branchId, index) => ({
    id: branchId,
    tenant_id: tenantId,
    name: index === 0 ? 'Unidade Centro' : 'Unidade Norte',
    status: 'ACTIVE',
  }));

  const { error: branchesError } = await supabase
    .from('branches')
    .upsert(branches, { onConflict: 'id' });
  if (branchesError) throw branchesError;
}

async function ensureMembership(supabase, { userId, tenantId, branchIds, role }) {
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        role,
        status: 'ACTIVE',
      },
      { onConflict: 'user_id,tenant_id' },
    )
    .select('id')
    .single();

  if (membershipError) throw membershipError;

  const branchRows = branchIds.map((branchId) => ({
    membership_id: membership.id,
    branch_id: branchId,
  }));

  const { error: branchError } = await supabase
    .from('membership_branches')
    .upsert(branchRows, { onConflict: 'membership_id,branch_id' });

  if (branchError) throw branchError;
  return membership.id;
}

async function main() {
  loadEnvFile(path.join(rootDir, '.env'));
  loadEnvFile(path.join(rootDir, '.env.local'));
  loadEnvFile(path.join(rootDir, 'apps', 'web', '.env.local'));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local antes de criar o usuario.',
    );
  }

  const options = {
    email: readOption('email', DEFAULTS.email),
    password: readOption('password', DEFAULTS.password),
    fullName: readOption('name', DEFAULTS.fullName),
    tenantId: readOption('tenant-id', DEFAULTS.tenantId),
    branchIds: readOption('branch-ids', DEFAULTS.branchIds.join(','))
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    role: readOption('role', DEFAULTS.role),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await ensureSeedTenantAndBranches(supabase, options);
  const { user, action } = await createOrUpdateAuthUser(supabase, options);
  const membershipId = await ensureMembership(supabase, {
    userId: user.id,
    tenantId: options.tenantId,
    branchIds: options.branchIds,
    role: options.role,
  });

  console.log('[BarberOS auth] Usuario Supabase pronto.');
  console.log(`acao: ${action}`);
  console.log(`email: ${options.email}`);
  console.log(`senha: ${options.password}`);
  console.log(`user_id: ${user.id}`);
  console.log(`membership_id: ${membershipId}`);
  console.log(`tenant_id: ${options.tenantId}`);
  console.log(`branch_ids: ${options.branchIds.join(', ')}`);
  console.log(`role: ${options.role}`);
}

main().catch((error) => {
  console.error('[BarberOS auth] Falha ao criar usuario Supabase.');
  console.error(error.message);
  process.exitCode = 1;
});
