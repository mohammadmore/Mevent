import React, { useEffect, useRef, useState } from 'react';
import { X, QrCode, CheckCircle, XCircle, Camera } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';

// Door check-in for organizers: scans the ticket QR with the camera where the browser supports
// BarcodeDetector (Chrome/Android), and always allows typing the code printed under the QR.

interface Result { ok: boolean; message: string; holder?: string }

export function CheckInModal({ eventId, eventTitle, onClose, onCheckedIn }: { eventId: number; eventTitle: string; onClose: () => void; onCheckedIn: () => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanned = useRef('');
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await api<any>(`/api/organizer/events/${eventId}/checkin`, { body: { code: trimmed }, silent: true });
      setResult({ ok: true, message: res.message, holder: `${res.holder}${res.label ? ` (${res.label})` : ''}` });
      setCode('');
      onCheckedIn();
    } catch (err) {
      setResult({ ok: false, message: err instanceof ApiError ? err.message : 'بررسی بلیت انجام نشد.' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            // The same QR stays in front of the camera for a while; submit it only once.
            if (raw && raw !== lastScanned.current) {
              lastScanned.current = raw;
              await submit(raw);
            }
          } catch { /* frame not ready */ }
          setTimeout(tick, 400);
        };
        tick();
      } catch {
        setCameraOn(false);
        setResult({ ok: false, message: 'دسترسی به دوربین ممکن نشد. کد بلیت را دستی وارد کنید.' });
      }
    })();
    return () => { stopped = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [cameraOn]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" dir="rtl">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-white/10">
          <div>
            <h3 className="font-bold text-[#515739] dark:text-gray-100">ورود شرکت‌کنندگان</h3>
            <p className="text-xs text-gray-500 truncate max-w-[220px]">{eventTitle}</p>
          </div>
          <button onClick={onClose} aria-label="بستن" className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 bg-gray-50 dark:bg-[#1f1f23]">
          {cameraOn ? (
            <video ref={videoRef} className="w-full rounded-xl bg-black aspect-square object-cover" muted playsInline />
          ) : canScan ? (
            <button onClick={() => { lastScanned.current = ''; setCameraOn(true); }} className="w-full aspect-[2/1] border-2 border-dashed border-teal-600 dark:border-[#d9ff00] rounded-2xl flex flex-col items-center justify-center gap-2 text-teal-700 dark:text-[#d9ff00]">
              <Camera className="w-10 h-10" /> <span className="text-sm font-bold">اسکن QR با دوربین</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500"><QrCode className="w-5 h-5" /> مرورگر شما اسکن مستقیم را پشتیبانی نمی‌کند؛ کد زیر QR را وارد کنید.</div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="کد بلیت"
              dir="ltr"
              autoFocus={!canScan}
              className="flex-1 font-mono tracking-widest bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button type="submit" disabled={busy || !code.trim()} className="px-4 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold disabled:opacity-50">ثبت ورود</button>
          </form>

          {result && (
            <div className={`rounded-xl p-3 flex items-start gap-2 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200'}`} role="status">
              {result.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
              <span><span className="font-bold block">{result.message}</span>{result.holder && <span className="text-xs">{result.holder}</span>}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
