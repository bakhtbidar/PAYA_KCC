import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  grantRestaurantAccess,
  listRestaurants,
  listUsers,
  revokeRestaurantAccess,
} from '../api/endpoints';
import { ApiError } from '../api/client';
import type { RoleCode, SiteRole } from '../api/types';

const ROLES: RoleCode[] = ['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN', 'CUSTOMER', 'AUTHORITY'];
const SITE_ROLES: SiteRole[] = ['OWNER', 'MANAGER', 'TECHNICIAN', 'AUTHORITY', 'VIEW_ONLY'];

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: restaurants } = useQuery({ queryKey: ['restaurants'], queryFn: listRestaurants });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<RoleCode>('TECHNICIAN');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createUser({ email, password, fullName, roleCodes: [role] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEmail('');
      setPassword('');
      setFullName('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create user'),
  });

  const [grantUserId, setGrantUserId] = useState('');
  const [grantRestaurantId, setGrantRestaurantId] = useState('');
  const [grantRole, setGrantRole] = useState<SiteRole>('MANAGER');
  const grantMutation = useMutation({
    mutationFn: () =>
      grantRestaurantAccess(grantUserId, { restaurantId: grantRestaurantId, roleAtSite: grantRole }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, accessId }: { userId: string; accessId: string }) =>
      revokeRestaurantAccess(userId, accessId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Users</h1>
        <p className="text-sm text-muted mb-6">Accounts and the specific restaurants each one can see.</p>

        {isLoading && <p className="text-sm text-muted">Loading…</p>}

        <div className="space-y-3">
          {users?.map((u) => (
            <div key={u.id} className="bg-surface border border-line rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted font-mono">{u.email}</div>
                </div>
                <div className="flex gap-1">
                  {u.roles.map((r) => (
                    <span
                      key={r.role.code}
                      className="text-xs font-mono uppercase px-2 py-0.5 rounded-full bg-accent-soft text-accent"
                    >
                      {r.role.code}
                    </span>
                  ))}
                </div>
              </div>
              {u.restaurantAccess.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-2">
                  {u.restaurantAccess.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-2 text-xs bg-paper border border-line rounded-full pl-3 pr-1.5 py-1"
                    >
                      {a.restaurant.name} · {a.roleAtSite}
                      <button
                        onClick={() => revokeMutation.mutate({ userId: u.id, accessId: a.id })}
                        className="w-4 h-4 rounded-full hover:bg-risk-red-soft hover:text-risk-red text-muted leading-none"
                        title="Revoke access"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-semibold mb-3">New user</h2>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
            className="bg-surface border border-line rounded-xl p-4 space-y-3"
          >
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Full name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">
                Temporary password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleCode)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-risk-red">{error}</p>}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Grant restaurant access</h2>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              grantMutation.mutate();
            }}
            className="bg-surface border border-line rounded-xl p-4 space-y-3"
          >
            <select
              required
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
            >
              <option value="" disabled>
                User…
              </option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <select
              required
              value={grantRestaurantId}
              onChange={(e) => setGrantRestaurantId(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
            >
              <option value="" disabled>
                Restaurant…
              </option>
              {restaurants?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={grantRole}
              onChange={(e) => setGrantRole(e.target.value as SiteRole)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
            >
              {SITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={grantMutation.isPending}
              className="w-full border border-line rounded-md py-2 text-sm font-medium hover:bg-paper disabled:opacity-50"
            >
              {grantMutation.isPending ? 'Granting…' : 'Grant access'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
