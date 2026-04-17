'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { defectsApi, maintenanceOrdersApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import {
  AlertCircle, CheckCircle2, RotateCcw, Eye,
  Clock, TrendingUp, X, Send, ShieldAlert, Hammer, RefreshCw, Zap, Ban,
} from 'lucide-react';
import Link from 'next/link';

function RiskBar({ score }: { score: number }) {
  const s = score ?? 0;
  const color = s >= 75 ? 'bg-red-500' : s >= 50 ? 'bg-orange-500' : s >= 25 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{s}</span>
    </div>
  );
}

const DECISION_LABELS: Record<string, string> = {
  repair: 'REPAIR',
  replace: 'REPLACE',
  no_action: 'NO ACTION',
};

function ApproveModal({
  defect,
  onClose,
  onDone,
}: {
  defect: any;
  onClose: () => void;
  onDone: (moId: number | null) => void;
}) {
  const aiRec: 'repair' | 'replace' | 'no_action' =
    defect.repairOrReplace === 'replace' ? 'replace'
    : defect.repairOrReplace === 'no_action' ? 'no_action'
    : 'repair';

  const [decision, setDecision] = useState<'repair' | 'replace' | 'no_action'>(aiRec);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // pending = decision the supervisor clicked but hasn't confirmed yet
  const [pendingOverride, setPendingOverride] = useState<'repair' | 'replace' | 'no_action' | null>(null);

  const handleDecisionClick = (chosen: 'repair' | 'replace' | 'no_action') => {
    if (chosen === aiRec) {
      // Clicking the AI's own recommendation — no confirmation needed
      setDecision(chosen);
    } else {
      // Different from AI — ask for confirmation
      setPendingOverride(chosen);
    }
  };

  const confirmOverride = () => {
    if (pendingOverride) setDecision(pendingOverride);
    setPendingOverride(null);
  };

  const cancelOverride = () => setPendingOverride(null);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await maintenanceOrdersApi.approveDefectAndCreate(defect.id, decision, notes);
      onDone(res.data.id ?? null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
      setSaving(false);
    }
  };

  const isOverriding = decision !== aiRec;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Approve & Create Maintenance Order</h2>
            <p className="text-xs text-slate-500 mt-0.5">Defect #{defect.id} · {defect.aiDetectedComponent}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Override confirmation overlay — shown in-place when a different decision is clicked */}
          {pendingOverride && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Override AI Recommendation?</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    The AI analysed this defect and recommended{' '}
                    <span className="font-bold">{DECISION_LABELS[aiRec]}</span>.
                    You are about to change the decision to{' '}
                    <span className="font-bold">{DECISION_LABELS[pendingOverride]}</span>.
                    <br />
                    Please confirm this is intentional — this action will be logged for audit.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={cancelOverride}
                  className="flex-1 py-2 rounded-lg border border-amber-300 text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Keep AI Decision ({DECISION_LABELS[aiRec]})
                </button>
                <button
                  onClick={confirmOverride}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                >
                  Yes, Override to {DECISION_LABELS[pendingOverride]}
                </button>
              </div>
            </div>
          )}

          {/* AI recommendation banner */}
          {defect.repairOrReplace && (
            <div className={`rounded-xl p-3 border text-sm ${
              isOverriding
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : defect.repairOrReplace === 'replace'
                ? 'bg-red-50 border-red-200 text-red-700'
                : defect.repairOrReplace === 'no_action'
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <span className="font-semibold">
                AI recommends: {DECISION_LABELS[aiRec]}
                {isOverriding && <span className="ml-2 font-normal opacity-75">(overridden by you)</span>}
              </span>
              {defect.repairReplaceRationale && (
                <p className="text-xs mt-0.5 opacity-80">{defect.repairReplaceRationale}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your Decision *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['repair', 'replace', 'no_action'] as const).map((opt) => {
                const isAI = opt === aiRec;
                const isSelected = decision === opt;
                const colors = {
                  repair: isSelected ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  replace: isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300',
                  no_action: isSelected ? 'border-slate-500 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300',
                }[opt];
                const Icon = opt === 'repair' ? Hammer : opt === 'replace' ? RefreshCw : Ban;
                return (
                  <div key={opt} className="relative">
                    <button
                      onClick={() => handleDecisionClick(opt)}
                      className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${colors}`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt === 'no_action' ? 'No Action' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                    {isAI && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        AI Pick
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {decision === 'no_action' && !isOverriding && (
              <p className="text-xs text-slate-500 mt-1.5">Defect will be closed. No maintenance order will be created.</p>
            )}
            {isOverriding && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                You are overriding the AI recommendation. This will be noted in the audit trail.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isOverriding ? 'Reason for Override *' : 'Notes (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`input text-sm ${isOverriding ? 'border-amber-300 focus:border-amber-500' : ''}`}
              placeholder={
                isOverriding
                  ? `Explain why you chose ${DECISION_LABELS[decision]} instead of the AI's ${DECISION_LABELS[aiRec]} recommendation…`
                  : 'Add any special instructions or notes…'
              }
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={submit}
              disabled={saving || (isOverriding && !notes.trim())}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Creating MO…' : 'Approve & Create MO'}
            </button>
          </div>

          {isOverriding && !notes.trim() && (
            <p className="text-xs text-center text-amber-600">Please provide a reason for overriding the AI recommendation to proceed.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResubmitModal({ defect, onClose, onDone }: { defect: any; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try { await defectsApi.requestResubmit(defect.id, reason); onDone(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">Request Image Resubmission</h2>
            <p className="text-xs text-slate-500 mt-0.5">Defect #{defect.id} — operator will be notified</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input"
            placeholder="e.g. Image is blurry, please provide a clearer photo…" />
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={!reason.trim() || saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {saving ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PendingReviewsPage() {
  const router = useRouter();
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [resubmitTarget, setResubmitTarget] = useState<any>(null);
  const [decisions, setDecisions] = useState<Record<number, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await defectsApi.getPendingReviews();
      setDefects(res.data);
      res.data.forEach(async (d: any) => {
        try {
          const dec = await defectsApi.getDecision(d.id);
          setDecisions((prev) => ({ ...prev, [d.id]: dec.data }));
        } catch {}
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApproved = (moId: number | null) => {
    setApproveTarget(null);
    if (moId) {
      router.push(`/maintenance-orders/${moId}`);
    } else {
      load(); // no action — just refresh the review queue
    }
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...defects].sort((a, b) =>
    (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
    (severityOrder[b.severity as keyof typeof severityOrder] ?? 4)
  );

  const bySeverity = {
    critical: defects.filter((d) => d.severity === 'critical').length,
    high: defects.filter((d) => d.severity === 'high').length,
    medium: defects.filter((d) => d.severity === 'medium').length,
    low: defects.filter((d) => d.severity === 'low').length,
  };

  return (
    <>
      <TopBar
        title="Pending Reviews"
        subtitle={`${defects.length} defect${defects.length !== 1 ? 's' : ''} awaiting your decision`}
      />
      <div className="p-6 space-y-5 max-w-5xl">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Critical', count: bySeverity.critical, color: 'border-red-400 bg-red-50', text: 'text-red-700' },
            { label: 'High', count: bySeverity.high, color: 'border-orange-400 bg-orange-50', text: 'text-orange-700' },
            { label: 'Medium', count: bySeverity.medium, color: 'border-yellow-400 bg-yellow-50', text: 'text-yellow-700' },
            { label: 'Low', count: bySeverity.low, color: 'border-green-400 bg-green-50', text: 'text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`card border-l-4 ${s.color} p-4`}>
              <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label} severity</p>
            </div>
          ))}
        </div>

        {loading && <div className="card p-10 text-center text-slate-500">Loading…</div>}
        {!loading && defects.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium text-slate-600">All clear — no defects awaiting review</p>
            <p className="text-sm text-slate-400 mt-1">New defects from operators will appear here</p>
          </div>
        )}

        <div className="space-y-4">
          {sorted.map((d) => {
            const imgUrl = d.imageUrl ? `http://localhost:3001${d.imageUrl}` : null;
            const waitMinutes = Math.round((Date.now() - new Date(d.createdAt).getTime()) / 60000);
            const waitLabel = waitMinutes < 60 ? `${waitMinutes}m ago` : waitMinutes < 1440 ? `${Math.round(waitMinutes / 60)}h ago` : `${Math.round(waitMinutes / 1440)}d ago`;
            const dec = decisions[d.id];
            const borderColor = d.severity === 'critical' ? 'border-l-red-500' : d.severity === 'high' ? 'border-l-orange-500' : d.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500';

            return (
              <div key={d.id} className={`card overflow-hidden hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                    {imgUrl
                      ? <img src={imgUrl} alt="defect" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><AlertCircle className="w-6 h-6 text-slate-400" /></div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">Defect #{d.id}</span>
                      <SeverityBadge severity={d.severity} />
                      <StatusBadge status={d.status} />
                      {d.repairOrReplace && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${d.repairOrReplace === 'replace' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {d.repairOrReplace === 'replace' ? <RefreshCw className="w-3 h-3" /> : <Hammer className="w-3 h-3" />}
                          AI: {d.repairOrReplace?.toUpperCase()}
                        </span>
                      )}
                      {dec?.safetyRisk && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <ShieldAlert className="w-3 h-3" /> Safety Risk
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {waitLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-700">{d.aiDetectedComponent || 'Unknown component'}</p>
                      {d.damageType && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{d.damageType}</span>}
                    </div>

                    {(d.riskScore != null || dec?.riskScore != null) && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Risk Score</p>
                        <RiskBar score={dec?.riskScore ?? d.riskScore ?? 0} />
                      </div>
                    )}

                    {d.aiExplanation && (
                      <p className="text-xs text-slate-600 bg-blue-50 rounded-lg px-2 py-1.5 line-clamp-2">
                        <TrendingUp className="w-3 h-3 inline mr-1 text-blue-500" />{d.aiExplanation}
                      </p>
                    )}

                    {dec?.rulesFired?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dec.rulesFired.slice(0, 2).map((r: string, i: number) => (
                          <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> {r}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-400">
                      Reported by {d.createdBy?.name || 'Unknown'} · {formatDateTime(d.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0 w-36">
                    <button
                      onClick={() => setApproveTarget(d)}
                      className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & MO
                    </button>
                    <button
                      onClick={() => setResubmitTarget(d)}
                      className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Resubmit
                    </button>
                    <Link href={`/defects/${d.id}`}
                      className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Full Detail
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {approveTarget && (
        <ApproveModal
          defect={approveTarget}
          onClose={() => setApproveTarget(null)}
          onDone={handleApproved}
        />
      )}

      {resubmitTarget && (
        <ResubmitModal
          defect={resubmitTarget}
          onClose={() => setResubmitTarget(null)}
          onDone={() => { setResubmitTarget(null); load(); }}
        />
      )}
    </>
  );
}
