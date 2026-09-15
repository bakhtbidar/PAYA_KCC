import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { createRestaurant, getCustomer } from '../api/endpoints';
import { ApiError } from '../api/client';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { name: string; city?: string }) => createRestaurant({ customerId: id!, ...body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setName('');
      setCity('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create restaurant'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({ name, city: city || undefined });
  }

  if (isLoading || !customer) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Link to="/customers" className="text-xs font-mono text-muted hover:text-accent-2">
          &larr; Customers
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1 mb-1">{customer.name}</h1>
        <p className="text-sm text-muted mb-6 font-mono">{customer.taxId ?? 'No tax ID on file'}</p>

        <h2 className="font-semibold mb-3">Restaurants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {customer.restaurants?.map((r) => (
            <Link
              key={r.id}
              to={`/restaurants/${r.id}`}
              className="block bg-surface border border-line rounded-xl p-4 hover:border-accent transition-colors"
            >
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted mt-1">{r.city ?? '—'}</div>
              {r.code && <div className="text-xs font-mono text-accent-2 mt-2">{r.code}</div>}
            </Link>
          ))}
          {customer.restaurants?.length === 0 && (
            <p className="text-sm text-muted col-span-2">No restaurants yet — add the first site.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">New restaurant</h2>
        <form onSubmit={onSubmit} className="bg-surface border border-line rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              placeholder="Bam Bam Glòries"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              placeholder="Barcelona"
            />
          </div>
          {error && <p className="text-sm text-risk-red">{error}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create restaurant'}
          </button>
        </form>
      </div>
    </div>
  );
}
