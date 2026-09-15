import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { RoleCode } from '../api/types';

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: RoleCode[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-8 text-muted font-mono text-sm">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return (
      <div className="p-8">
        <p className="font-semibold text-risk-red">You don't have access to this page.</p>
        <p className="text-sm text-muted mt-1">Your role: {user.roles.join(', ')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
