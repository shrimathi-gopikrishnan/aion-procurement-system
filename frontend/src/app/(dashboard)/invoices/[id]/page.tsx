'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invoicesApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { ArrowLeft, CheckCircle, DollarSign, XCircle } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    const res = await invoicesApi.getOne(Number(id));
    setInv(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handle = async (fn: () => Promise<any>) => {
    setActing(true);
    try { await fn(); await load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Action failed'); }
    finally { setActing(false); }
  };

  if (loading) return <><TopBar title="Invoice" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!inv) return <><TopBar title="Invoice" /><div className="p-6">Not found</div></>;

  const isFinance = hasRole('finance', 'admin');

  return (
    <>
      <TopBar title={inv.invoiceNumber} subtitle="Invoice Detail & 3-Way Match" />
      <div className="p-6 max-w-4xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Invoice info */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{inv.invoiceNumber}</h2>
            <StatusBadge status={inv.status} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500 text-xs">Vendor</div><div className="font-medium">{inv.purchaseOrder?.vendor?.name}</div></div>
            <div><div className="text-slate-500 text-xs">PO Number</div><div className="font-mono">{inv.purchaseOrder?.poNumber}</div></div>
            <div><div className="text-slate-500 text-xs">PO Value</div><div className="font-medium">{formatCurrency(inv.purchaseOrder?.totalAmount)}</div></div>
            <div><div className="text-slate-500 text-xs">Invoice Amount</div><div className="font-bold text-lg">{formatCurrency(inv.amount)}</div></div>
            <div><div className="text-slate-500 text-xs">Invoice Date</div><div>{formatDate(inv.invoiceDate)}</div></div>
            <div><div className="text-slate-500 text-xs">Due Date</div><div>{formatDate(inv.dueDate)}</div></div>
            <div><div className="text-slate-500 text-xs">Vendor Invoice #</div><div>{inv.vendorInvoiceNumber || '—'}</div></div>
            <div><div className="text-slate-500 text-xs">GRN Linked</div><div>{inv.goodsReceipt?.grnNumber || 'Not linked'}</div></div>
          </div>
        </div>

        {/* 3-way match result */}
        <div className={`card p-5 ${inv.status === 'matched' ? 'border-green-200 bg-green-50' : inv.status === 'exception' ? 'border-red-200 bg-red-50' : ''}`}>
          <h2 className="font-semibold text-slate-800 mb-2">3-Way Match Result</h2>
          <div className={`text-sm ${inv.status === 'matched' ? 'text-green-800' : inv.status === 'exception' ? 'text-red-800' : 'text-slate-700'}`}>
            {inv.matchNotes || 'No match notes available'}
          </div>
          {inv.exceptionReason && (
            <div className="mt-2 text-sm text-red-700"><strong>Exception:</strong> {inv.exceptionReason}</div>
          )}
        </div>

        {/* Actions */}
        {isFinance && (
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Finance Actions</h2>
            <div className="flex flex-wrap gap-3">
              {['pending', 'matched', 'exception'].includes(inv.status) && (
                <button onClick={() => handle(() => invoicesApi.approve(Number(id)))} disabled={acting} className="btn-success flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve Invoice
                </button>
              )}
              {inv.status === 'approved' && (
                <button onClick={() => handle(() => invoicesApi.pay(Number(id)))} disabled={acting} className="btn-primary flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Mark as Paid
                </button>
              )}
              {!['paid', 'rejected'].includes(inv.status) && (
                <div className="flex gap-2">
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input w-52" placeholder="Rejection reason…" />
                  <button onClick={() => handle(() => invoicesApi.reject(Number(id), rejectReason))} disabled={acting || !rejectReason.trim()} className="btn-danger flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
            {inv.approvedAt && <div className="text-xs text-slate-500">Approved by {inv.approvedBy?.name} on {formatDateTime(inv.approvedAt)}</div>}
            {inv.paidAt && <div className="text-xs text-slate-500">Marked paid on {formatDateTime(inv.paidAt)}</div>}
          </div>
        )}
      </div>
    </>
  );
}
