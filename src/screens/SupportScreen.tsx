import React, { useEffect, useRef, useState } from 'react';
import { LifeBuoy, Plus, ArrowRight, Send, CheckCircle2 } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { useAppData } from '../lib/appData';
import { timeAgo, pNum } from '../lib/format';

// Support requests: list, new request, and the conversation with staff. Admins use the same
// thread view (they also see who asked and their contact details).

export const SUPPORT_CATEGORIES: Record<string, string> = {
  PAYMENT: 'پرداخت و بازپرداخت', TICKET: 'بلیت و ورود', ACCOUNT: 'حساب کاربری', ORGANIZER: 'برگزارکنندگان', OTHER: 'سایر',
};
export const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'در انتظار پاسخ', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  ANSWERED: { label: 'پاسخ داده شد', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  CLOSED: { label: 'بسته شده', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
};
const input = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-sm';

export function SupportThread({ id, backTo, onBack }: { id: number; backTo: string; onBack?: () => void }) {
  const { profile } = useAppData();
  const [data, setData] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = () => api<{ data: any }>(`/api/support/${id}`).then(d => setData(d.data)).catch(() => (onBack ? onBack() : navigate(backTo, { replace: true })));
  useEffect(() => { load(); }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [data?.messages?.length]);
  if (!data) return <div className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api(`/api/support/${id}/messages`, { body: { body: reply } });
      setReply('');
      await load();
    } catch { /* toast shown */ } finally {
      setSending(false);
    }
  };
  const close = async () => {
    await api(`/api/support/${id}/close`, { body: {} }).catch(() => {});
    load();
  };
  const t = data.ticket;
  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="space-y-4">
      <button onClick={() => (onBack ? onBack() : navigate(backTo))} className="text-sm text-gray-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> همه درخواست‌ها</button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t.subject}</h2>
          <p className="text-xs text-gray-500 mt-1">{SUPPORT_CATEGORIES[t.category]} · شماره {pNum(t.id)}{t.orderId ? ` · سفارش ${pNum(t.orderId)}` : ''}</p>
          {data.requester && <p className="text-xs text-gray-500 mt-1">{data.requester.name} · <span dir="ltr">{data.requester.fullPhone || data.requester.email || ''}</span></p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
      </div>
      <ol className="space-y-3">
        {data.messages.map((m: any) => (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.isStaff ? 'mr-auto bg-teal-600/10 dark:bg-[#d9ff00]/10' : 'ml-auto bg-gray-100 dark:bg-white/5'}`}>
            <p className="text-[11px] text-gray-500 mb-1">{m.authorName} · {timeAgo(m.createdAt)}</p>
            {m.body}
          </li>
        ))}
      </ol>
      <div ref={end} />
      {t.status !== 'CLOSED' || isAdmin ? (
        <form onSubmit={send} className="space-y-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder={isAdmin ? 'پاسخ به کاربر' : 'پیام شما'} aria-label="متن پیام" className={input} />
          <div className="flex gap-2">
            <button disabled={sending || reply.trim().length < 2} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"><Send className="w-4 h-4" /> ارسال</button>
            {t.status !== 'CLOSED' && <button type="button" onClick={close} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {isAdmin ? 'بستن درخواست' : 'مشکلم حل شد'}</button>}
          </div>
        </form>
      ) : <p className="text-sm text-gray-500">این درخواست بسته شده است.</p>}
    </div>
  );
}

function NewRequest({ onCreated }: { onCreated: (id: number) => void }) {
  const [f, setF] = useState({ subject: '', category: 'OTHER', body: '', orderId: '' });
  const [sending, setSending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api<{ data: { id: number }; message: string }>('/api/support', { body: { ...f, orderId: f.orderId || undefined } });
      showToast(res.message, 'success');
      onCreated(res.data.id);
    } catch { /* toast shown */ } finally {
      setSending(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-gray-200 dark:border-white/10 p-4">
      <label className="block"><span className="block text-xs text-gray-500 mb-1">موضوع</span><input required minLength={3} className={input} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
      <label className="block"><span className="block text-xs text-gray-500 mb-1">دسته</span>
        <select className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
      {f.category === 'PAYMENT' && <label className="block"><span className="block text-xs text-gray-500 mb-1">شماره سفارش (اختیاری)</span><input dir="ltr" inputMode="numeric" className={input} value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value.replace(/\D/g, '') })} /></label>}
      <label className="block"><span className="block text-xs text-gray-500 mb-1">شرح مشکل</span><textarea required minLength={10} rows={4} className={input} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
      <button disabled={sending} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold disabled:opacity-60">{sending ? 'در حال ارسال...' : 'ثبت درخواست'}</button>
    </form>
  );
}

export function SupportScreen({ ticketId }: { ticketId?: number }) {
  const [list, setList] = useState<any[] | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (!ticketId) api<{ data: any[] }>('/api/support', { silent: true }).then(d => setList(d.data)).catch(() => setList([])); }, [ticketId]);

  return (
    <div className="max-w-2xl mx-auto w-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
      {ticketId ? <SupportThread id={ticketId} backTo="/support" /> : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> پشتیبانی</h1>
            {!creating && <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> درخواست جدید</button>}
          </div>
          {creating && <NewRequest onCreated={(id) => navigate(`/support/${id}`)} />}
          {list === null ? <div className="h-24 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" /> : list.length === 0 && !creating ? (
            <p className="text-sm text-gray-500 py-6 text-center">درخواستی ثبت نکرده‌اید. اگر مشکلی در خرید، بلیت یا حساب دارید، درخواست جدید ثبت کنید.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/5">
              {list.map(t => (
                <li key={t.id}>
                  <button onClick={() => navigate(`/support/${t.id}`)} className="w-full text-right py-3 flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="block font-bold text-sm truncate">{t.subject}</span><span className="text-xs text-gray-500">{SUPPORT_CATEGORIES[t.category]} · {timeAgo(t.lastMessageAt)}</span></span>
                    <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
