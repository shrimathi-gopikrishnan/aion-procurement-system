'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { prsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatStatus } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default function PRsPage() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await prsApi.getAll(statusFilter ? { status: statusFilter } : {});
      setPrs(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <>
      <TopBar title="Purchase Requisitions" subtitle="AI-drafted procurement requests" />
      <div className="p-6 space-y-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-52">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="converted_to_po">Converted to PO</option>
        </select>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">PR Number</th>
                <th className="table-header">MO Linked</th>
                <th className="table-header">Priority</th>
                <th className="table-header">Status</th>
                <th className="table-header">Items</th>
                <th className="table-header">Created By</th>
                <th className="table-header">Created At</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && prs.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No purchase requisitions yet</td></tr>
              )}
              {prs.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-mono font-medium text-blue-700">{pr.prNumber}</td>
                  <td className="table-cell font-mono text-xs">{pr.maintenanceOrder?.moNumber || '—'}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      pr.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      pr.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      pr.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{pr.priority}</span>
                  </td>
                  <td className="table-cell"><StatusBadge status={pr.status} /></td>
                  <td className="table-cell">{pr.items?.length || 0} items</td>
                  <td className="table-cell">{pr.createdBy?.name || '—'}</td>
                  <td className="table-cell text-slate-500">{formatDate(pr.createdAt)}</td>
                  <td className="table-cell">
                    <Link href={`/purchase-requisitions/${pr.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
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
