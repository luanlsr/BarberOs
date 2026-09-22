import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const filePath of ['.env', '.env.local', 'apps/web/.env.local']) {
  if (!existsSync(filePath)) continue;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const expected = [
  ['admin@modelo.barberos.local', 'OWNER', 2],
  ['recepcao@modelo.barberos.local', 'RECEPTIONIST', 1],
  ['barbeiro1@modelo.barberos.local', 'PROFESSIONAL', 1],
  ['admin@premium-sul.barberos.local', 'OWNER', 2],
  ['recepcao@premium-sul.barberos.local', 'RECEPTIONIST', 1],
  ['barbeiro1@premium-sul.barberos.local', 'PROFESSIONAL', 1],
  ['admin@navalha-urbana.barberos.local', 'OWNER', 2],
  ['recepcao@navalha-urbana.barberos.local', 'RECEPTIONIST', 1],
  ['barbeiro1@navalha-urbana.barberos.local', 'PROFESSIONAL', 1],
  ['superadmin@barberos.local', 'PLATFORM_MASTER', 2],
];

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Configure Supabase URL e service role key para verificar escopos demo.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase();
  for (let page = 1; page <= 30; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

let failed = 0;
for (const [email, role, branchCount] of expected) {
  const user = await findUserByEmail(email);
  if (!user) {
    failed += 1;
    console.log(`FAIL ${email} - user missing`);
    continue;
  }
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id, role, membership_branches(branch_id)')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single();
  if (error || !membership) {
    failed += 1;
    console.log(`FAIL ${email} - active membership missing`);
    continue;
  }
  const actualBranchCount = membership.membership_branches?.length ?? 0;
  if (membership.role !== role || actualBranchCount !== branchCount) {
    failed += 1;
    console.log(
      `FAIL ${email} - role=${membership.role}, branches=${actualBranchCount}; expected role=${role}, branches=${branchCount}`,
    );
    continue;
  }
  console.log(`OK ${email} - ${role}, ${actualBranchCount} filial(is)`);
}

if (failed) process.exitCode = 1;
