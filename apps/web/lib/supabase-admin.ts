import { createClient } from '@supabase/supabase-js';
import { parseServerEnv } from '@barberos/config';

export function createSupabaseAdminClient() {
  const env = parseServerEnv(process.env);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations.',
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
