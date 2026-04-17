'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { goodsReceiptsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default function GoodsReceiptsPage() {
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goodsReceiptsApi.getAll().then((r) => setGrns(r.data)).catch(() => setGrns([])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="Goods Receipts" subtitle="Received goods against purchase orders" />
      <div className="p-6 space-y-4">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">GRN Number</th>
                <th className="table-header">PO Number</th>
                <th className="table-header">Vendor</th>
                <th className="table-header">Received By</th>
                <th className="table-header">Items</th>
                <th className="table-header">Status</th>
                <th className="table-header">Received At</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && grns.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No goods receipts recorded yet</td></tr>
              )}
              {grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono font-medium text-blue-700">{grn.grnNumber}</td>
                  <td className="table-cell font-mono text-xs">{grn.purchaseOrder?.poNumber || '—'}</td>
                  <td className="table-cell">{grn.purchaseOrder?.vendor?.name || '—'}</td>
                  <td className="table-cell">{grn.receivedBy?.name || '—'}</td>
                  <td className="table-cell">{grn.items?.length || 0} items</td>
                  <td className="table-cell"><StatusBadge status={grn.status} /></td>
                  <td className="table-cell text-slate-500">{formatDateTime(grn.receivedAt)}</td>
                  <td className="table-cell">
                    <Link href={`/goods-receipts/${grn.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
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
