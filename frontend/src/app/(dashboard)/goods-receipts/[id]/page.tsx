'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { goodsReceiptsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function GRNDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goodsReceiptsApi.getOne(Number(id)).then((r) => setGrn(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <><TopBar title="Goods Receipt" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!grn) return <><TopBar title="Goods Receipt" /><div className="p-6">Not found</div></>;

  const totalReceived = grn.items?.reduce((s: number, i: any) => s + i.receivedQty, 0) || 0;
  const totalOrdered = grn.items?.reduce((s: number, i: any) => s + i.orderedQty, 0) || 0;

  return (
    <>
      <TopBar title={grn.grnNumber} subtitle="Goods Receipt Note" />
      <div className="p-6 max-w-4xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{grn.grnNumber}</h2>
            <StatusBadge status={grn.status} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500 text-xs">PO Number</div><div className="font-mono font-medium">{grn.purchaseOrder?.poNumber}</div></div>
            <div><div className="text-slate-500 text-xs">Vendor</div><div>{grn.purchaseOrder?.vendor?.name}</div></div>
            <div><div className="text-slate-500 text-xs">Received By</div><div>{grn.receivedBy?.name || '—'}</div></div>
            <div><div className="text-slate-500 text-xs">Received At</div><div>{formatDateTime(grn.receivedAt)}</div></div>
          </div>
          <div className="flex items-center gap-2">
            {totalReceived >= totalOrdered
              ? <span className="flex items-center gap-1 text-green-700 text-sm"><CheckCircle className="w-4 h-4" /> Full delivery</span>
              : <span className="flex items-center gap-1 text-orange-700 text-sm"><XCircle className="w-4 h-4" /> Partial delivery ({totalReceived}/{totalOrdered} units)</span>
            }
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Received Items</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Component</th>
                <th className="table-header">Ordered</th>
                <th className="table-header">Received</th>
                <th className="table-header">Rejected</th>
                <th className="table-header">Accepted</th>
                <th className="table-header">Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grn.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="table-cell font-medium">{item.component?.name}</td>
                  <td className="table-cell">{item.orderedQty}</td>
                  <td className="table-cell">{item.receivedQty}</td>
                  <td className="table-cell text-red-600">{item.rejectedQty || 0}</td>
                  <td className="table-cell text-green-600 font-medium">{item.receivedQty - (item.rejectedQty || 0)}</td>
                  <td className="table-cell capitalize">{item.condition || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
