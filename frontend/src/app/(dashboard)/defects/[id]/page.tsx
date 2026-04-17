'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { defectsApi, maintenanceOrdersApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Wrench, RotateCcw, TrendingUp, Brain, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

function ResubmitRequestModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try { await onSubmit(reason); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">Request Image Resubmission</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">The operator will be notified and asked to upload a clearer image.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input" placeholder="e.g. Image quality too low to assess damage extent…" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={!reason.trim() || saving} className="btn-primary flex-1">
              {saving ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DefectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole, user } = useAuth();
  const [defect, setDefect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingMO, setCreatingMO] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  const load = () => defectsApi.getOne(Number(id)).then((r) => {
    setDefect(r.data);
    setNotes(r.data.supervisorNotes || '');
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const handleReview = async () => {
    setSaving(true);
    try {
      const updated = await defectsApi.review(Number(id), { supervisorNotes: notes });
      setDefect(updated.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save review');
    } finally { setSaving(false); }
  };

  const handleCreateMO = async () => {
    setCreatingMO(true);
    try {
      const mo = await maintenanceOrdersApi.create({ defectId: Number(id) });
      router.push(`/maintenance-orders/${mo.data.id}`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create MO');
      setCreatingMO(false);
    }
  };

  const handleRequestResubmit = async (reason: string) => {
    await defectsApi.requestResubmit(Number(id), reason);
    setShowResubmitModal(false);
    load();
  };

  const imgUrl = defect?.imageUrl ? `http://localhost:3001${defect.imageUrl}` : null;
  const isSupervisor = hasRole('supervisor', 'admin');
  const isOwner = user?.id === defect?.createdById;

  if (loading) return <><TopBar title="Defect Detail" /><div className="p-6 text-slate-500">Loading…</div></>;
  if (!defect) return <><TopBar title="Defect Detail" /><div className="p-6 text-slate-500">Not found</div></>;

  return (
    <>
      <TopBar title={`Defect #${defect.id}`} subtitle={defect.aiDetectedComponent || 'Defect Report'} />
      <div className="p-6 max-w-5xl space-y-5">
        <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Status banners */}
        {defect.status === 'resubmit_requested' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800">Image Resubmission Requested</p>
              {defect.resubmitReason && <p className="text-sm text-orange-700 mt-0.5">Reason: {defect.resubmitReason}</p>}
              {isOwner && (
                <p className="text-xs text-orange-600 mt-1">Go to <strong>My Submissions</strong> to upload a new image.</p>
              )}
            </div>
          </div>
        )}

        {defect.status === 'linked_to_mo' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-800 font-medium">This defect has been linked to a Maintenance Order and is being actioned.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Image */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Defect Image</h3>
            {imgUrl
              ? <img src={imgUrl} alt="defect" className="w-full rounded-lg object-contain max-h-72 bg-slate-100" />
              : <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">No image</div>
            }
            <p className="text-xs text-slate-400 mt-2">
              Reported by <strong>{defect.createdBy?.name || 'Unknown'}</strong> · {formatDateTime(defect.createdAt)}
            </p>
          </div>

          {/* AI Analysis */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-slate-800">AI Analysis</h2>
              </div>
              <StatusBadge status={defect.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs mb-0.5">Component</div>
                <div className="font-medium">{defect.aiDetectedComponent || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-0.5">Damage Type</div>
                <div className="font-medium">{defect.damageType || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-0.5">Severity</div>
                <SeverityBadge severity={defect.severity} />
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-0.5">AI Confidence</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.round((defect.aiConfidence || 0) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium">{Math.round((defect.aiConfidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>

            {defect.aiExplanation && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 leading-relaxed">
                {defect.aiExplanation}
              </div>
            )}

            {defect.aiSuggestedAction && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">AI Recommendation</p>
                  <p className="text-sm text-blue-800">{defect.aiSuggestedAction}</p>
                </div>
              </div>
            )}

            {defect.completionNote && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-xs font-semibold text-green-700 mb-0.5">Outcome</p>
                <p className="text-sm text-green-800">{defect.completionNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* Supervisor actions */}
        {isSupervisor && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Supervisor Review</h2>

            {defect.supervisorNotes && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Previous notes</span>
                {defect.supervisorNotes}
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input"
              placeholder="Add review notes, corrections, or observations…"
            />

            <div className="flex flex-wrap gap-3">
              <button onClick={handleReview} disabled={saving} className="btn-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Review'}
              </button>

              {defect.status !== 'linked_to_mo' && defect.status !== 'resubmit_requested' && (
                <button onClick={handleCreateMO} disabled={creatingMO} className="btn-secondary flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  {creatingMO ? 'Creating…' : 'Create Maintenance Order'}
                </button>
              )}

              {defect.status !== 'linked_to_mo' && (
                <button
                  onClick={() => setShowResubmitModal(true)}
                  className="btn-secondary flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Resubmission
                </button>
              )}
            </div>
          </div>
        )}

        {/* Operator view for resubmit status */}
        {!isSupervisor && isOwner && defect.status === 'resubmit_requested' && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-2">Action Required</h2>
            <p className="text-sm text-slate-600 mb-3">Please visit <strong>My Submissions</strong> to upload a new image for this defect.</p>
          </div>
        )}
      </div>

      {showResubmitModal && (
        <ResubmitRequestModal
          onClose={() => setShowResubmitModal(false)}
          onSubmit={handleRequestResubmit}
        />
      )}
    </>
  );
}
