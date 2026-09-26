import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';
import {
  BARBEROS_SESSION_EXPIRES_AT_COOKIE,
  BARBEROS_SESSION_ID_COOKIE,
  readJwtSessionMetadata,
  sessionCookieOptions,
} from '../../../../lib/auth/jwt-session';

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

  const { data, error } = await client.auth.signInWithPassword({
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

  const metadata = readJwtSessionMetadata(data.session?.access_token);
  if (!metadata)
    return NextResponse.json(
      {
        code: 'INVALID_SESSION_TOKEN',
        message: 'Sessão criada sem token válido. Tente entrar novamente.',
      },
      { status: 401 },
    );

  const response = NextResponse.json({
    ok: true,
    sessionId: metadata.sessionId,
    sessionExpiresAt: metadata.sessionExpiresAt,
  });
  const options = sessionCookieOptions(metadata.maxAgeSeconds);
  response.cookies.set(BARBEROS_SESSION_ID_COOKIE, metadata.sessionId, options);
  response.cookies.set(BARBEROS_SESSION_EXPIRES_AT_COOKIE, metadata.sessionExpiresAt, options);
  return response;
}
