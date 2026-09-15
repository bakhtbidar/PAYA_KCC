import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  assignWorkOrder,
  deleteEquipment,
  getEquipment,
  listEquipmentTypes,
  listMaintenanceTemplates,
  listNonConformitiesForEquipment,
  listTechnicians,
  listWorkOrders,
  quickStartWorkOrder,
  updateEquipment,
  updateNonConformityStatus,
  uploadDocument,
} from '../api/endpoints';
import { ApiError, apiDownload } from '../api/client';
import { RiskChip } from '../components/RiskChip';
import { SeverityChip } from '../components/SeverityChip';
import { useAuth } from '../auth/AuthContext';
import type { DocType, EquipmentStatus, NonConformityStatus, RiskLevel } from '../api/types';

const RISK_LEVELS: RiskLevel[] = ['GREEN', 'YELLOW', 'ORANGE', 'RED'];
const DOC_TYPES: DocType[] = ['CERTIFICATE', 'MANUAL', 'REPORT', 'OTHER'];
const EQUIPMENT_STATUSES: EquipmentStatus[] = ['IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED'];

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = user?.roles.some((r) => r === 'ADMIN' || r === 'PROJECT_ENGINEER');
  const isAdmin = user?.roles.includes('ADMIN');
  const canEditEquipment = user?.roles.some((r) => ['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN'].includes(r));
  const canResolveFindings = isStaff;

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipment(id!),
    enabled: !!id,
  });

  const riskMutation = useMutation({
    mutationFn: (riskLevel: RiskLevel) => updateEquipment(id!, { riskLevel }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment', id] }),
  });

  const { data: typeOptions } = useQuery({
    queryKey: ['equipment-types', equipment?.categoryId, id],
    queryFn: () => listEquipmentTypes(equipment?.categoryId),
    enabled: !!equipment && !equipment.type,
  });
  const typeMutation = useMutation({
    mutationFn: (typeId: string) => updateEquipment(id!, { typeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment', id] }),
  });

  const { data: templates } = useQuery({
    queryKey: ['maintenance-templates', equipment?.type?.id],
    queryFn: () => listMaintenanceTemplates(equipment!.type!.id),
    enabled: !!equipment?.type,
  });
  const { data: technicians } = useQuery({
    queryKey: ['technicians', equipment?.restaurantId],
    queryFn: () => listTechnicians(equipment!.restaurantId),
    enabled: !!equipment && isStaff,
  });

  const { data: pending } = useQuery({
    queryKey: ['work-orders', id, 'ASSIGNED'],
    queryFn: () => listWorkOrders(id!, 'ASSIGNED'),
    enabled: !!id,
  });
  const { data: completed } = useQuery({
    queryKey: ['work-orders', id, 'COMPLETED'],
    queryFn: () => listWorkOrders(id!, 'COMPLETED'),
    enabled: !!id,
  });

  const quickStartMutation = useMutation({
    mutationFn: (templateId: string) => quickStartWorkOrder({ equipmentId: id!, templateId }),
    onSuccess: (workOrder) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', id, 'ASSIGNED'] });
      window.open(`/perform-maintenance/${workOrder.id}`, '_blank', 'noopener');
    },
  });

  const [assignTechByTemplate, setAssignTechByTemplate] = useState<Record<string, string>>({});
  const assignMutation = useMutation({
    mutationFn: (templateId: string) =>
      assignWorkOrder({ equipmentId: id!, templateId, assignedToUserId: assignTechByTemplate[templateId] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-orders', id, 'ASSIGNED'] }),
  });

  const { data: findings } = useQuery({
    queryKey: ['non-conformities', 'equipment', id],
    queryFn: () => listNonConformitiesForEquipment(id!),
    enabled: !!id,
  });
  const findingMutation = useMutation({
    mutationFn: ({ ncId, status }: { ncId: string; status: NonConformityStatus }) =>
      updateNonConformityStatus(ncId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['non-conformities', 'equipment', id] }),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>('CERTIFICATE');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (form: FormData) => uploadDocument(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] });
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: (err) => setUploadError(err instanceof ApiError ? err.message : 'Upload failed'),
  });

  function onUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !equipment) return;
    const form = new FormData();
    form.append('file', file);
    form.append('restaurantId', equipment.restaurantId);
    form.append('equipmentId', equipment.id);
    form.append('docType', docType);
    uploadMutation.mutate(form);
  }

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState<EquipmentStatus>('IN_SERVICE');
  const detailsMutation = useMutation({
    mutationFn: () => updateEquipment(id!, { name: editName, serialNumber: editSerial, locationNote: editLocation, status: editStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] });
      setIsEditingDetails(false);
    },
  });
  function startEditingDetails() {
    if (!equipment) return;
    setEditName(equipment.name);
    setEditSerial(equipment.serialNumber ?? '');
    setEditLocation(equipment.locationNote ?? '');
    setEditStatus(equipment.status as EquipmentStatus);
    setIsEditingDetails(true);
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteEquipment(id!),
    onSuccess: (result) => {
      if (result.deleted) {
        navigate(`/restaurants/${equipment!.restaurantId}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['equipment', id] });
        setConfirmingDelete(false);
      }
    },
  });

  if (isLoading || !equipment) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Link to={`/restaurants/${equipment.restaurantId}`} className="text-xs font-mono text-muted hover:text-accent-2">
          &larr; Back to restaurant
        </Link>
        <div className="flex items-center justify-between mt-1 mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
            <RiskChip level={equipment.riskLevel} />
            {equipment.status !== 'IN_SERVICE' && (
              <span className="text-xs font-mono uppercase text-muted border border-line rounded-full px-2 py-0.5">
                {equipment.status.replace('_', ' ')}
              </span>
            )}
          </div>
          {canEditEquipment && !isEditingDetails && (
            <button onClick={startEditingDetails} className="text-xs text-accent-2 hover:underline">
              Edit details
            </button>
          )}
        </div>
        <p className="text-sm text-muted mb-6 font-mono">
          {equipment.assetTag} · {equipment.category.name}
          {equipment.type ? ` · ${equipment.type.name}` : ''}
          {equipment.section ? ` · ${equipment.section.name}` : ''}
          {equipment.serialNumber ? ` · SN ${equipment.serialNumber}` : ''}
        </p>

        {isEditingDetails && (
          <div className="bg-surface border border-line rounded-xl p-4 mb-8 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Serial number</label>
                <input
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Location note</label>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                placeholder="e.g. Behind the pass, next to the ice machine"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as EquipmentStatus)}
                className="w-full max-w-xs rounded-md border border-line px-3 py-1.5 text-sm bg-white"
              >
                {EQUIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => detailsMutation.mutate()}
                  disabled={detailsMutation.isPending}
                  className="bg-accent text-white rounded-md py-1.5 px-4 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingDetails(false)}
                  className="border border-line rounded-md py-1.5 px-4 text-sm font-medium hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
              {isAdmin && (
                <button
                  onClick={() => (confirmingDelete ? deleteMutation.mutate() : setConfirmingDelete(true))}
                  disabled={deleteMutation.isPending}
                  className="text-sm text-risk-red hover:underline"
                >
                  {confirmingDelete ? 'Click again to confirm removal' : 'Remove this asset'}
                </button>
              )}
            </div>
          </div>
        )}

        <h2 className="font-semibold mb-3">Preventive maintenance</h2>
        {!equipment.type ? (
          <div className="bg-surface border border-dashed border-line rounded-xl p-4 mb-8">
            <p className="text-sm text-muted mb-3">
              No equipment type set — set one to enable the PM checklists that apply to this asset.
            </p>
            <select
              onChange={(e) => e.target.value && typeMutation.mutate(e.target.value)}
              disabled={typeMutation.isPending}
              defaultValue=""
              className="w-full max-w-xs rounded-md border border-line px-3 py-1.5 text-sm bg-white"
            >
              <option value="" disabled>
                Choose equipment type…
              </option>
              {typeOptions?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-8 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-2">Applicable checklists</h3>
              <div className="space-y-2">
                {templates?.map((t) => (
                  <div key={t.id} className="bg-surface border border-line rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-sm font-medium">{t.name}</span>
                      {isStaff && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => quickStartMutation.mutate(t.id)}
                            disabled={quickStartMutation.isPending}
                            className="text-xs rounded-md border border-accent bg-accent-soft text-accent px-2.5 py-1 font-medium hover:opacity-90"
                          >
                            Perform now ↗
                          </button>
                          <select
                            value={assignTechByTemplate[t.id] ?? ''}
                            onChange={(e) => setAssignTechByTemplate((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            className="text-xs rounded-md border border-line px-2 py-1 bg-white"
                          >
                            <option value="" disabled>
                              Assign to…
                            </option>
                            {technicians?.map((tech) => (
                              <option key={tech.id} value={tech.id}>
                                {tech.fullName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignMutation.mutate(t.id)}
                            disabled={!assignTechByTemplate[t.id] || assignMutation.isPending}
                            className="text-xs rounded-md border border-line px-2.5 py-1 font-medium hover:bg-paper disabled:opacity-40"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </div>
                    {technicians?.length === 0 && isStaff && (
                      <p className="text-xs text-muted mt-1.5">
                        No technicians have access to this restaurant yet — grant access from the Users page first.
                      </p>
                    )}
                  </div>
                ))}
                {templates?.length === 0 && (
                  <p className="text-sm text-muted">No checklist template is defined for this equipment type yet.</p>
                )}
              </div>
            </div>

            {(pending?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink-soft mb-2">Pending assignments</h3>
                <div className="space-y-2">
                  {pending?.map((wo) => {
                    const isMine = wo.performedBy.id === user?.id;
                    const canContinue = isMine || isStaff;
                    return (
                      <div
                        key={wo.id}
                        className="flex items-center justify-between gap-3 bg-accent-soft/40 border border-accent/30 rounded-xl p-3"
                      >
                        <div className="text-sm">
                          <span className="font-medium">{wo.template?.name}</span>
                          <span className="text-muted">
                            {' '}
                            — assigned to {wo.performedBy.fullName}
                            {wo.assignedBy ? ` by ${wo.assignedBy.fullName}` : ''}
                          </span>
                        </div>
                        {canContinue ? (
                          <a
                            href={`/perform-maintenance/${wo.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent-2 hover:underline whitespace-nowrap"
                          >
                            Continue ↗
                          </a>
                        ) : (
                          <span className="text-xs text-muted whitespace-nowrap">awaiting technician</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-2">Visit history</h3>
              <div className="border border-line rounded-xl overflow-hidden bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-left px-4 py-2">Checklist</th>
                      <th className="text-left px-4 py-2">Technician</th>
                      <th className="text-left px-4 py-2">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed?.map((wo) => (
                      <tr key={wo.id} className="border-t border-line">
                        <td className="px-4 py-2 text-muted">
                          <Link to={`/work-orders/${wo.id}`} className="text-accent-2 hover:underline">
                            {new Date(wo.completedAt ?? wo.startedAt).toLocaleDateString()}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{wo.template?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-muted">{wo.performedBy.fullName}</td>
                        <td className="px-4 py-2">
                          {wo._count.nonConformities > 0 ? (
                            <span className="text-xs font-mono text-risk-orange">{wo._count.nonConformities} flagged</span>
                          ) : (
                            <span className="text-xs font-mono text-risk-green">clean</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {completed?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted">
                          No maintenance visits logged for this asset yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <h2 className="font-semibold mb-3">Findings</h2>
        <div className="border border-line rounded-xl overflow-hidden bg-surface mb-8">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left px-4 py-2">Reported</th>
                <th className="text-left px-4 py-2">Severity</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Status</th>
                {canResolveFindings && <th className="text-left px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {findings?.map((f) => (
                <tr key={f.id} className="border-t border-line align-top">
                  <td className="px-4 py-2 text-muted whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <SeverityChip severity={f.severity} />
                  </td>
                  <td className="px-4 py-2">
                    {f.description}
                    <div className="text-xs text-muted mt-0.5">reported by {f.reportedBy.fullName}</div>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-muted">{f.status}</td>
                  {canResolveFindings && (
                    <td className="px-4 py-2 text-right">
                      {f.status !== 'RESOLVED' && (
                        <button
                          onClick={() => findingMutation.mutate({ ncId: f.id, status: 'RESOLVED' })}
                          disabled={findingMutation.isPending}
                          className="text-xs text-accent-2 hover:underline"
                        >
                          Mark resolved
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {findings?.length === 0 && (
                <tr>
                  <td colSpan={canResolveFindings ? 5 : 4} className="px-4 py-6 text-center text-muted">
                    No findings reported for this asset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="font-semibold mb-3">Risk classification</h2>
        <p className="text-xs text-muted mb-2">PAYA Risk Scale — SOP Phase 1 §4.3</p>
        <div className="flex gap-2 mb-8">
          {RISK_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => riskMutation.mutate(level)}
              disabled={riskMutation.isPending}
              className={`rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wide ${
                equipment.riskLevel === level ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:bg-paper'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <h2 className="font-semibold mb-3">Compliance documents</h2>
        <div className="border border-line rounded-xl overflow-hidden bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Expires</th>
                <th className="text-left px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {equipment.documents.map((doc) => (
                <tr key={doc.id} className="border-t border-line">
                  <td className="px-4 py-2">{doc.name}</td>
                  <td className="px-4 py-2 text-muted font-mono text-xs">{doc.docType}</td>
                  <td className="px-4 py-2 text-muted">
                    {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.name)}
                      className="text-accent-2 hover:underline text-xs"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {equipment.documents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    No documents attached to this asset yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-semibold mb-3">QR tag</h2>
          <div className="bg-surface border border-line rounded-xl p-4 text-center">
            <img src={equipment.qrCodeDataUrl} alt={`QR code for ${equipment.assetTag}`} className="mx-auto w-40 h-40" />
            <p className="mt-3 font-mono text-sm">{equipment.assetTag}</p>
            <a
              href={equipment.qrCodeDataUrl}
              download={`${equipment.assetTag}.png`}
              className="inline-block mt-3 text-xs text-accent-2 hover:underline"
            >
              Download sticker PNG
            </a>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Upload document</h2>
          <form onSubmit={onUpload} className="bg-surface border border-line rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">File</label>
              <input ref={fileRef} type="file" required className="w-full text-sm" />
            </div>
            {uploadError && <p className="text-sm text-risk-red">{uploadError}</p>}
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
