'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { defectsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { formatDateTime } from '@/lib/utils';
import {
  Upload, AlertTriangle, CheckCircle2, Clock, Link2,
  RefreshCw, ChevronRight, Image, X,
} from 'lucide-react';

const statusMeta: Record<string, { label: string; color: string; icon: any; step: number }> = {
  pending_review:      { label: 'Pending Review',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock,         step: 1 },
  resubmit_requested:  { label: 'Resubmit Required',   color: 'text-orange-600 bg-orange-50 border-orange-200', icon: AlertTriangle,  step: 1 },
  resubmitted:         { label: 'Resubmitted',         color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: RefreshCw,      step: 2 },
  reviewed:            { label: 'Reviewed',            color: 'text-green-600 bg-green-50 border-green-200',    icon: CheckCircle2,   step: 2 },
  linked_to_mo:        { label: 'MO Created',          color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Link2,          step: 3 },
};

const STEPS = ['Submitted', 'Under Review', 'MO Created'];

function ResubmitModal({ defect, onClose, onDone }: { defect: any; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await defectsApi.resubmit(defect.id, file);
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">Resubmit Image</h2>
            <p className="text-xs text-slate-500 mt-0.5">Defect #{defect.id} — upload a clearer photo</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {defect.resubmitReason && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-semibold text-orange-700 mb-1">Supervisor's reason for resubmit:</p>
              <p className="text-sm text-orange-800">{defect.resubmitReason}</p>
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg object-contain" />
            ) : (
              <>
                <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Drop image here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — max 20MB</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSubmit} disabled={!file || uploading} className="btn-primary flex-1">
              {uploading ? 'Uploading & Analysing…' : 'Submit New Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyDefectsPage() {
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitTarget, setResubmitTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await defectsApi.getMy();
      setDefects(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resubmitRequests = defects.filter((d) => d.status === 'resubmit_requested');

  return (
    <>
      <TopBar title="My Submissions" subtitle="Track defects you've reported and their outcomes" />
      <div className="p-6 space-y-5 max-w-5xl">

        {/* Resubmit alerts */}
        {resubmitRequests.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Action Required — {resubmitRequests.length} resubmission{resubmitRequests.length !== 1 ? 's' : ''} requested
            </p>
            {resubmitRequests.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                <div>
                  <span className="text-sm font-medium text-slate-700">Defect #{d.id}</span>
                  <span className="text-xs text-slate-500 ml-2">— {d.aiDetectedComponent || 'Unknown component'}</span>
                  {d.resubmitReason && <p className="text-xs text-orange-700 mt-0.5">Reason: {d.resubmitReason}</p>}
                </div>
                <button onClick={() => setResubmitTarget(d)} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Resubmit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Defects list */}
        <div className="space-y-3">
          {loading && <div className="card p-10 text-center text-slate-500">Loading…</div>}
          {!loading && defects.length === 0 && (
            <div className="card p-12 text-center">
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No defects submitted yet</p>
              <Link href="/defects/new" className="btn-primary inline-flex items-center gap-2 mt-4">
                <Upload className="w-4 h-4" /> Upload your first defect
              </Link>
            </div>
          )}

          {defects.map((d) => {
            const meta = statusMeta[d.status] || statusMeta.pending_review;
            const Icon = meta.icon;
            const step = meta.step;
            const imgUrl = d.imageUrl ? `http://localhost:3001${d.imageUrl}` : null;

            return (
              <div key={d.id} className="card overflow-hidden">
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                    {imgUrl
                      ? <img src={imgUrl} alt="defect" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-400"><Image className="w-6 h-6" /></div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-800">Defect #{d.id}</span>
                        <span className="text-xs text-slate-500 ml-2">{formatDateTime(d.createdAt)}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 mt-1">{d.aiDetectedComponent || 'Component not identified'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {d.severity && <SeverityBadge severity={d.severity} />}
                      {d.damageType && <span className="text-xs text-slate-500">{d.damageType}</span>}
                    </div>

                    {/* Completion note */}
                    {d.completionNote && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                        <span className="font-medium">Outcome: </span>{d.completionNote}
                      </div>
                    )}

                    {/* Resubmit reason */}
                    {d.status === 'resubmit_requested' && d.resubmitReason && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
                        <span className="font-medium">Resubmit reason: </span>{d.resubmitReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {d.status === 'resubmit_requested' && (
                      <button
                        onClick={() => setResubmitTarget(d)}
                        className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> Resubmit
                      </button>
                    )}
                    <Link href={`/defects/${d.id}`} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-0">
                    {STEPS.map((label, i) => {
                      const done = step > i + 1;
                      const active = step === i + 1;
                      return (
                        <div key={label} className="flex items-center flex-1">
                          <div className={`flex items-center gap-1.5 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                              done ? 'bg-green-500 text-white' :
                              active ? 'bg-blue-700 text-white' :
                              'bg-slate-200 text-slate-400'
                            }`}>
                              {done ? '✓' : i + 1}
                            </div>
                            <span className={`text-xs ${active ? 'text-slate-700 font-medium' : done ? 'text-green-700' : 'text-slate-400'}`}>
                              {label}
                            </span>
                            {i < STEPS.length - 1 && (
                              <div className={`flex-1 h-px mx-2 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
