import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { user, login, loading } = useAuth();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = sp.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  if (!loading && user) return <Navigate to={dest} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await login(email, password); } catch (err: any) { setError(err.message || 'Could not sign in.'); } finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink p-5">
      <form onSubmit={submit} className="w-full max-w-sm bg-paper p-8 shadow-card">
        <p className="eyebrow">Phoenix Enterprise</p>
        <h1 className="mb-6 font-display text-3xl font-extrabold">Sign in</h1>
        <label className="label" htmlFor="li-email">Email</label>
        <input id="li-email" type="email" autoComplete="username" required className="field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label" htmlFor="li-pw">Password</label>
        <input id="li-pw" type="password" autoComplete="current-password" required className="field mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full disabled:opacity-60" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
