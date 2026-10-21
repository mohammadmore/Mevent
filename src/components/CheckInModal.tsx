import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, QrCode, CheckCircle, XCircle, Camera, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { loadCheckin, saveCheckin, ticketHash, normalizeTicketCode, CheckinState } from '../lib/checkinStore';
import { pNum } from '../lib/format';

// Door check-in for organizers: scans the ticket QR with the camera where the browser supports
// BarcodeDetector (Chrome/Android), and always allows typing the code printed under the QR.
// Works offline: the event's ticket list (hashes) is kept on the device, scans are checked
// locally and uploaded when the connection is back.

interface Result { ok: boolean; message: string; holder?: string }

const clock = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });

export function CheckInModal({ eventId, eventTitle, onClose, onCheckedIn }: { eventId: number; eventTitle: string; onClose: () => void; onCheckedIn: () => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanned = useRef('');
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  const [local, setLocal] = useState<CheckinState | null>(null);
  const localRef = useRef<CheckinState | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  const persist = async (next: CheckinState) => {
    localRef.current = next;
    setLocal(next);
    await saveCheckin(next);
  };

  /** Uploads scans made on this device; reports tickets that were also let in elsewhere. */
  const sync = useCallback(async () => {
    const state = localRef.current;
    const pending = state?.scans.filter(s => !s.synced) || [];
    if (!state || !pending.length || !navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await api<{ data: { results: { code: string; result: string }[] } }>(`/api/organizer/events/${eventId}/checkin/sync`, { body: { scans: pending }, silent: true });
      const byCode = new Map(res.data.results.map(r => [r.code, r.result]));
      const scans = state.scans.map(s => (byCode.has(s.code) ? { ...s, synced: true, result: byCode.get(s.code) as any } : s));
      const dups = res.data.results.filter(r => r.result === 'DUPLICATE').map(r => r.code);
      if (dups.length) setDuplicates(prev => [...new Set([...prev, ...dups])]);
      await persist({ ...localRef.current!, scans });
      onCheckedIn();
    } catch { /* stays queued */ } finally {
      setSyncing(false);
    }
  }, [eventId]);

  /** Fresh ticket list from the server; scans not uploaded yet stay marked as used. */
  const refreshManifest = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await api<{ data: { generatedAt: string; tickets: CheckinState['tickets'] } }>(`/api/organizer/events/${eventId}/checkin-manifest`, { silent: true });
      const base = localRef.current || await loadCheckin(eventId);
      await persist({ ...base, generatedAt: res.data.generatedAt, tickets: res.data.tickets });
    } catch { /* keep the list we have */ }
  }, [eventId]);

  useEffect(() => {
    loadCheckin(eventId).then(async state => {
      localRef.current = state;
      setLocal(state);
      await sync();
      await refreshManifest();
    });
    const goOnline = () => { setOnline(true); sync().then(refreshManifest); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [eventId]);

  /** Checks a code against the local list; falls back to the server when the list cannot decide. */
  const checkLocally = async (code: string): Promise<Result | null> => {
    const state = localRef.current;
    if (!state?.generatedAt) return null;
    const h = await ticketHash(eventId, code);
    if (!h) return null;
    const ticket = state.tickets.find(t => t.h === h);
    if (!ticket) return { ok: false, message: 'این کد در فهرست بلیت‌های این رویداد نیست.' };
    const holder = `${ticket.holder}${ticket.label ? ` (${ticket.label})` : ''}`;
    if (ticket.status === 'CANCELLED') return { ok: false, message: 'این بلیت لغو شده است.', holder };
    const earlier = state.scans.find(s => s.code === code);
    if (ticket.status === 'USED' || earlier) {
      const at = earlier?.scannedAt || ticket.usedAt;
      return { ok: false, message: `این بلیت قبلاً استفاده شده است${at ? ` (ساعت ${clock.format(new Date(at))})` : ''}.`, holder };
    }
    await persist({ ...state, scans: [...state.scans, { code, scannedAt: new Date().toISOString(), synced: false }] });
    sync();
    return { ok: true, message: navigator.onLine ? 'ورود تأیید شد.' : 'ورود تأیید شد (آفلاین؛ بعداً ارسال می‌شود).', holder };
  };

  /** Records a server-confirmed entry in the local list, so a later offline scan knows it. */
  const markUsedLocally = async (code: string) => {
    const state = localRef.current;
    const h = state?.generatedAt ? await ticketHash(eventId, code) : null;
    if (!state || !h) return;
    await persist({ ...state, tickets: state.tickets.map(t => (t.h === h ? { ...t, status: 'USED', usedAt: new Date().toISOString() } : t)) });
  };

  // Online, the server decides (so a ticket used at another door is refused right away); without
  // a connection, or if the server does not answer within a few seconds, the local list decides.
  const submit = async (value: string) => {
    const trimmed = normalizeTicketCode(value);
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      if (navigator.onLine) {
        try {
          const res = await api<any>(`/api/organizer/events/${eventId}/checkin`, { body: { code: trimmed }, silent: true, signal: AbortSignal.timeout(4000) });
          setResult({ ok: true, message: res.message, holder: `${res.holder}${res.label ? ` (${res.label})` : ''}` });
          setCode('');
          onCheckedIn();
          markUsedLocally(trimmed);
          return;
        } catch (err) {
          if (err instanceof ApiError && err.status > 0) {
            setResult({ ok: false, message: err.message });
            return;
          }
          // network trouble or timeout: fall through to the local list
        }
      }
      const localResult = await checkLocally(trimmed);
      if (localResult) {
        setResult(localResult);
        if (localResult.ok) setCode('');
      } else {
        setResult({ ok: false, message: 'اتصال برقرار نیست و فهرست آفلاین این رویداد هنوز دریافت نشده است.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = local?.scans.filter(s => !s.synced).length || 0;
  const usedCount = local ? local.tickets.filter(t => t.status === 'USED').length + local.scans.filter(s => !s.synced).length : 0;

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
        <div className="px-4 py-2 text-[11px] flex items-center justify-between gap-2 bg-white dark:bg-[#18181b] border-b border-gray-100 dark:border-white/5" aria-live="polite">
          <span className={`flex items-center gap-1 ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
            {online ? <span className="w-2 h-2 rounded-full bg-emerald-500" /> : <WifiOff className="w-3.5 h-3.5" />}
            {local?.generatedAt
              ? `فهرست آفلاین: ${pNum(local.tickets.length)} بلیت، ${pNum(usedCount)} ورود · ${clock.format(new Date(local.generatedAt))}`
              : online ? 'در حال دریافت فهرست آفلاین...' : 'فهرست آفلاین دریافت نشده است'}
          </span>
          <span className="flex items-center gap-2">
            {pendingCount > 0 && <span className="text-amber-600">{pNum(pendingCount)} در صف ارسال</span>}
            <button onClick={() => sync().then(refreshManifest)} disabled={!online || syncing} aria-label="به‌روزرسانی فهرست" className="disabled:opacity-40"><RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /></button>
          </span>
        </div>
        {duplicates.length > 0 && (
          <p className="px-4 py-2 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 flex gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {pNum(duplicates.length)} بلیت روی دستگاه دیگری هم وارد شده بود: <span dir="ltr" className="font-mono">{duplicates.join(', ')}</span>
          </p>
        )}
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
