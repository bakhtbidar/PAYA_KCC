import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', roles: undefined },
  { to: '/customers', label: 'Customers', roles: ['ADMIN', 'PROJECT_ENGINEER'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
  { to: '/audit-log', label: 'Audit log', roles: ['ADMIN', 'PROJECT_ENGINEER'] },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold tracking-tight text-lg">
              PAYA <span className="text-accent">Control</span>
            </span>
            <nav className="flex items-center gap-1">
              {NAV.filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r as never))).map(
                (item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-md text-sm font-medium ${
                        isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-paper'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-xs text-muted font-mono">{user?.roles.join(', ')}</div>
            </div>
            <button
              onClick={() => void logout()}
              className="px-3 py-1.5 rounded-md border border-line text-ink-soft hover:bg-paper text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
