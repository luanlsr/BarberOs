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

const credentials = [
  ['admin@modelo.barberos.local', 'Admin@123456'],
  ['recepcao@modelo.barberos.local', 'Recepcao@123456'],
  ['barbeiro1@modelo.barberos.local', 'Barbeiro@123456'],
  ['admin@premium-sul.barberos.local', 'Admin@123456'],
  ['recepcao@premium-sul.barberos.local', 'Recepcao@123456'],
  ['barbeiro1@premium-sul.barberos.local', 'Barbeiro@123456'],
  ['admin@navalha-urbana.barberos.local', 'Admin@123456'],
  ['recepcao@navalha-urbana.barberos.local', 'Recepcao@123456'],
  ['barbeiro1@navalha-urbana.barberos.local', 'Barbeiro@123456'],
  ['superadmin@barberos.local', 'SuperAdmin@123456'],
];

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure Supabase URL e anon key para verificar logins demo.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failed = 0;
for (const [email, password] of credentials) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    failed += 1;
    console.log(`FAIL ${email} - ${error.message}`);
  } else {
    console.log(`OK ${email}`);
    await supabase.auth.signOut();
  }
}

if (failed) process.exitCode = 1;
