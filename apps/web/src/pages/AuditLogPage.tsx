import { useQuery } from '@tanstack/react-query';
import { listAuditLog } from '../api/endpoints';

export function AuditLogPage() {
  const { data: entries, isLoading } = useQuery({ queryKey: ['audit-log'], queryFn: listAuditLog });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Audit log</h1>
      <p className="text-sm text-muted mb-6">
        Write-once trail of every create/update/delete and login — the §2 addition the pilot schema didn't have.
      </p>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      <div className="border border-line rounded-xl overflow-hidden bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left px-4 py-2">When</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Entity</th>
              <th className="text-left px-4 py-2">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id} className="border-t border-line font-mono text-xs">
                <td className="px-4 py-2 text-muted">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">{e.action}</td>
                <td className="px-4 py-2 text-muted">
                  {e.entityType}
                  {e.entityId ? ` · ${e.entityId.slice(0, 12)}…` : ''}
                </td>
                <td className="px-4 py-2 text-muted">{e.actorUserId ? e.actorUserId.slice(0, 12) + '…' : '—'}</td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
