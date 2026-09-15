import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { updateWorkOrder, getWorkOrder } from '../api/endpoints';
import { SeverityChip } from '../components/SeverityChip';
import { useAuth } from '../auth/AuthContext';
import type { WorkOrderTaskCorrection, WorkOrderTaskResult } from '../api/types';

function groupBySection(tasks: WorkOrderTaskResult[]) {
  const groups: { section: string; tasks: WorkOrderTaskResult[] }[] = [];
  for (const task of [...tasks].sort((a, b) => a.taskOrder - b.taskOrder)) {
    const last = groups[groups.length - 1];
    if (last && last.section === task.section) last.tasks.push(task);
    else groups.push({ section: task.section, tasks: [task] });
  }
  return groups;
}

function resultLabel(task: WorkOrderTaskResult): string {
  if (task.expectedResultType === 'CHOICE' || task.expectedResultType === 'TEXT') return task.resultText || '—';
  if (task.expectedResultType === 'NUMERIC') return task.resultNumeric != null ? `${task.resultNumeric} ${task.unit ?? ''}`.trim() : '—';
  if (task.expectedResultType === 'BOOLEAN') return task.resultBoolean === true ? 'Pass' : task.resultBoolean === false ? 'Fail' : '—';
  return '—';
}

interface Correction {
  resultText?: string;
  resultNumeric?: string;
  resultBoolean?: boolean;
  evidenceNote?: string;
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => getWorkOrder(id!),
    enabled: !!id,
  });

  const sections = useMemo(() => (workOrder ? groupBySection(workOrder.tasks) : []), [workOrder]);

  const [isEditing, setIsEditing] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, Correction>>({});

  const correctionMutation = useMutation({
    mutationFn: () => {
      const tasks: WorkOrderTaskCorrection[] = Object.entries(corrections).map(([workOrderTaskId, c]) => ({
        workOrderTaskId,
        resultText: c.resultText,
        resultNumeric: c.resultNumeric !== undefined && c.resultNumeric !== '' ? Number(c.resultNumeric) : undefined,
        resultBoolean: c.resultBoolean,
        evidenceNote: c.evidenceNote,
      }));
      return updateWorkOrder(id!, { tasks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setIsEditing(false);
    },
  });

  function startEditing() {
    if (!workOrder) return;
    const seed: Record<string, Correction> = {};
    for (const t of workOrder.tasks) {
      seed[t.id] = {
        resultText: t.resultText ?? undefined,
        resultNumeric: t.resultNumeric != null ? String(t.resultNumeric) : undefined,
        resultBoolean: t.resultBoolean ?? undefined,
        evidenceNote: t.evidenceNote ?? undefined,
      };
    }
    setCorrections(seed);
    setIsEditing(true);
  }
  function patch(taskId: string, value: Partial<Correction>) {
    setCorrections((prev) => ({ ...prev, [taskId]: { ...prev[taskId], ...value } }));
  }

  if (isLoading || !workOrder) return <p className="text-sm text-muted">Loading…</p>;

  const canEdit = user?.id === workOrder.performedBy.id || user?.roles.some((r) => r === 'ADMIN' || r === 'PROJECT_ENGINEER');

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/equipment/${workOrder.equipment.id}`} className="text-xs font-mono text-muted hover:text-accent-2">
        &larr; Back to {workOrder.equipment.name}
      </Link>
      <div className="flex items-center justify-between mt-1 mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{workOrder.template?.name ?? 'Maintenance visit'}</h1>
        {canEdit && !isEditing && (
          <button onClick={startEditing} className="text-xs text-accent-2 hover:underline">
            Correct this record
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-8">
        {workOrder.equipment.name} <span className="font-mono">({workOrder.equipment.assetTag})</span> · Performed by{' '}
        <span className="font-medium text-ink">{workOrder.performedBy.fullName}</span> on{' '}
        {new Date(workOrder.completedAt ?? workOrder.startedAt).toLocaleString()}
      </p>

      {isEditing && (
        <p className="text-xs text-accent-2 bg-accent-soft border border-accent/30 rounded-lg p-3 mb-6">
          Editing mode — change any answer below, then save. This corrects the existing record; it doesn't create a
          new visit.
        </p>
      )}

      {workOrder.nonConformities.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-3">Findings from this visit</h2>
          <div className="space-y-2">
            {workOrder.nonConformities.map((nc) => (
              <div key={nc.id} className="bg-risk-red-soft/40 border border-risk-red/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityChip severity={nc.severity} />
                  <span className="text-xs font-mono text-muted">{nc.status}</span>
                </div>
                <p className="text-sm">{nc.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">
            To retract or resolve a finding, use the Findings list on the equipment page — corrections here only fix
            checklist answers.
          </p>
        </div>
      )}

      {workOrder.notes && !isEditing && (
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Visit notes</h2>
          <p className="text-sm text-ink-soft bg-surface border border-line rounded-lg p-3">{workOrder.notes}</p>
        </div>
      )}

      {sections.map((group) => (
        <div key={group.section} className="mb-6">
          <h2 className="font-semibold text-ink-soft border-b border-line pb-2 mb-3">{group.section}</h2>

          {!isEditing ? (
            <div className="border border-line rounded-xl overflow-hidden bg-surface">
              <table className="w-full text-sm">
                <tbody>
                  {group.tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`border-t border-line first:border-t-0 align-top ${task.isNonConformity ? 'bg-risk-red-soft/30' : ''}`}
                    >
                      <td className="px-4 py-2.5 w-1/2">{task.description}</td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{resultLabel(task)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted">{task.evidenceNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {group.tasks.map((task) => {
                const c = corrections[task.id] ?? {};
                const options: string[] = task.optionsJson ? JSON.parse(task.optionsJson) : [];
                return (
                  <div key={task.id} className="bg-surface border border-line rounded-xl p-3">
                    <p className="text-sm font-medium mb-2">{task.description}</p>
                    {task.expectedResultType === 'CHOICE' && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => patch(task.id, { resultText: opt })}
                            className={`rounded-md border px-2.5 py-1 text-xs font-mono ${
                              c.resultText === opt ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:bg-paper'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {task.expectedResultType === 'NUMERIC' && (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          value={c.resultNumeric ?? ''}
                          onChange={(e) => patch(task.id, { resultNumeric: e.target.value })}
                          className="w-32 rounded-md border border-line px-3 py-1.5 text-sm"
                        />
                        {task.unit && <span className="text-sm text-muted">{task.unit}</span>}
                      </div>
                    )}
                    {task.expectedResultType === 'BOOLEAN' && (
                      <div className="flex gap-1.5 mb-2">
                        {[
                          { label: 'Pass', value: true },
                          { label: 'Fail', value: false },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => patch(task.id, { resultBoolean: opt.value })}
                            className={`rounded-md border px-3 py-1 text-xs font-mono uppercase ${
                              c.resultBoolean === opt.value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:bg-paper'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {task.expectedResultType === 'TEXT' && (
                      <textarea
                        value={c.resultText ?? ''}
                        onChange={(e) => patch(task.id, { resultText: e.target.value })}
                        rows={2}
                        className="w-full rounded-md border border-line px-3 py-1.5 text-sm mb-2"
                      />
                    )}
                    <input
                      value={c.evidenceNote ?? ''}
                      onChange={(e) => patch(task.id, { evidenceNote: e.target.value })}
                      placeholder="Evidence or finding (optional note)"
                      className="w-full rounded-md border border-line px-3 py-1.5 text-xs text-muted"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {isEditing && (
        <div className="sticky bottom-0 bg-paper/95 backdrop-blur border-t border-line pt-4 pb-6 -mx-6 px-6 flex gap-2">
          <button
            onClick={() => correctionMutation.mutate()}
            disabled={correctionMutation.isPending}
            className="bg-accent text-white rounded-md py-2 px-5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {correctionMutation.isPending ? 'Saving…' : 'Save corrections'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="border border-line rounded-md py-2 px-5 text-sm font-medium hover:bg-paper"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
