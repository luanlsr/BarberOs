import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';

export async function POST(request: Request) {
  let client: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    client = await createSupabaseServerClient();
  } catch (error) {
    console.error('[BarberOS auth] Sign-in configuration error:', error);
    return NextResponse.json(
      {
        code: 'AUTH_CONFIGURATION_ERROR',
        message:
          'Configuração do Supabase inválida. Confira SUPABASE_URL e SUPABASE_ANON_KEY no .env.local.',
      },
      { status: 503 },
    );
  }

  if (!client)
    return NextResponse.json(
      {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'Autenticação ainda não foi configurada neste ambiente.',
      },
      { status: 503 },
    );

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  if (!body?.email || !body.password)
    return NextResponse.json(
      { code: 'INVALID_CREDENTIALS', message: 'Email e senha são obrigatórios.' },
      { status: 400 },
    );

  const { error } = await client.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error) {
    console.warn('[BarberOS auth] Sign-in rejected:', error.message);
    return NextResponse.json(
      {
        code: 'INVALID_CREDENTIALS',
        message: 'Não foi possível autenticar com essas credenciais.',
      },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true });
}
