import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/auth/server';

export async function POST(request: Request) {
  const client = await createSupabaseServerClient();
  if (!client)
    return NextResponse.json(
      {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'Autenticacao ainda nao foi configurada neste ambiente.',
      },
      { status: 503 },
    );
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  if (!body?.email || !body.password)
    return NextResponse.json(
      { code: 'INVALID_CREDENTIALS', message: 'Email e senha sao obrigatorios.' },
      { status: 400 },
    );
  const { error } = await client.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error)
    return NextResponse.json(
      {
        code: 'INVALID_CREDENTIALS',
        message: 'Nao foi possivel autenticar com essas credenciais.',
      },
      { status: 401 },
    );
  return NextResponse.json({ ok: true });
}
