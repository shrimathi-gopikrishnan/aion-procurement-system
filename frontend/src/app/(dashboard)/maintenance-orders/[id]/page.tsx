'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { maintenanceOrdersApi, inventoryApi, prsApi, componentsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle, XCircle, Package, FileText,
  Clock, Loader2, CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react';

export default function MODetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [mo, setMo] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('repair');
  const [actionReason, setActionReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [invResult, setInvResult] = useState<any>(null);
  const [checkingInv, setCheckingInv] = useState(false);
  const [generatingPR, setGeneratingPR] = useState(false);
  const [components, setComponents] = useState<any[]>([]);
  const autoCheckDone = useRef(false);

  const load = async () => {
    try {
      const [moRes, auditRes, compRes] = await Promise.all([
        maintenanceOrdersApi.getOne(Number(id)),
        maintenanceOrdersApi.getAuditTrail(Number(id)),
        componentsApi.getAll(),
      ]);
      setMo(moRes.data);
      setAuditTrail(auditRes.data);
      setComponents(compRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Auto-trigger inventory check when MO is approved
  useEffect(() => {
    if (mo?.status === 'approved' && !autoCheckDone.current && !checkingInv) {
      autoCheckDone.current = true;
      handleInventoryCheck(true);
    }
  }, [mo?.status]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await maintenanceOrdersApi.approve(Number(id), { action, actionReason });
      await load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alert('Please provide a rejection reason');
    setApproving(true);
    try {
      await maintenanceOrdersApi.reject(Number(id), rejectReason);
      await load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setApproving(false); }
  };

  const handleInventoryCheck = async (auto = false) => {
    if (!mo?.defect?.componentId) {
      if (!auto) alert('No component linked to this defect');
      return;
    }
    setCheckingInv(true);
    try {
      const res = await inventoryApi.reserve(Number(id), [{ componentId: mo.defect.componentId, quantity: 1 }]);
      const result = res.data;
      setInvResult(result);
      // Auto-generate PR if shortages found
      if (result.hasShortages && auto) {
        await autoGeneratePR(result);
      }
    } catch (e: any) {
      if (!auto) alert(e.response?.data?.message || 'Failed');
    }
    finally { setCheckingInv(false); }
  };

  const autoGeneratePR = async (result: any) => {
    setGeneratingPR(true);
    try {
      const shortages = result?.shortages?.map((s: any) => {
        const comp = components.find((c: any) => c.id === s.componentId);
        return { componentId: s.componentId, componentName: comp?.name || 'Unknown', needed: s.needed };
      });
      const res = await prsApi.generateFromMo(Number(id), shortages);
      router.push(`/purchase-requisitions/${res.data.id}`);
    } catch {
      // If auto-generate fails, leave user on MO page with the result showing
      setGeneratingPR(false);
    }
  };

  const handleGeneratePR = async () => {
    setGeneratingPR(true);
    try {
      const shortages = invResult?.shortages?.map((s: any) => {
        const comp = components.find((c: any) => c.id === s.componentId);
        return { componentId: s.componentId, componentName: comp?.name || 'Unknown', needed: s.needed };
      });
      const res = await prsApi.generateFromMo(Number(id), shortages);
      router.push(`/purchase-requisitions/${res.data.id}`);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setGeneratingPR(false); }
  };

  if (loading) return <><TopBar title="Maintenance Order" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!mo) return <><TopBar title="Maintenance Order" /><div className="p-6 text-slate-500">Not found</div></>;

  const canApprove = hasRole('supervisor', 'admin') && mo.status === 'pending_review';

  return (
    <>
      <TopBar title={mo.moNumber} subtitle="Maintenance Order Detail" />
      <div className="p-6 max-w-5xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* MO Info */}
          <div className="card p-5 space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Maintenance Order</h2>
              <StatusBadge status={mo.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-slate-500 text-xs">MO Number</div><div className="font-mono font-medium">{mo.moNumber}</div></div>
              <div><div className="text-slate-500 text-xs">Action Decided</div><div className="capitalize font-medium">{mo.action !== 'pending' ? mo.action : <span className="text-slate-400">Pending</span>}</div></div>
              <div><div className="text-slate-500 text-xs">Created By</div><div>{mo.createdBy?.name || '—'}</div></div>
              <div><div className="text-slate-500 text-xs">Created At</div><div>{formatDateTime(mo.createdAt)}</div></div>
              {mo.approvedBy && <div><div className="text-slate-500 text-xs">Approved By</div><div>{mo.approvedBy?.name}</div></div>}
              {mo.approvedAt && <div><div className="text-slate-500 text-xs">Approved At</div><div>{formatDateTime(mo.approvedAt)}</div></div>}
            </div>
            {mo.plannedWork && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                <div className="text-xs text-slate-500 mb-1">Planned Work</div>
                {mo.plannedWork}
              </div>
            )}
            {mo.actionReason && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <div className="text-xs text-blue-600 mb-1">Action Reason</div>
                {mo.actionReason}
              </div>
            )}
            {mo.rejectionReason && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                <div className="text-xs text-red-600 mb-1">Rejection Reason</div>
                {mo.rejectionReason}
              </div>
            )}
          </div>

          {/* Linked Defect */}
          {mo.defect && (
            <div className="card p-5 space-y-3">
              <h2 className="font-semibold text-slate-800">Linked Defect</h2>
              <div className="text-sm space-y-2">
                <div><div className="text-slate-500 text-xs">Component</div><div className="font-medium">{mo.defect.aiDetectedComponent}</div></div>
                <div><div className="text-slate-500 text-xs">Damage</div><div>{mo.defect.damageType}</div></div>
                <div><div className="text-slate-500 text-xs">Severity</div><SeverityBadge severity={mo.defect.severity} /></div>
                <div><div className="text-slate-500 text-xs">Confidence</div><div>{Math.round((mo.defect.aiConfidence || 0) * 100)}%</div></div>
              </div>
            </div>
          )}
        </div>

        {/* Supervisor Approval Panel */}
        {canApprove && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Supervisor Decision</h2>
            <div className="flex gap-4">
              {['repair', 'replace'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="action" value={opt} checked={action === opt} onChange={() => setAction(opt)} className="w-4 h-4 text-blue-600" />
                  <span className="capitalize text-sm font-medium">{opt}</span>
                </label>
              ))}
            </div>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={2}
              className="input"
              placeholder="Reason for this decision…"
            />
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={approving} className="btn-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {approving ? 'Approving…' : `Approve (${action})`}
              </button>
              <div className="flex gap-2 flex-1">
                <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input flex-1" placeholder="Rejection reason…" />
                <button onClick={handleReject} disabled={approving} className="btn-danger flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Check — shown once MO is approved */}
        {mo.status === 'approved' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Inventory & Parts Check
              </h2>
              {!checkingInv && !generatingPR && (
                <button onClick={() => handleInventoryCheck(false)} className="btn-secondary flex items-center gap-2 text-xs">
                  <Package className="w-3.5 h-3.5" /> Re-check
                </button>
              )}
            </div>

            {/* Loading state */}
            {(checkingInv || generatingPR) && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {generatingPR ? 'Generating Purchase Requisition…' : 'Checking inventory availability…'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {generatingPR ? 'AI is drafting the PR — you will be redirected shortly' : 'Reserving components from stock'}
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {invResult && !checkingInv && !generatingPR && (
              <div className="space-y-3">
                {invResult.reservations?.map((r: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg text-sm flex items-start gap-3 ${
                    r.status === 'reserved' ? 'bg-green-50 border border-green-200' :
                    r.status === 'partial' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    {r.status === 'reserved'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      : r.status === 'partial'
                      ? <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <div className="font-medium">
                        {r.status === 'reserved' ? 'Fully available in stock' :
                         r.status === 'partial' ? 'Partially available — shortage detected' :
                         'Not available — purchase required'}
                      </div>
                      <div className="text-slate-600">Reserved: {r.reservedQty} / {r.requestedQty} units</div>
                    </div>
                  </div>
                ))}

                {invResult.hasShortages ? (
                  <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div>
                      <div className="font-semibold text-amber-800">Parts shortage detected</div>
                      <div className="text-sm text-amber-700">A Purchase Requisition (PR) will be created for the missing parts.</div>
                    </div>
                    <button onClick={handleGeneratePR} disabled={generatingPR} className="btn-primary flex items-center gap-2 ml-4 flex-shrink-0">
                      <Zap className="w-4 h-4" />
                      {generatingPR ? 'Generating…' : 'Generate PR (AI)'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">All required parts are available in stock. No procurement needed.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audit Trail */}
        {auditTrail.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4" />Audit Trail</h2>
            <div className="space-y-3">
              {auditTrail.map((log, i) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                    {i < auditTrail.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <div className="text-sm font-medium text-slate-800">{log.action.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-500">
                      by {log.performedBy?.name || 'System'} · {formatDateTime(log.createdAt)}
                      {log.fromState && ` · ${log.fromState} → ${log.toState}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
