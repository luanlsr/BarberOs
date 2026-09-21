import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_IDS = ['00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012'];
const SERVICE_IDS = [
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000203',
];

const ACCESS_PROFILES = {
  superAdmin: {
    email: 'superadmin@barberos.local',
    password: 'SuperAdmin@123456',
    fullName: 'Super Admin BarberOS',
    role: 'PLATFORM_MASTER',
    branchIds: BRANCH_IDS,
    platformRole: 'PLATFORM_MASTER',
  },
  admin: {
    email: 'admin@barberos.local',
    password: 'Admin@123456',
    fullName: 'Admin Barbearia Modelo',
    role: 'OWNER',
    branchIds: BRANCH_IDS,
  },
  user: {
    email: 'recepcao@barberos.local',
    password: 'Recepcao@123456',
    fullName: 'Recepcao Barbearia Modelo',
    role: 'RECEPTIONIST',
    branchIds: BRANCH_IDS,
  },
  barber: {
    email: 'barbeiro@barberos.local',
    password: 'Barbeiro@123456',
    fullName: 'Barbeiro Demo',
    role: 'PROFESSIONAL',
    branchIds: [BRANCH_IDS[0]],
    professional: true,
  },
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

async function createOrUpdateAuthUser(supabase, { email, password, fullName, role }) {
  const metadata = {
    full_name: fullName,
    name: fullName,
    barberos_role: role,
  };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
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
        ...metadata,
      },
    },
  );

  if (updateError) throw updateError;
  return { user: updated.user, action: 'updated' };
}

async function ensureSeedTenantAndBranches(supabase) {
  const { error: tenantError } = await supabase.from('tenants').upsert(
    {
      id: TENANT_ID,
      name: 'Barbearia Modelo',
      status: 'ACTIVE',
    },
    { onConflict: 'id' },
  );
  if (tenantError) throw tenantError;

  const branches = BRANCH_IDS.map((branchId, index) => ({
    id: branchId,
    tenant_id: TENANT_ID,
    name: index === 0 ? 'Unidade Centro' : 'Unidade Norte',
    status: 'ACTIVE',
  }));

  const { error: branchesError } = await supabase
    .from('branches')
    .upsert(branches, { onConflict: 'id' });
  if (branchesError) throw branchesError;

  const services = [
    {
      id: SERVICE_IDS[0],
      tenant_id: TENANT_ID,
      category: 'Cabelo',
      name: 'Corte Masculino',
      description: 'Corte na tesoura ou maquina com finalizacao.',
      duration_minutes: 40,
      price_cents: 5000,
      estimated_cost_cents: 800,
      status: 'ACTIVE',
    },
    {
      id: SERVICE_IDS[1],
      tenant_id: TENANT_ID,
      category: 'Barba',
      name: 'Barba',
      description: 'Modelagem de barba com toalha quente.',
      duration_minutes: 30,
      price_cents: 3500,
      estimated_cost_cents: 600,
      status: 'ACTIVE',
    },
    {
      id: SERVICE_IDS[2],
      tenant_id: TENANT_ID,
      category: 'Combos',
      name: 'Corte + Barba',
      description: 'Combo operacional para agenda e comanda.',
      duration_minutes: 70,
      price_cents: 8000,
      estimated_cost_cents: 1200,
      status: 'ACTIVE',
    },
  ];

  const { error: servicesError } = await supabase
    .from('services')
    .upsert(services, { onConflict: 'id' });
  if (servicesError) throw servicesError;
}

async function ensureMembership(supabase, { userId, branchIds, role }) {
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .upsert(
      {
        user_id: userId,
        tenant_id: TENANT_ID,
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

async function ensurePlatformMembership(supabase, { userId, platformRole }) {
  if (!platformRole) return null;

  const { data, error } = await supabase
    .from('platform_memberships')
    .upsert(
      {
        user_id: userId,
        role: platformRole,
        status: 'ACTIVE',
      },
      { onConflict: 'user_id' },
    )
    .select('id')
    .single();

  if (error) {
    if (error.code === '42P01' || error.message.includes('platform_memberships')) return null;
    throw error;
  }

  return data.id;
}

async function ensureProfessionalIdentity(supabase, { userId, email, fullName, branchIds }) {
  const { error: professionalError } = await supabase.from('professionals').upsert(
    {
      id: userId,
      tenant_id: TENANT_ID,
      display_name: fullName,
      email,
      role_label: 'Barbeiro',
      status: 'ACTIVE',
    },
    { onConflict: 'id' },
  );
  if (professionalError) throw professionalError;

  const professionalBranches = branchIds.map((branchId) => ({
    professional_id: userId,
    tenant_id: TENANT_ID,
    branch_id: branchId,
  }));

  const { error: branchError } = await supabase
    .from('professional_branches')
    .upsert(professionalBranches, { onConflict: 'professional_id,branch_id' });
  if (branchError) throw branchError;

  const serviceLinks = SERVICE_IDS.map((serviceId) => ({
    service_id: serviceId,
    professional_id: userId,
    tenant_id: TENANT_ID,
  }));

  const { error: serviceError } = await supabase
    .from('service_professionals')
    .upsert(serviceLinks, { onConflict: 'service_id,professional_id' });
  if (serviceError) throw serviceError;
}

function selectedProfiles() {
  const profile = readOption('profile', 'all');
  if (profile === 'all') return Object.entries(ACCESS_PROFILES);
  if (!ACCESS_PROFILES[profile]) {
    throw new Error(`Perfil invalido: ${profile}. Use all, superAdmin, admin, user ou barber.`);
  }
  return [[profile, ACCESS_PROFILES[profile]]];
}

async function main() {
  loadEnvFile(path.join(rootDir, '.env'));
  loadEnvFile(path.join(rootDir, '.env.local'));
  loadEnvFile(path.join(rootDir, 'apps', 'web', '.env.local'));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local antes de criar os usuarios.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await ensureSeedTenantAndBranches(supabase);

  const results = [];
  for (const [key, profile] of selectedProfiles()) {
    const { user, action } = await createOrUpdateAuthUser(supabase, profile);
    const membershipId = await ensureMembership(supabase, {
      userId: user.id,
      branchIds: profile.branchIds,
      role: profile.role,
    });
    const platformMembershipId = await ensurePlatformMembership(supabase, {
      userId: user.id,
      platformRole: profile.platformRole,
    });

    if (profile.professional) {
      await ensureProfessionalIdentity(supabase, {
        userId: user.id,
        email: profile.email,
        fullName: profile.fullName,
        branchIds: profile.branchIds,
      });
    }

    results.push({ key, profile, user, action, membershipId, platformMembershipId });
  }

  console.log('[BarberOS auth] Usuarios Supabase prontos.');
  for (const result of results) {
    console.log('');
    console.log(`${result.key}: ${result.profile.fullName}`);
    console.log(`acao: ${result.action}`);
    console.log(`email: ${result.profile.email}`);
    console.log(`senha: ${result.profile.password}`);
    console.log(`role: ${result.profile.role}`);
    console.log(`user_id: ${result.user.id}`);
    console.log(`membership_id: ${result.membershipId}`);
    if (result.platformMembershipId)
      console.log(`platform_membership_id: ${result.platformMembershipId}`);
    console.log(`branch_ids: ${result.profile.branchIds.join(', ')}`);
  }
}

main().catch((error) => {
  console.error('[BarberOS auth] Falha ao criar usuarios Supabase.');
  console.error(error.message);
  process.exitCode = 1;
});
