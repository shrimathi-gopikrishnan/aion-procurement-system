'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { posApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default function POsPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    posApi.getAll(statusFilter ? { status: statusFilter } : {}).then((r) => setPos(r.data)).catch(() => setPos([])).finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <>
      <TopBar title="Purchase Orders" subtitle="Formal orders to vendors" />
      <div className="p-6 space-y-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-52">
          <option value="">All Statuses</option>
          <option value="created">Created</option>
          <option value="approved">Approved</option>
          <option value="sent_to_vendor">Sent to Vendor</option>
          <option value="partially_received">Partially Received</option>
          <option value="fully_received">Fully Received</option>
        </select>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">PO Number</th>
                <th className="table-header">Vendor</th>
                <th className="table-header">Total Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Expected Delivery</th>
                <th className="table-header">Created At</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && pos.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center py-10 text-slate-400">No purchase orders yet</td></tr>
              )}
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono font-medium text-blue-700">{po.poNumber}</td>
                  <td className="table-cell">{po.vendor?.name || '—'}</td>
                  <td className="table-cell font-medium">{formatCurrency(po.totalAmount)}</td>
                  <td className="table-cell"><StatusBadge status={po.status} /></td>
                  <td className="table-cell text-slate-500">{formatDate(po.expectedDeliveryDate)}</td>
                  <td className="table-cell text-slate-500">{formatDate(po.createdAt)}</td>
                  <td className="table-cell">
                    <Link href={`/purchase-orders/${po.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
                      <Eye className="w-3.5 h-3.5" /> View
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
