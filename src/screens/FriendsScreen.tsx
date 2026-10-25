import React, { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Share2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { pNum, timeAgo } from '../lib/format';
import { GeneratedAvatar } from '../components/Avatar';

// Friends (invite link, add by mobile number, requests) and the people you are going with.

type Who = { id: number; name: string; city?: string };
type FriendsData = { friends: Who[]; incoming: { requestId: number; user: Who }[]; outgoing: { requestId: number; user: Who }[]; inviteCode: string | null; shareAttendance: boolean };
type Match = { id: number; event: { id: number; title: string; startTime: string | null }; other: Who; lastMessageAt: string | null; lastMessage: { body: string; mine: boolean } | null };

const card = 'bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-5';
const input = 'flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-sm';
const primary = 'px-4 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black text-sm font-bold flex items-center gap-1.5 disabled:opacity-50';

export function FriendsScreen() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    api<{ data: FriendsData }>('/api/friends', { silent: true }).then(d => setData(d.data)).catch(() => {});
    api<{ data: Match[] }>('/api/together', { silent: true }).then(d => setMatches(d.data)).catch(() => setMatches([]));
  };
  useEffect(load, []);

  const link = data?.inviteCode ? `${window.location.origin}/invite/${data.inviteCode}` : '';
  const share = async () => {
    const text = 'بیا توی میونت دوست شیم تا ببینیم کجاها می‌ریم و با هم بریم:';
    if (navigator.share) { navigator.share({ title: 'میونت', text, url: link }).catch(() => {}); return; }
    try { await navigator.clipboard.writeText(`${text} ${link}`); showToast('لینک کپی شد؛ برای دوستات بفرست.', 'success'); } catch { showToast(link, 'info'); }
  };
  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api<{ message: string }>('/api/friends/request', { body: { phone } });
      showToast(res.message, 'success');
      setPhone('');
      load();
    } catch { /* toast shown */ } finally { setSending(false); }
  };
  const respond = (id: number, action: 'accept' | 'decline') => api(`/api/friends/requests/${id}/${action}`, { body: {} }).then(load).catch(() => {});
  const remove = async (f: Who) => {
    if (!await confirmDialog({ title: 'حذف دوست', message: `«${f.name}» از دوستانت حذف بشه؟`, confirmText: 'حذف', danger: true })) return;
    api(`/api/friends/${f.id}`, { method: 'DELETE' }).then(load).catch(() => {});
  };
  const setShare = (share: boolean) => {
    setData(d => d && { ...d, shareAttendance: share });
    api('/api/friends/settings', { method: 'PUT', body: { shareAttendance: share } }).catch(load);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Users className="w-6 h-6 text-teal-600 dark:text-[#d9ff00]" /> دوستان و همراه‌ها</h1>

      {matches && matches.length > 0 && (
        <section className={card} aria-label="همراه‌هام">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3">همراه‌هام</h2>
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {matches.map(m => (
              <li key={m.id}>
                <button onClick={() => navigate(`/together/${m.id}`)} className="w-full text-right py-3 flex items-center gap-3">
                  <GeneratedAvatar seed={m.other.id} className="w-10 h-10 rounded-full bg-gray-100" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{m.other.name} · {m.event.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{m.lastMessage ? `${m.lastMessage.mine ? 'تو: ' : ''}${m.lastMessage.body}` : 'سلام کن و قرارتون رو بذارید'}</span>
                  </span>
                  <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card} aria-label="اضافه کردن دوست">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1">دوستات رو بیار</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">دوست‌ها می‌بینن کدوم برنامه‌ها می‌رید و می‌تونن دعوتت کنن. هر کی با لینک تو بیاد، خودکار دوستت می‌شه.</p>
        {link && (
          <div className="flex gap-2 mb-4">
            <input readOnly value={link} dir="ltr" aria-label="لینک دعوت" className={`${input} text-gray-500`} onFocus={e => e.target.select()} />
            <button onClick={share} className={primary}>{'share' in navigator ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} فرستادن</button>
          </div>
        )}
        <form onSubmit={request} className="flex gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" aria-label="شماره موبایل دوست" className={input} />
          <button disabled={sending || phone.trim().length < 10} className={primary}><UserPlus className="w-4 h-4" /> درخواست</button>
        </form>
      </section>

      {data && data.incoming.length > 0 && (
        <section className={card} aria-label="درخواست‌های دوستی">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3">درخواست‌های دوستی</h2>
          <ul className="space-y-3">
            {data.incoming.map(r => (
              <li key={r.requestId} className="flex items-center gap-3">
                <GeneratedAvatar seed={r.user.id} className="w-10 h-10 rounded-full bg-gray-100" />
                <span className="flex-1 text-sm font-bold text-gray-900 dark:text-gray-100">{r.user.name}</span>
                <button onClick={() => respond(r.requestId, 'accept')} className={primary}><Check className="w-4 h-4" /> قبول</button>
                <button onClick={() => respond(r.requestId, 'decline')} aria-label="رد" className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10"><X className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card} aria-label="دوستانم">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3">دوستانم{data ? ` (${pNum(data.friends.length)})` : ''}</h2>
        {!data ? <div className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" /> : data.friends.length === 0 ? (
          <p className="text-sm text-gray-500">هنوز دوستی اضافه نکردی. لینک دعوتت رو برای چند نفر بفرست.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {data.friends.map(f => (
              <li key={f.id} className="py-2.5 flex items-center gap-3">
                <GeneratedAvatar seed={f.id} className="w-9 h-9 rounded-full bg-gray-100" />
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{f.name} <span className="text-xs text-gray-500">{f.city}</span></span>
                <button onClick={() => remove(f)} aria-label={`حذف ${f.name}`} className="p-2 text-gray-400 hover:text-red-500"><UserMinus className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {data && data.outgoing.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">در انتظار جواب: {data.outgoing.map(o => o.user.name).join('، ')}</p>
        )}
      </section>

      {data && (
        <label className={`${card} flex items-center gap-3 cursor-pointer`}>
          <span className="flex-1"><span className="block font-bold text-sm text-gray-900 dark:text-gray-100">دوستام ببینن کجا می‌رم</span><span className="text-xs text-gray-500">اگه خاموش باشه، اسمت توی «دوستات میان» نمیاد.</span></span>
          <input type="checkbox" className="w-5 h-5" checked={data.shareAttendance} onChange={e => setShare(e.target.checked)} aria-label="دوستام ببینن کجا می‌رم" />
        </label>
      )}
    </div>
  );
}

export function TogetherScreen({ id }: { id: number }) {
  const [data, setData] = useState<any>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const end = React.useRef<HTMLDivElement>(null);

  const load = () => api<{ data: any }>(`/api/together/${id}`, { silent: true }).then(d => setData(d.data)).catch(() => navigate('/friends', { replace: true }));
  useEffect(() => {
    load();
    // Light polling while the chat is open; push notifications cover the rest.
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 5000);
    return () => clearInterval(t);
  }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [data?.messages?.length]);
  if (!data) return <div className="max-w-2xl mx-auto w-full h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api(`/api/together/${id}/messages`, { body: { body } });
      setBody('');
      await load();
    } catch { /* toast shown */ } finally { setSending(false); }
  };
  const act = async (kind: 'befriend' | 'block' | 'report') => {
    if (kind === 'befriend') {
      const res = await api<{ message: string }>(`/api/together/${id}/befriend`, { body: {} }).catch(() => null);
      if (res) showToast(res.message, 'success');
      return load();
    }
    if (kind === 'block') {
      if (!await confirmDialog({ title: `مسدود کردن «${data.other.name}»`, message: 'دیگه همدیگه رو توی میونت نمی‌بینید و این گفتگو بسته می‌شه.', confirmText: 'مسدود کن', danger: true })) return;
      const res = await api<{ message: string }>(`/api/users/${data.other.id}/block`, { body: {} }).catch(() => null);
      if (res) showToast(res.message, 'success');
      return load();
    }
    const reason = await promptDialog({ title: `گزارش «${data.other.name}»`, message: 'چی شده؟', choices: ['مزاحمت', 'پیام نامناسب', 'هویت جعلی', 'تبلیغ یا کلاهبرداری'], placeholder: 'دلیل' });
    if (!reason) return;
    const res = await api<{ message: string }>(`/api/users/${data.other.id}/report`, { body: { reason } }).catch(() => null);
    if (res) showToast(res.message, 'success');
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-5 border border-gray-200 dark:border-white/10 space-y-4">
      <div className="flex items-center gap-3">
        <GeneratedAvatar seed={data.other.id} className="w-11 h-11 rounded-full bg-gray-100" />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 dark:text-gray-100">{data.other.name}</h1>
          <button onClick={() => navigate(`/events/${data.event.id}`)} className="text-xs text-teal-700 dark:text-[#d9ff00] truncate block">با هم: {data.event.title}</button>
        </div>
        {!data.isFriend && data.open && <button onClick={() => act('befriend')} className="text-xs px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center gap-1"><UserPlus className="w-4 h-4" /> دوست شیم</button>}
      </div>
      <p className="text-[11px] text-gray-500 bg-amber-50 dark:bg-white/5 rounded-xl p-3">اولین بار توی خود رویداد یا یه جای شلوغ همدیگه رو ببینید. لازم نیست شماره یا آدرست رو بدی.</p>
      <ol className="space-y-2 min-h-[120px]">
        {data.messages.length === 0 && <li className="text-sm text-gray-500 text-center py-6">سلام کن و قرارتون رو بذارید 👋</li>}
        {data.messages.map((m: any) => (
          <li key={m.id} className={`max-w-[85%] w-fit rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.mine ? 'ml-auto bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black' : 'mr-auto bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100'}`}>
            {m.body}
            <span className="block text-[10px] opacity-60 mt-1">{timeAgo(m.createdAt)}</span>
          </li>
        ))}
      </ol>
      <div ref={end} />
      {data.open ? (
        <form onSubmit={send} className="flex gap-2">
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="پیام…" aria-label="متن پیام" maxLength={1000} className={input} />
          <button disabled={sending || !body.trim()} className={primary}>بفرست</button>
        </form>
      ) : <p className="text-sm text-gray-500 text-center">این گفتگو بسته شده.</p>}
      <div className="flex gap-4 justify-center text-xs text-gray-500">
        <button onClick={() => act('report')}>گزارش</button>
        {data.open && <button onClick={() => act('block')}>مسدود کردن</button>}
      </div>
    </div>
  );
}
