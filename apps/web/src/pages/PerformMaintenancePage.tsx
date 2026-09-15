import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { completeWorkOrder, getMaintenanceTemplate, getWorkOrder } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { MaintenancePlanTask, NonConformitySeverity, WorkOrderTaskAnswer } from '../api/types';

interface TaskAnswer {
  resultText?: string;
  resultNumeric?: string;
  resultBoolean?: boolean;
  evidenceNote?: string;
  isNonConformity?: boolean;
  nonConformityDescription?: string;
  nonConformitySeverity?: NonConformitySeverity;
}

const SEVERITIES: NonConformitySeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function groupBySection(tasks: MaintenancePlanTask[]) {
  const groups: { section: string; tasks: MaintenancePlanTask[] }[] = [];
  for (const task of tasks) {
    const last = groups[groups.length - 1];
    if (last && last.section === task.section) last.tasks.push(task);
    else groups.push({ section: task.section, tasks: [task] });
  }
  return groups;
}

export function PerformMaintenancePage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const { user } = useAuth();

  const { data: workOrder, isLoading: isLoadingWorkOrder } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => getWorkOrder(workOrderId!),
    enabled: !!workOrderId,
  });
  const { data: template, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['maintenance-template', workOrder?.templateId],
    queryFn: () => getMaintenanceTemplate(workOrder!.templateId!),
    enabled: !!workOrder?.templateId,
  });

  const [answers, setAnswers] = useState<Record<string, TaskAnswer>>({});
  const [notes, setNotes] = useState('');

  function patch(taskId: string, patchValue: Partial<TaskAnswer>) {
    setAnswers((prev) => ({ ...prev, [taskId]: { ...prev[taskId], ...patchValue } }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const tasks: WorkOrderTaskAnswer[] = (template?.tasks ?? []).map((t) => {
        const a = answers[t.id] ?? {};
        return {
          planTaskId: t.id,
          resultText: a.resultText,
          resultNumeric: a.resultNumeric !== undefined && a.resultNumeric !== '' ? Number(a.resultNumeric) : undefined,
          resultBoolean: a.resultBoolean,
          evidenceNote: a.evidenceNote,
          isNonConformity: a.isNonConformity ?? false,
          nonConformityDescription: a.nonConformityDescription,
          nonConformitySeverity: a.nonConformitySeverity,
        };
      });
      return completeWorkOrder(workOrderId!, { notes: notes || undefined, tasks });
    },
  });

  const sections = useMemo(() => (template ? groupBySection(template.tasks) : []), [template]);
  const flaggedCount = Object.values(answers).filter((a) => a.isNonConformity).length;

  if (isLoadingWorkOrder || isLoadingTemplate || !template || !workOrder) {
    return <div className="max-w-3xl mx-auto p-8 text-sm text-muted">Loading checklist…</div>;
  }

  if (workOrder.status === 'COMPLETED') {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="bg-surface border border-line rounded-xl p-8">
          <h1 className="text-xl font-bold mb-2">Already completed</h1>
          <p className="text-sm text-muted mb-6">This visit was already submitted.</p>
          <Link
            to={`/work-orders/${workOrder.id}`}
            className="bg-accent text-white rounded-md py-2 px-4 text-sm font-medium hover:opacity-90"
          >
            View saved record
          </Link>
        </div>
      </div>
    );
  }

  if (workOrder.performedBy.id !== user?.id && !user?.roles.some((r) => r === 'ADMIN' || r === 'PROJECT_ENGINEER')) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center text-sm text-risk-red">
        This maintenance visit was not assigned to you.
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="bg-surface border border-line rounded-xl p-8">
          <div className="text-risk-green text-3xl mb-3">✓</div>
          <h1 className="text-xl font-bold mb-2">Maintenance record saved</h1>
          <p className="text-sm text-muted mb-6">
            {template.name} for {workOrder.equipment.name} was logged by {user?.fullName}
            {flaggedCount > 0 ? ` — ${flaggedCount} finding${flaggedCount === 1 ? '' : 's'} raised.` : '.'}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to={`/work-orders/${mutation.data.id}`}
              className="bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90"
            >
              View saved record
            </Link>
            <button
              onClick={() => window.close()}
              className="border border-line rounded-md py-2 text-sm font-medium hover:bg-paper"
            >
              Close this window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8 pb-24">
      <div className="mb-6">
        <span className="text-xs font-mono uppercase tracking-wide text-accent-2">{template.code}</span>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{template.name}</h1>
        <p className="text-sm text-muted mt-1">
          {workOrder.equipment.name} <span className="font-mono">({workOrder.equipment.assetTag})</span> ·
          Technician: <span className="font-medium text-ink">{workOrder.performedBy.fullName}</span> ·{' '}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-8"
      >
        {sections.map((group) => (
          <div key={group.section}>
            <h2 className="font-semibold text-ink-soft border-b border-line pb-2 mb-4">{group.section}</h2>
            <div className="space-y-5">
              {group.tasks.map((task) => {
                const a = answers[task.id] ?? {};
                const options: string[] = task.optionsJson ? JSON.parse(task.optionsJson) : [];
                return (
                  <div key={task.id} className="bg-surface border border-line rounded-xl p-4">
                    <p className="text-sm font-medium mb-3">{task.description}</p>

                    {task.expectedResultType === 'CHOICE' && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {options.map((opt) => (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => patch(task.id, { resultText: opt })}
                            className={`rounded-md border px-2.5 py-1 text-xs font-mono ${
                              a.resultText === opt
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-line text-muted hover:bg-paper'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {task.expectedResultType === 'NUMERIC' && (
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="number"
                          value={a.resultNumeric ?? ''}
                          onChange={(e) => patch(task.id, { resultNumeric: e.target.value })}
                          className="w-32 rounded-md border border-line px-3 py-1.5 text-sm"
                        />
                        {task.unit && <span className="text-sm text-muted">{task.unit}</span>}
                      </div>
                    )}

                    {task.expectedResultType === 'BOOLEAN' && (
                      <div className="flex gap-1.5 mb-3">
                        {[
                          { label: 'Pass', value: true },
                          { label: 'Fail', value: false },
                        ].map((opt) => (
                          <button
                            type="button"
                            key={opt.label}
                            onClick={() => patch(task.id, { resultBoolean: opt.value })}
                            className={`rounded-md border px-3 py-1 text-xs font-mono uppercase ${
                              a.resultBoolean === opt.value
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-line text-muted hover:bg-paper'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {task.expectedResultType === 'TEXT' && (
                      <textarea
                        value={a.resultText ?? ''}
                        onChange={(e) => patch(task.id, { resultText: e.target.value })}
                        rows={2}
                        className="w-full rounded-md border border-line px-3 py-1.5 text-sm mb-3"
                      />
                    )}

                    <input
                      value={a.evidenceNote ?? ''}
                      onChange={(e) => patch(task.id, { evidenceNote: e.target.value })}
                      placeholder="Evidence or finding (optional note)"
                      className="w-full rounded-md border border-line px-3 py-1.5 text-xs text-muted mb-2"
                    />

                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={a.isNonConformity ?? false}
                        onChange={(e) => patch(task.id, { isNonConformity: e.target.checked })}
                      />
                      Flag a defect for this item
                    </label>

                    {a.isNonConformity && (
                      <div className="mt-3 border-t border-line pt-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {SEVERITIES.map((sev) => (
                            <button
                              type="button"
                              key={sev}
                              onClick={() => patch(task.id, { nonConformitySeverity: sev })}
                              className={`rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase ${
                                a.nonConformitySeverity === sev
                                  ? 'border-risk-red bg-risk-red-soft text-risk-red'
                                  : 'border-line text-muted hover:bg-paper'
                              }`}
                            >
                              {sev}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={a.nonConformityDescription ?? ''}
                          onChange={(e) => patch(task.id, { nonConformityDescription: e.target.value })}
                          rows={2}
                          placeholder="Describe the defect…"
                          className="w-full rounded-md border border-risk-red/40 px-3 py-1.5 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h2 className="font-semibold text-ink-soft border-b border-line pb-2 mb-4">Visit notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything else worth recording about this visit…"
            className="w-full rounded-md border border-line px-3 py-2 text-sm"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-risk-red">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Could not save this record.'}
          </p>
        )}

        <div className="sticky bottom-0 bg-paper/95 backdrop-blur border-t border-line pt-4 pb-2 -mx-6 px-6 sm:-mx-8 sm:px-8">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-accent text-white rounded-md py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save maintenance record'}
          </button>
        </div>
      </form>
    </div>
  );
}
