'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { defectsApi, componentsApi } from '@/lib/api';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import {
  Camera, Upload, X, RefreshCw, CheckCircle2, AlertTriangle,
  Zap, ShieldAlert, Hammer, ArrowRight, RotateCcw, ScanLine,
} from 'lucide-react';

type Step = 'capture' | 'analyzing' | 'result';
type Mode = 'camera' | 'upload';

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const s = score ?? 0;
  const cfg = s >= 75
    ? { cls: 'text-red-400 bg-red-900/40 border-red-700', label: 'CRITICAL RISK' }
    : s >= 50
    ? { cls: 'text-orange-400 bg-orange-900/40 border-orange-700', label: 'HIGH RISK' }
    : s >= 25
    ? { cls: 'text-yellow-400 bg-yellow-900/40 border-yellow-700', label: 'MEDIUM RISK' }
    : { cls: 'text-green-400 bg-green-900/40 border-green-700', label: 'LOW RISK' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.cls}`}>
      <ShieldAlert className="w-3.5 h-3.5" /> {cfg.label} · {s}/100
    </span>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>('camera');
  const [step, setStep] = useState<Step>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [componentId, setComponentId] = useState('');

  useEffect(() => {
    componentsApi.getAll().then((r) => setComponents(r.data)).catch(() => {});
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      setCameraError('Camera not available on this device. Use the Upload tab.');
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera' && step === 'capture') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, step, startCamera, stopCamera]);

  const runAnalysis = async (file: File, imageUrl: string) => {
    setStep('analyzing');
    setError(null);
    try {
      const res = await defectsApi.upload(file, componentId ? parseInt(componentId) : undefined);
      const data = res.data;
      if (!data.aiDetectedComponent) {
        setError('Could not detect a component. Please upload a clearer image of the damaged part.');
        setStep('capture');
        setCapturedImage(null);
        setCapturedFile(null);
        if (mode === 'camera') startCamera();
        return;
      }
      setResult(data);
      setStep('result');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : (msg || 'Analysis failed. Please try again.'));
      setStep('capture');
      setCapturedImage(null);
      setCapturedFile(null);
      if (mode === 'camera') startCamera();
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
      runAnalysis(file, dataUrl);
    }, 'image/jpeg', 0.92);
  };

  const handleFileSelect = (f: File) => {
    const url = URL.createObjectURL(f);
    setCapturedImage(url);
    setCapturedFile(f);
    runAnalysis(f, url);
  };

  const retake = () => {
    setStep('capture');
    setCapturedImage(null);
    setCapturedFile(null);
    setResult(null);
    setError(null);
    if (mode === 'camera') startCamera();
  };

  const stepIndex = { capture: 0, analyzing: 1, result: 2 }[step];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">AION Defect Scanner</h1>
            <p className="text-slate-400 text-xs">Gemini AI-powered inspection</p>
          </div>
        </div>
        <button onClick={() => router.push('/my-defects')} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors">
          My Reports <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Step bar */}
      <div className="bg-slate-800/80 px-4 py-2.5 flex items-center gap-1 flex-shrink-0">
        {['Scan', 'AI Analysis', 'Result'].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <div className={`h-px w-6 ${i <= stepIndex ? 'bg-blue-500' : 'bg-slate-600'}`} />}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${i === stepIndex ? 'text-blue-400' : i < stepIndex ? 'text-green-400' : 'text-slate-500'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${i === stepIndex ? 'bg-blue-600 text-white' : i < stepIndex ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {s}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto w-full p-4 space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-semibold text-sm">Invalid Image</p>
                <p className="text-red-400 text-xs mt-1 leading-relaxed">{error}</p>
              </div>
              <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}

          {/* ── CAPTURE ── */}
          {step === 'capture' && (
            <>
              <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                {(['camera', 'upload'] as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                    {m === 'camera' ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {m === 'camera' ? 'Live Camera' : 'Upload Photo'}
                  </button>
                ))}
              </div>

              <select value={componentId} onChange={(e) => setComponentId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                <option value="">AI auto-detects component</option>
                {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {mode === 'camera' ? (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {cameraError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
                        <Camera className="w-10 h-10 text-slate-600" />
                        <p className="text-slate-400 text-sm">{cameraError}</p>
                        <button onClick={() => { setCameraError(null); startCamera(); }}
                          className="text-blue-400 text-xs underline">Try again</button>
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        {cameraReady && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-8 border border-blue-400/40 rounded-lg" />
                            <div className="absolute top-8 left-8 w-5 h-5 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                            <div className="absolute top-8 right-8 w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                            <div className="absolute bottom-8 left-8 w-5 h-5 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                            <div className="absolute bottom-8 right-8 w-5 h-5 border-b-2 border-r-2 border-blue-400 rounded-br" />
                            <div className="absolute inset-x-8 top-1/2 h-px bg-blue-400/30 animate-pulse" />
                            <p className="absolute bottom-4 inset-x-0 text-center text-blue-300 text-xs">
                              Align component within frame
                            </p>
                          </div>
                        )}
                        {!cameraReady && !cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <button onClick={captureFromCamera} disabled={!cameraReady}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-3 text-base transition-all">
                    <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                    Capture & Analyze
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-800/50 rounded-2xl p-10 text-center cursor-pointer transition-all"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                  >
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-white font-semibold">Drop image here or tap to browse</p>
                    <p className="text-slate-400 text-sm mt-1">PNG · JPG · WEBP · Max 20MB</p>
                    <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                      Upload a clear photo of the damaged industrial component such as a motor, bearing, pump, gear, or conveyor belt
                    </p>
                  </div>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </>
          )}

          {/* ── ANALYZING ── */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              {capturedImage && (
                <div className="w-48 h-32 rounded-xl overflow-hidden bg-slate-800 border border-slate-600">
                  <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-center space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-900/50 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-600/30 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Analyzing Image</p>
                  <p className="text-slate-400 text-sm mt-1">Gemini Vision AI is processing…</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-green-400">✓ Image uploaded</p>
                  <p className="text-blue-400 animate-pulse">⟳ Detecting component & damage…</p>
                  <p className="text-slate-600">○ Calculating risk score</p>
                  <p className="text-slate-600">○ Generating recommendation</p>
                </div>
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {capturedImage && (
                <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                  <img src={capturedImage} alt="defect" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3">
                    <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Analyzed
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-slate-800 rounded-2xl p-4 space-y-4 border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-white font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" /> AI Result
                  </h2>
                  <RiskGauge score={result.riskScore} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Component', value: result.aiDetectedComponent || '—' },
                    { label: 'Damage Type', value: result.damageType || '—' },
                  ].map((f) => (
                    <div key={f.label} className="bg-slate-700/50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs mb-1">{f.label}</p>
                      <p className="text-white font-semibold text-sm">{f.value}</p>
                    </div>
                  ))}
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Severity</p>
                    <SeverityBadge severity={result.severity} />
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1.5">AI Confidence</p>
                    <ConfidenceBar value={result.aiConfidence || 0} />
                  </div>
                </div>

                {/* Decision */}
                <div className={`rounded-xl p-3.5 border ${
                  result.repairOrReplace === 'replace'
                    ? 'bg-red-900/30 border-red-700'
                    : result.repairOrReplace === 'no_action'
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-green-900/30 border-green-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result.repairOrReplace === 'replace'
                      ? <RefreshCw className="w-4 h-4 text-red-400" />
                      : result.repairOrReplace === 'no_action'
                      ? <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      : <Hammer className="w-4 h-4 text-green-400" />
                    }
                    <span className={`font-bold text-sm ${
                      result.repairOrReplace === 'replace'
                        ? 'text-red-300'
                        : result.repairOrReplace === 'no_action'
                        ? 'text-slate-300'
                        : 'text-green-300'
                    }`}>
                      AI Recommends: {result.repairOrReplace === 'no_action' ? 'NO ACTION REQUIRED' : (result.repairOrReplace || 'repair').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{result.repairReplaceRationale}</p>
                </div>

                {result.aiExplanation && (
                  <div className="bg-slate-700/30 rounded-xl p-3">
                    <p className="text-slate-500 text-xs mb-1">Analysis</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.aiExplanation}</p>
                  </div>
                )}

                {result.aiSuggestedAction && (
                  <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-3">
                    <p className="text-blue-400 text-xs font-bold mb-1">Recommended Action</p>
                    <p className="text-blue-300 text-sm">{result.aiSuggestedAction}</p>
                  </div>
                )}
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-300 font-semibold text-sm">Report Submitted</p>
                  <p className="text-green-500 text-xs mt-0.5">Supervisor has been notified and will review shortly.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={retake}
                  className="py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all">
                  <RotateCcw className="w-4 h-4" /> Scan Another
                </button>
                <button onClick={() => router.push('/my-defects')}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all">
                  My Reports <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
