import { NextResponse } from 'next/server';
import { parsePublicEnv } from '@barberos/config';
import { createSupabaseServerClient } from '../../../../lib/auth/server';

export async function POST(request: Request) {
  let client: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    client = await createSupabaseServerClient();
  } catch (error) {
    console.error('[BarberOS auth] Password reset configuration error:', error);
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
    code?: string;
    password?: string;
    confirmPassword?: string;
  } | null;

  if (body?.code) return resetPassword(client, body);
  return sendResetEmail(client, body);
}

async function sendResetEmail(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  body: { email?: string } | null,
) {
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { code: 'INVALID_EMAIL', message: 'Informe um email válido.' },
      { status: 400 },
    );
  }

  const appUrl = parsePublicEnv(process.env).NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/forgotpassword`,
  });

  if (error) {
    console.warn('[BarberOS auth] Password reset request rejected:', error.message);
  }

  return NextResponse.json({ ok: true });
}

async function resetPassword(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  body: { code?: string; password?: string; confirmPassword?: string },
) {
  const code = body.code?.trim();
  const password = body.password ?? '';
  const confirmPassword = body.confirmPassword ?? '';
  if (!code) {
    return NextResponse.json(
      { code: 'INVALID_RESET_CODE', message: 'Link de recuperação inválido ou expirado.' },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { code: 'WEAK_PASSWORD', message: 'A senha precisa ter pelo menos 8 caracteres.' },
      { status: 400 },
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json(
      { code: 'PASSWORD_MISMATCH', message: 'As senhas não conferem.' },
      { status: 400 },
    );
  }

  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.warn('[BarberOS auth] Password reset code rejected:', exchangeError.message);
    return NextResponse.json(
      { code: 'INVALID_RESET_CODE', message: 'Link de recuperação inválido ou expirado.' },
      { status: 400 },
    );
  }

  const { error } = await client.auth.updateUser({ password });
  if (error) {
    console.warn('[BarberOS auth] Password update rejected:', error.message);
    return NextResponse.json(
      { code: 'PASSWORD_UPDATE_FAILED', message: 'Não foi possível atualizar a senha.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
