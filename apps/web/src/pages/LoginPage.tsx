import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            PAYA <span className="text-accent">Control</span>
          </h1>
          <p className="text-sm text-muted mt-1">Kitchen Control Center</p>
        </div>
        <form onSubmit={onSubmit} className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="text-sm text-risk-red">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-muted text-center mt-4 font-mono">
          Seeded accounts: admin@paya.local · engineer@paya.local · tech@paya.local · manager@bambam.example
          <br />
          (password: ChangeMe123!)
        </p>
      </div>
    </div>
  );
}
