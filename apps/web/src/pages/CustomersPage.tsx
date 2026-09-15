import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createCustomer, listCustomers } from '../api/endpoints';
import { ApiError } from '../api/client';

export function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useQuery({ queryKey: ['customers'], queryFn: listCustomers });

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setName('');
      setTaxId('');
      setBillingEmail('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create customer'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({ name, taxId: taxId || undefined, billingEmail: billingEmail || undefined });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Customers</h1>
        <p className="text-sm text-muted mb-6">Restaurant groups and independent owners under contract.</p>

        {isLoading && <p className="text-sm text-muted">Loading…</p>}

        <div className="border border-line rounded-xl overflow-hidden bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-paper text-xs font-mono uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Tax ID</th>
                <th className="text-left px-4 py-2">Sites</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-2">
                    <Link to={`/customers/${c.id}`} className="font-medium text-accent-2 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted font-mono">{c.taxId ?? '—'}</td>
                  <td className="px-4 py-2 text-muted">{c._count?.restaurants ?? 0}</td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    No customers yet — add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">New customer</h2>
        <form onSubmit={onSubmit} className="bg-surface border border-line rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              placeholder="Bam Bam Restaurants Group"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Tax ID</label>
            <input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              placeholder="B12345678"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1">Billing email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-1.5 text-sm"
              placeholder="billing@example.com"
            />
          </div>
          {error && <p className="text-sm text-risk-red">{error}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-accent text-white rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create customer'}
          </button>
        </form>
      </div>
    </div>
  );
}
