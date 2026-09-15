import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listRestaurants, myWorkOrderQueue } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: restaurants, isLoading } = useQuery({ queryKey: ['restaurants'], queryFn: listRestaurants });
  const { data: myQueue } = useQuery({ queryKey: ['work-orders', 'queue', 'me'], queryFn: myWorkOrderQueue });

  const isStaff = user?.roles.some((r) => r === 'ADMIN' || r === 'PROJECT_ENGINEER');

  return (
    <div>
      {(myQueue?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Assigned to you</h1>
          <p className="text-sm text-muted mb-4">
            Maintenance visits an admin or project engineer has assigned you — open one to fill it in.
          </p>
          <div className="space-y-2">
            {myQueue?.map((wo) => (
              <a
                key={wo.id}
                href={`/perform-maintenance/${wo.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 bg-accent-soft border border-accent/40 rounded-xl p-4 hover:opacity-90"
              >
                <div>
                  <div className="font-medium text-accent">{wo.template?.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {wo.equipment.name} <span className="font-mono">({wo.equipment.assetTag})</span> ·{' '}
                    {wo.restaurant.name}
                    {wo.assignedBy ? ` · assigned by ${wo.assignedBy.fullName}` : ''}
                  </div>
                </div>
                <span className="text-accent text-sm font-medium whitespace-nowrap">Open ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold tracking-tight mb-1">{isStaff ? 'All restaurants' : 'Your restaurants'}</h2>
      <p className="text-sm text-muted mb-6">
        {isStaff
          ? 'Every site across every customer — you have unrestricted staff visibility.'
          : 'Scoped to the sites you have been granted access to.'}
      </p>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {!isLoading && restaurants?.length === 0 && (
        <p className="text-sm text-muted">No restaurants yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants?.map((r) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            className="block bg-surface border border-line rounded-xl p-4 hover:border-accent transition-colors"
          >
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">{r.customer?.name}</div>
            <div className="flex items-center gap-2">
              <div className="font-semibold">{r.name}</div>
              {!r.isActive && <span className="text-xs font-mono uppercase text-risk-red">inactive</span>}
            </div>
            <div className="text-sm text-muted mt-1">{r.city ?? '—'}</div>
            <div className="text-xs text-accent-2 mt-3 font-mono">{r._count?.equipment ?? 0} assets registered</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
