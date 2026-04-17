'use client';
import { useEffect, useState } from 'react';
import { vendorsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Star } from 'lucide-react';

export default function VendorsPage() {
  const { hasRole } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contactEmail: '', paymentTerms: 'Net 30' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await vendorsApi.getAll();
    setVendors(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vendorsApi.create({ ...form, status: 'active', rating: 3.0, reliabilityScore: 0.8, onTimeDeliveryRate: 0.8 });
      setShowForm(false);
      setForm({ name: '', contactEmail: '', paymentTerms: 'Net 30' });
      await load();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const stars = (rating: number) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

  return (
    <>
      <TopBar title="Vendors" subtitle="Vendor master data and performance" />
      <div className="p-6 space-y-4">
        {hasRole('procurement_manager', 'admin') && (
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
          </div>
        )}

        {showForm && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4">New Vendor</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                <select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="input">
                  <option>Net 30</option><option>Net 45</option><option>Net 60</option>
                </select>
              </div>
              <div className="flex items-end gap-3">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Vendor'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Vendor Name</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Rating</th>
                <th className="table-header">Reliability</th>
                <th className="table-header">On-Time %</th>
                <th className="table-header">Status</th>
                <th className="table-header">Terms</th>
                <th className="table-header">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && vendors.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No vendors found</td></tr>
              )}
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <div className="font-medium">{v.name}</div>
                    {v.isPreferred && <span className="text-xs text-blue-600 font-medium">⭐ Preferred</span>}
                  </td>
                  <td className="table-cell text-slate-500 text-xs">{v.contactEmail || '—'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-xs">{stars(v.rating || 0)}</span>
                      <span className="text-xs text-slate-500">{(v.rating || 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="table-cell">{Math.round((v.reliabilityScore || 0) * 100)}%</td>
                  <td className="table-cell">{Math.round((v.onTimeDeliveryRate || 0) * 100)}%</td>
                  <td className="table-cell"><StatusBadge status={v.status} /></td>
                  <td className="table-cell text-slate-500">{v.paymentTerms || '—'}</td>
                  <td className="table-cell">{v.items?.length || 0} components</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
