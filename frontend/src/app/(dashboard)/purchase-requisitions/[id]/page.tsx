'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { prsApi, vendorsApi, posApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle, XCircle, Star, ShoppingCart,
  Loader2, Trophy, TrendingUp, Clock, DollarSign, Send,
} from 'lucide-react';

export default function PRDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vendorRankings, setVendorRankings] = useState<Record<number, any>>({});
  const [rankingLoading, setRankingLoading] = useState<Record<number, boolean>>({});
  const [selectedVendors, setSelectedVendors] = useState<Record<number, number>>({});
  const [creatingPO, setCreatingPO] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const autoRankDone = useRef(false);

  const load = async () => {
    try {
      const res = await prsApi.getOne(Number(id));
      setPr(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Auto-rank all vendors when PR is approved
  useEffect(() => {
    if (pr?.status === 'approved' && pr?.items?.length > 0 && !autoRankDone.current) {
      autoRankDone.current = true;
      pr.items.forEach((item: any) => rankVendorsForItem(item, true));
    }
  }, [pr?.status]);

  const rankVendorsForItem = async (item: any, auto = false) => {
    if (rankingLoading[item.componentId]) return;
    setRankingLoading((p) => ({ ...p, [item.componentId]: true }));
    try {
      const res = await vendorsApi.rank(item.componentId, item.component?.name || 'Component');
      const data = res.data;
      setVendorRankings((p) => ({ ...p, [item.componentId]: data }));
      // Auto-select top-ranked vendor
      if (data.ranking?.length > 0) {
        const topVendorId = data.ranking[0].vendorId;
        setSelectedVendors((p) => ({ ...p, [item.componentId]: topVendorId }));
      }
    } catch { if (!auto) alert('Vendor ranking failed'); }
    finally { setRankingLoading((p) => ({ ...p, [item.componentId]: false })); }
  };

  const handleApprove = async () => {
    setActing(true);
    try { await prsApi.approve(Number(id)); await load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleSubmit = async () => {
    setActing(true);
    try { await prsApi.submit(Number(id)); await load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert('Provide rejection reason');
    setActing(true);
    try { await prsApi.reject(Number(id), rejectReason); await load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleCreatePO = async () => {
    const vendorIds = Object.values(selectedVendors);
    if (!vendorIds.length) return alert('Please rank vendors and select one for each item');
    const vendorId = vendorIds[0];
    setCreatingPO(true);
    try {
      const res = await posApi.createFromPr({ prId: Number(id), vendorId });
      router.push(`/purchase-orders/${res.data.id}`);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to create PO'); }
    finally { setCreatingPO(false); }
  };

  if (loading) return <><TopBar title="Purchase Requisition" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!pr) return <><TopBar title="Purchase Requisition" /><div className="p-6">Not found</div></>;

  const canApprove = hasRole('supervisor', 'procurement_manager', 'admin') && pr.status === 'pending_approval';
  const canSubmit = pr.status === 'draft';
  const allVendorsSelected = pr.items?.length > 0 &&
    pr.items.every((item: any) => selectedVendors[item.componentId]);
  const isRankingAny = Object.values(rankingLoading).some(Boolean);

  return (
    <>
      <TopBar title={pr.prNumber} subtitle="Purchase Requisition Detail" />
      <div className="p-6 max-w-5xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">{pr.prNumber}</h2>
            <StatusBadge status={pr.status} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-500 text-xs">Priority</div><div className="capitalize font-medium">{pr.priority}</div></div>
            <div><div className="text-slate-500 text-xs">Version</div><div>v{pr.version}</div></div>
            <div><div className="text-slate-500 text-xs">Created By</div><div>{pr.createdBy?.name || '—'}</div></div>
            <div><div className="text-slate-500 text-xs">Created At</div><div>{formatDate(pr.createdAt)}</div></div>
          </div>
          {pr.justification && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
              <div className="text-xs text-slate-500 mb-1">Justification (AI Generated)</div>
              {pr.justification}
            </div>
          )}
          {pr.aiDraftNotes && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <div className="text-xs text-blue-600 mb-1">AI Notes</div>
              {pr.aiDraftNotes}
            </div>
          )}
        </div>

        {/* Vendor Analysis — shown when approved */}
        {pr.status === 'approved' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                AI Vendor Analysis
              </h2>
              {isRankingAny && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysing vendors…
                </div>
              )}
            </div>

            {pr.items?.map((item: any) => {
              const ranking = vendorRankings[item.componentId];
              const isLoading = rankingLoading[item.componentId];
              return (
                <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{item.component?.name || `Component #${item.componentId}`}</span>
                      <span className="text-slate-500 text-sm ml-2">× {item.quantity} {item.unitOfMeasure || 'pcs'}</span>
                    </div>
                    {!isLoading && (
                      <button
                        onClick={() => rankVendorsForItem(item)}
                        className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" /> {ranking ? 'Re-rank' : 'Rank Vendors'}
                      </button>
                    )}
                  </div>

                  {isLoading && (
                    <div className="p-4 flex items-center gap-3 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      AI is analysing vendors for best price, delivery, and reliability…
                    </div>
                  )}

                  {ranking && !isLoading && (
                    <div className="p-4 space-y-3">
                      {ranking.recommendation && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                          <Trophy className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                          <span>{ranking.recommendation}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {ranking.vendors?.slice(0, 3).map((vi: any, idx: number) => {
                          const rankInfo = ranking.ranking?.find((r: any) => r.vendorId === vi.vendor?.id);
                          const isSelected = selectedVendors[item.componentId] === vi.vendor?.id;
                          const score = rankInfo ? Math.round(rankInfo.score * 100) : null;
                          return (
                            <label
                              key={vi.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`vendor-${item.componentId}`}
                                checked={isSelected}
                                onChange={() => setSelectedVendors((p) => ({ ...p, [item.componentId]: vi.vendor?.id }))}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {idx === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                                  <span className="font-medium text-slate-800">{vi.vendor?.name}</span>
                                  {score !== null && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      score >= 70 ? 'bg-green-100 text-green-700' :
                                      score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{score}% match</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(vi.price)}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{vi.deliveryDays}d delivery</span>
                                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Rating {vi.vendor?.rating || '—'}/5</span>
                                </div>
                                {rankInfo?.reasoning && (
                                  <div className="text-xs text-slate-400 mt-1 italic">{rankInfo.reasoning}</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!ranking && !isLoading && (
                    <div className="p-4 text-sm text-slate-400 text-center">
                      Click "Rank Vendors" to analyse available suppliers for this component
                    </div>
                  )}
                </div>
              );
            })}

            {/* Create PO CTA */}
            {allVendorsSelected && !isRankingAny && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div>
                  <div className="font-semibold text-blue-800">Ready to create Purchase Order</div>
                  <div className="text-sm text-blue-600">Best vendors pre-selected by AI. Review and confirm.</div>
                </div>
                <button onClick={handleCreatePO} disabled={creatingPO} className="btn-primary flex items-center gap-2 ml-4 flex-shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                  {creatingPO ? 'Creating PO…' : 'Create Purchase Order'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Line Items (shown for non-approved states) */}
        {pr.status !== 'approved' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Line Items</h2>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Component</th>
                  <th className="table-header">Quantity</th>
                  <th className="table-header">Est. Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pr.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="table-cell font-medium">{item.component?.name || `Component #${item.componentId}`}</td>
                    <td className="table-cell">{item.quantity} {item.unitOfMeasure || 'pcs'}</td>
                    <td className="table-cell">{item.estimatedUnitPrice ? formatCurrency(item.estimatedUnitPrice) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {canSubmit && (
            <button onClick={handleSubmit} disabled={acting} className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" />
              {acting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={handleApprove} disabled={acting} className="btn-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve PR
              </button>
              <div className="flex gap-2">
                <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input w-56" placeholder="Rejection reason…" />
                <button onClick={handleReject} disabled={acting} className="btn-danger flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </>
          )}
          {/* Manual PO creation if vendor not yet selected */}
          {pr.status === 'approved' && !allVendorsSelected && Object.keys(selectedVendors).length > 0 && (
            <button onClick={handleCreatePO} disabled={creatingPO} className="btn-primary flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              {creatingPO ? 'Creating PO…' : 'Create Purchase Order'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
