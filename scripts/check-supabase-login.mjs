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

const email = process.argv[2] ?? 'superadmin@barberos.local';
const password = process.argv[3] ?? 'SuperAdmin@123456';
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configure SUPABASE_URL/SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

console.log(
  JSON.stringify(
    {
      ok: !error,
      error: error ? { code: error.code, message: error.message, status: error.status } : null,
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    },
    null,
    2,
  ),
);
