'use client';

import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@barberos/ui';

export function AuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Não foi possível autenticar.');
      }
      window.location.assign('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
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
          <p className="eyebrow">Acesso seguro</p>
          <h1 id="auth-title">Entrar no BarberOS</h1>
          <p className="subheading">Use seu email e senha para acessar o workspace autorizado.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
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
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            <LogIn size={17} aria-hidden="true" /> {pending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </section>
    </main>
  );
}
