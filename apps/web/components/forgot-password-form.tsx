'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Button } from '@barberos/ui';

type ForgotPasswordFormProps = {
  recoveryCode?: string;
};

export function ForgotPasswordForm({ recoveryCode = '' }: ForgotPasswordFormProps) {
  const isResetMode = Boolean(recoveryCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSent(false);
    setReset(false);
    try {
      const payload = isResetMode ? { code: recoveryCode, password, confirmPassword } : { email };
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? 'Não foi possível concluir a ação.');
      if (isResetMode) setReset(true);
      else setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="brand-lockup auth-brand">
          <span className="brand-mark" aria-hidden="true">
            B
          </span>
          <div>
            <div className="brand-name">BarberOS</div>
            <p className="brand-caption">operação inteligente</p>
          </div>
        </div>
        <div>
          <p className="eyebrow">Recuperação segura</p>
          <h1 id="forgot-password-title">
            {isResetMode ? 'Criar nova senha' : 'Esqueci minha senha'}
          </h1>
          <p className="subheading">
            {isResetMode
              ? 'Defina uma nova senha para voltar ao seu workspace BarberOS.'
              : 'Informe o email da sua conta para receber o link de redefinição de senha.'}
          </p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {isResetMode ? (
            <>
              <label htmlFor="password">Nova senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label htmlFor="confirm-password">Confirmar senha</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </>
          )}
          {sent ? (
            <p className="form-success" role="status">
              Se este email estiver cadastrado, enviaremos as instruções de recuperação.
            </p>
          ) : null}
          {reset ? (
            <p className="form-success" role="status">
              Senha atualizada. Você já pode entrar com a nova senha.
            </p>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending || reset}>
            {isResetMode ? (
              <KeyRound size={17} aria-hidden="true" />
            ) : (
              <Mail size={17} aria-hidden="true" />
            )}{' '}
            {pending ? 'Enviando...' : isResetMode ? 'Salvar nova senha' : 'Enviar link'}
          </Button>
        </form>
        <Link className="auth-back-link" href="/login">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar para o login
        </Link>
      </section>
    </main>
  );
}
