'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { maintenanceOrdersApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatStatus } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default function MaintenanceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await maintenanceOrdersApi.getAll(statusFilter ? { status: statusFilter } : {});
      setOrders(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <>
      <TopBar title="Maintenance Orders" subtitle="Track and manage maintenance workflows" />
      <div className="p-6 space-y-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-52">
          <option value="">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">MO Number</th>
                <th className="table-header">Defect Component</th>
                <th className="table-header">Action</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created By</th>
                <th className="table-header">Created At</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center py-10 text-slate-400">No maintenance orders found</td></tr>
              )}
              {orders.map((mo) => (
                <tr key={mo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-mono font-medium text-blue-700">{mo.moNumber}</td>
                  <td className="table-cell">{mo.defect?.component?.name || mo.defect?.aiDetectedComponent || '—'}</td>
                  <td className="table-cell capitalize">{mo.action !== 'pending' ? formatStatus(mo.action) : <span className="text-slate-400">Pending</span>}</td>
                  <td className="table-cell"><StatusBadge status={mo.status} /></td>
                  <td className="table-cell">{mo.createdBy?.name || '—'}</td>
                  <td className="table-cell text-slate-500">{formatDate(mo.createdAt)}</td>
                  <td className="table-cell">
                    <Link href={`/maintenance-orders/${mo.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
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
