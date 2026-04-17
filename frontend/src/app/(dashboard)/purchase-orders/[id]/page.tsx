'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { posApi, goodsReceiptsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils';
import { ArrowLeft, CheckCircle, Truck, Download, Package, PartyPopper } from 'lucide-react';

function POSuccessBanner({ po }: { po: any }) {
  return (
    <div className="card p-8 text-center space-y-4 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <PartyPopper className="w-8 h-8 text-green-600" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-green-800">Order Placed!</h2>
        <p className="text-green-700 mt-1">Purchase Order <span className="font-mono font-bold">{po.poNumber}</span> has been approved and sent to <span className="font-semibold">{po.vendor?.name}</span>.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="bg-white rounded-xl p-3 border border-green-200">
          <div className="text-xs text-slate-500 mb-1">Order Total</div>
          <div className="font-bold text-slate-800">{formatCurrency(po.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-green-200">
          <div className="text-xs text-slate-500 mb-1">Expected By</div>
          <div className="font-bold text-slate-800">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-green-200">
          <div className="text-xs text-slate-500 mb-1">Items</div>
          <div className="font-bold text-slate-800">{po.items?.length || 0}</div>
        </div>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={() => openPDFWindow(po)}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PO as PDF
        </button>
      </div>
    </div>
  );
}

function buildPDFHtml(po: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Purchase Order — ${po.poNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 24px; font-weight: 800; color: #1e3a8a; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .po-title { text-align: right; }
    .po-title h1 { font-size: 20px; font-weight: 700; }
    .status { display: inline-block; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 4px; }
    hr { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; }
    .meta-value.large { font-size: 20px; color: #1e3a8a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .total-row td { background: #f8fafc; font-weight: 700; font-size: 15px; border-top: 2px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #475569; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AION</div>
      <div class="brand-sub">Industrial ERP System</div>
    </div>
    <div class="po-title">
      <h1>Purchase Order</h1>
      <div>${po.poNumber}</div>
      <span class="status">APPROVED</span>
    </div>
  </div>
  <hr/>
  <div class="meta-grid">
    <div><div class="meta-label">Vendor</div><div class="meta-value">${po.vendor?.name || '—'}</div>${po.vendor?.email ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${po.vendor.email}</div>` : ''}</div>
    <div><div class="meta-label">Total Amount</div><div class="meta-value large">${formatCurrency(po.totalAmount)}</div></div>
    <div><div class="meta-label">Expected Delivery</div><div class="meta-value">${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '—'}</div></div>
    <div><div class="meta-label">Payment Terms</div><div class="meta-value">${po.paymentTerms || 'Net 30'}</div></div>
    <div><div class="meta-label">Issue Date</div><div class="meta-value">${new Date().toLocaleDateString()}</div></div>
    <div><div class="meta-label">Status</div><div class="meta-value">Approved</div></div>
  </div>
  ${po.notes ? `<div class="notes-box"><strong>Notes:</strong> ${po.notes}</div>` : ''}
  <table>
    <thead><tr><th>#</th><th>Component</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Line Total</th></tr></thead>
    <tbody>
      ${(po.items || []).map((item: any, i: number) => `<tr><td>${i + 1}</td><td>${item.component?.name || 'Component'}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.unitPrice)}</td><td style="text-align:right">${formatCurrency(item.quantity * item.unitPrice)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="4" style="text-align:right">Total</td><td style="text-align:right">${formatCurrency(po.totalAmount)}</td></tr>
    </tbody>
  </table>
  <div class="footer"><span>Generated by AION Industrial ERP</span><span>${po.poNumber} · ${new Date().toISOString().slice(0, 10)}</span></div>
  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`;
}

function openPDFWindow(po: any) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(buildPDFHtml(po));
  win.document.close();
}

export default function PODetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [submittingGRN, setSubmittingGRN] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  const load = async () => {
    try {
      const res = await posApi.getOne(Number(id));
      setPo(res.data);
      setGrnItems(res.data.items?.map((item: any) => ({
        componentId: item.componentId,
        orderedQty: item.quantity,
        receivedQty: item.quantity,
        rejectedQty: 0,
        condition: 'good',
        name: item.component?.name,
      })) || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await posApi.approve(Number(id));
      setJustApproved(true);
      await load();
    }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleCreateGRN = async () => {
    setSubmittingGRN(true);
    try {
      const res = await goodsReceiptsApi.create({
        purchaseOrderId: Number(id),
        items: grnItems.map(({ name, ...item }) => item),
      });
      router.push(`/goods-receipts/${res.data.id}`);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSubmittingGRN(false); }
  };

  if (loading) return <><TopBar title="Purchase Order" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!po) return <><TopBar title="Purchase Order" /><div className="p-6">Not found</div></>;

  const isApproved = po.status === 'approved' || po.status === 'sent_to_vendor' ||
    po.status === 'partially_received' || po.status === 'received';

  return (
    <>
      <TopBar title={po.poNumber} subtitle="Purchase Order Detail" />
      <div className="p-6 max-w-5xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Success Banner — shown after approval */}
        {isApproved && (justApproved || po.status !== 'created') && (
          <POSuccessBanner po={po} />
        )}

        {/* PO Header */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{po.poNumber}</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={po.status} />
              {isApproved && (
                <button
                  onClick={() => openPDFWindow(po)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500 text-xs">Vendor</div><div className="font-medium">{po.vendor?.name}</div></div>
            <div><div className="text-slate-500 text-xs">Total Amount</div><div className="font-medium text-lg">{formatCurrency(po.totalAmount)}</div></div>
            <div><div className="text-slate-500 text-xs">Expected Delivery</div><div>{formatDate(po.expectedDeliveryDate)}</div></div>
            <div><div className="text-slate-500 text-xs">Payment Terms</div><div>{po.paymentTerms || '—'}</div></div>
          </div>
          {po.notes && <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">{po.notes}</div>}
        </div>

        {/* Items */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Line Items</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Component</th>
                <th className="table-header">Ordered Qty</th>
                <th className="table-header">Received Qty</th>
                <th className="table-header">Unit Price</th>
                <th className="table-header">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="table-cell font-medium">{item.component?.name}</td>
                  <td className="table-cell">{item.quantity}</td>
                  <td className="table-cell">{item.receivedQty || 0}</td>
                  <td className="table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="table-cell font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={4} className="table-cell text-right font-semibold">Total</td>
                <td className="table-cell font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {hasRole('procurement_manager', 'supervisor', 'admin') && po.status === 'created' && (
            <button onClick={handleApprove} disabled={approving} className="btn-success flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {approving ? 'Approving…' : 'Approve & Place Order'}
            </button>
          )}
          {hasRole('warehouse', 'admin') && ['approved', 'sent_to_vendor', 'partially_received'].includes(po.status) && (
            <button onClick={() => setShowGRNForm(!showGRNForm)} className="btn-secondary flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {showGRNForm ? 'Cancel' : 'Record Goods Receipt'}
            </button>
          )}
        </div>

        {/* GRN Form */}
        {showGRNForm && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4" /> Record Goods Receipt
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Component</th>
                  <th className="table-header">Ordered</th>
                  <th className="table-header">Received</th>
                  <th className="table-header">Rejected</th>
                  <th className="table-header">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grnItems.map((item, i) => (
                  <tr key={i}>
                    <td className="table-cell font-medium">{item.name}</td>
                    <td className="table-cell">{item.orderedQty}</td>
                    <td className="table-cell">
                      <input
                        type="number" min={0} max={item.orderedQty}
                        value={item.receivedQty}
                        onChange={(e) => setGrnItems(prev => prev.map((it, idx) => idx === i ? { ...it, receivedQty: parseInt(e.target.value) || 0 } : it))}
                        className="input w-20 py-1"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number" min={0}
                        value={item.rejectedQty}
                        onChange={(e) => setGrnItems(prev => prev.map((it, idx) => idx === i ? { ...it, rejectedQty: parseInt(e.target.value) || 0 } : it))}
                        className="input w-20 py-1"
                      />
                    </td>
                    <td className="table-cell">
                      <select value={item.condition} onChange={(e) => setGrnItems(prev => prev.map((it, idx) => idx === i ? { ...it, condition: e.target.value } : it))} className="input py-1">
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="partial">Partial</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleCreateGRN} disabled={submittingGRN} className="btn-primary flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {submittingGRN ? 'Recording…' : 'Confirm Goods Receipt'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
