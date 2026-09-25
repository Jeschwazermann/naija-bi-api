import { useState } from 'react';
import type { FormEvent } from 'react';
import { AUTH_API } from '../api/client';
import { useSession } from '../hooks/useSession';
import type { AuthResponse } from '../api/types';

type Mode = 'login' | 'register';

export function AuthView() {
  const { login } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    const body =
      mode === 'login'
        ? { email: form.get('email'), password: form.get('password') }
        : {
            businessName: form.get('businessName'),
            email: form.get('email'),
            password: form.get('password'),
          };

    try {
      const res = await fetch(`${AUTH_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AuthResponse & { message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Something went wrong');
      login(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-view">
      <div className="auth-card">
        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? "Log in to see today's numbers."
            : 'A few details and you can start uploading.'}
        </p>

        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className="field">
              <span>Business name</span>
              <input type="text" name="businessName" autoComplete="organization" required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
            {mode === 'register' && <small>At least 8 characters.</small>}
          </label>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button type="button" className="btn-link" onClick={() => setMode('register')}>
                Create a business account
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button type="button" className="btn-link" onClick={() => setMode('login')}>
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
