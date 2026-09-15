import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addSection,
  createEquipment,
  deleteRestaurant,
  getRestaurant,
  listEquipmentCategories,
  listEquipmentTypes,
  updateRestaurant,
} from '../api/endpoints';
import { ApiError } from '../api/client';
import { RiskChip } from '../components/RiskChip';
import { useAuth } from '../auth/AuthContext';

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRegisterEquipment = user?.roles.some((r) => ['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN'].includes(r));
  const canConfigure = user?.roles.some((r) => ['ADMIN', 'PROJECT_ENGINEER'].includes(r));
  const isAdmin = user?.roles.includes('ADMIN');

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => getRestaurant(id!),
    enabled: !!id,
  });
  const { data: categories } = useQuery({ queryKey: ['equipment-categories'], queryFn: listEquipmentCategories });

  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const restaurantMutation = useMutation({
    mutationFn: () =>
      updateRestaurant(id!, { name: editName, code: editCode || undefined, city: editCity || undefined, addressLine: editAddress || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setIsEditingRestaurant(false);
    },
  });
  function startEditingRestaurant() {
    if (!restaurant) return;
    setEditName(restaurant.name);
    setEditCode(restaurant.code ?? '');
    setEditCity(restaurant.city ?? '');
    setEditAddress(restaurant.addressLine ?? '');
    setIsEditingRestaurant(true);
  }

  const [confirmingRestaurantDelete, setConfirmingRestaurantDelete] = useState(false);
  const restaurantDeleteMutation = useMutation({
    mutationFn: () => deleteRestaurant(id!),
    onSuccess: (result) => {
      if (result.deleted) {
        navigate('/');
      } else {
        queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
        setConfirmingRestaurantDelete(false);
      }
    },
  });

  const [sectionName, setSectionName] = useState('');
  const [sectionError, setSectionError] = useState<string | null>(null);
  const sectionMutation = useMutation({
    mutationFn: (name: string) => addSection(id!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
      setSectionName('');
    },
    onError: (err) => setSectionError(err instanceof ApiError ? err.message : 'Could not add section'),
  });

  const [eqName, setEqName] = useState('');
  const [eqCategoryId, setEqCategoryId] = useState('');
  const [eqTypeId, setEqTypeId] = useState('');
  const [eqSectionId, setEqSectionId] = useState('');
  const [eqError, setEqError] = useState<string | null>(null);
  const { data: equipmentTypes } = useQuery({
    queryKey: ['equipment-types', eqCategoryId],
    queryFn: () => listEquipmentTypes(eqCategoryId),
    enabled: !!eqCategoryId,
  });
  const equipmentMutation = useMutation({
    mutationFn: () =>
      createEquipment({
        restaurantId: id!,
        name: eqName,
        categoryId: eqCategoryId,
        typeId: eqTypeId || undefined,
        sectionId: eqSectionId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
      setEqName('');
      setEqTypeId('');
    },
    onError: (err) => setEqError(err instanceof ApiError ? err.message : 'Could not register equipment'),
  });

  if (isLoading || !restaurant) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Link to="/" className="text-xs font-mono text-muted hover:text-accent-2">
          &larr; Dashboard
        </Link>
        <div className="flex items-center justify-between mt-1 mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
            {restaurant.code && <span className="text-xs font-mono text-muted">{restaurant.code}</span>}
            {!restaurant.isActive && (
              <span className="text-xs font-mono uppercase text-risk-red border border-risk-red/40 rounded-full px-2 py-0.5">
                Inactive
              </span>
            )}
          </div>
          {canConfigure && !isEditingRestaurant && (
            <button onClick={startEditingRestaurant} className="text-xs text-accent-2 hover:underline">
              Edit restaurant
            </button>
          )}
        </div>
        <p className="text-sm text-muted mb-6">
          {restaurant.customer?.name} · {restaurant.city ?? '—'}
        </p>

        {isEditingRestaurant && (
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
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Site code</label>
                <input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">City</label>
                <input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Address</label>
                <input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => restaurantMutation.mutate()}
                  disabled={restaurantMutation.isPending}
                  className="bg-accent text-white rounded-md py-1.5 px-4 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingRestaurant(false)}
                  className="border border-line rounded-md py-1.5 px-4 text-sm font-medium hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
              {isAdmin && (
                <button
                  onClick={() => (confirmingRestaurantDelete ? restaurantDeleteMutation.mutate() : setConfirmingRestaurantDelete(true))}
                  disabled={restaurantDeleteMutation.isPending}
                  className="text-sm text-risk-red hover:underline"
                >
                  {confirmingRestaurantDelete ? 'Click again to confirm removal' : 'Remove this restaurant'}
                </button>
              )}
            </div>
          </div>
        )}

        <h2 className="font-semibold mb-3">Equipment registry</h2>
        <div className="border border-line rounded-xl overflow-hidden bg-surface mb-8">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left px-4 py-2">Asset</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Section</th>
                <th className="text-left px-4 py-2">Risk</th>
                <th className="text-left px-4 py-2">Tag</th>
              </tr>
            </thead>
            <tbody>
              {restaurant.equipment?.map((eq) => (
                <tr key={eq.id} className="border-t border-line">
                  <td className="px-4 py-2">
                    <Link to={`/equipment/${eq.id}`} className="font-medium text-accent-2 hover:underline">
                      {eq.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{eq.category.name}</td>
                  <td className="px-4 py-2 text-muted">{eq.section?.name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <RiskChip level={eq.riskLevel} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{eq.assetTag}</td>
                </tr>
              ))}
              {restaurant.equipment?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No equipment registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="font-semibold mb-3">Sections</h2>
        <div className="flex flex-wrap gap-2">
          {restaurant.sections?.map((s) => (
            <span key={s.id} className="px-3 py-1 rounded-full bg-surface border border-line text-sm">
              {s.name}
            </span>
          ))}
          {restaurant.sections?.length === 0 && <p className="text-sm text-muted">No sections defined yet.</p>}
        </div>
      </div>

      <div className="space-y-6">
        {canRegisterEquipment && (
          <div>
            <h2 className="font-semibold mb-3">Register equipment</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                setEqError(null);
                equipmentMutation.mutate();
              }}
              className="bg-surface border border-line rounded-xl p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Name</label>
                <input
                  required
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                  placeholder="Walk-in Freezer"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Category</label>
                <select
                  required
                  value={eqCategoryId}
                  onChange={(e) => {
                    setEqCategoryId(e.target.value);
                    setEqTypeId('');
                  }}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
                >
                  <option value="" disabled>
                    Choose one…
                  </option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">
                  Type <span className="normal-case text-muted/70">(determines which PM checklists apply)</span>
                </label>
                <select
                  value={eqTypeId}
                  disabled={!eqCategoryId}
                  onChange={(e) => setEqTypeId(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white disabled:bg-paper disabled:text-muted"
                >
                  <option value="">{eqCategoryId ? 'No specific type' : 'Choose a category first'}</option>
                  {equipmentTypes?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">
                  Section (optional)
                </label>
                <select
                  value={eqSectionId}
                  onChange={(e) => setEqSectionId(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-1.5 text-sm bg-white"
                >
                  <option value="">Whole restaurant</option>
                  {restaurant.sections?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {eqError && <p className="text-sm text-risk-red">{eqError}</p>}
              <button
                type="submit"
                disabled={equipmentMutation.isPending}
                className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {equipmentMutation.isPending ? 'Registering…' : 'Register & generate QR'}
              </button>
            </form>
          </div>
        )}

        {canConfigure && (
          <div>
            <h2 className="font-semibold mb-3">Add section</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                setSectionError(null);
                sectionMutation.mutate(sectionName);
              }}
              className="bg-surface border border-line rounded-xl p-4 space-y-3"
            >
              <input
                required
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
                placeholder="Cold Kitchen"
              />
              {sectionError && <p className="text-sm text-risk-red">{sectionError}</p>}
              <button
                type="submit"
                disabled={sectionMutation.isPending}
                className="w-full border border-line rounded-md py-2 text-sm font-medium hover:bg-paper disabled:opacity-50"
              >
                {sectionMutation.isPending ? 'Adding…' : 'Add section'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
