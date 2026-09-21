import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const email = process.argv[2] ?? 'superadmin@barberos.local';
const password = process.argv[3] ?? 'SuperAdmin@123456';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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
