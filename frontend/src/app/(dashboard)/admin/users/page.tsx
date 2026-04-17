'use client';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Shield } from 'lucide-react';
import { formatDate, formatStatus } from '@/lib/utils';

const ROLES = ['operator', 'supervisor', 'procurement_manager', 'warehouse', 'finance', 'admin'];

export default function UsersPage() {
  const { hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!hasRole('admin')) { router.replace('/dashboard'); return; }
    load();
  }, [authLoading]);

  const load = async () => {
    setLoading(true);
    usersApi.getAll().then((r) => setUsers(r.data)).finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.create(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'operator' });
      await load();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChangeRole = async (userId: number, role: string) => {
    try {
      await usersApi.update(userId, { role });
      await load();
    } catch (err: any) { alert('Failed to update role'); }
  };

  return (
    <>
      <TopBar title="User Management" subtitle="Manage system users and roles" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {showForm && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4">New User</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  {ROLES.map((r) => <option key={r} value={r}>{formatStatus(r)}</option>)}
                </select>
              </div>
              <div className="flex gap-3 col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create User'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 text-sm font-medium">{u.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500">{u.email}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-600" />}
                      <span className="capitalize">{formatStatus(u.role)}</span>
                    </div>
                  </td>
                  <td className="table-cell"><StatusBadge status={u.isActive ? 'active' : 'inactive'} /></td>
                  <td className="table-cell text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="table-cell">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="input py-1 w-44"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{formatStatus(r)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
