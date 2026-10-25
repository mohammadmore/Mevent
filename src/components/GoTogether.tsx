import React, { useEffect, useState } from 'react';
import { Check, HandHeart, MessageCircle, Send, UserPlus, Users, X } from 'lucide-react';
import { api, ApiError, showToast } from '../lib/apiClient';
import { navigate } from '../lib/router';
import { useAppData } from '../lib/appData';
import { pNum } from '../lib/format';
import { promptDialog } from '../lib/dialog';
import { GeneratedAvatar } from './Avatar';

// "تنها نرو" on an event page: friends who are going, inviting friends, and people looking for
// company ("دنبال همراهم") with "let's go together" requests.

type Who = { id: number; name: string; city?: string };
type Post = { id: number; note: string | null; user: Who; isFriend: boolean; mutualFriends: number; myRequest: { id: number; status: string } | null };
type Request = { id: number; status: string; message: string | null; user: Who; isFriend: boolean; mutualFriends: number };
type Together = {
  goingCount: number; canPlan: boolean; companionCount: number;
  friendsGoing: Who[]; friendsSaved: Who[];
  posts: Post[]; myPost: { id: number; note: string | null; requests: Request[] } | null;
};

const firstName = (n?: string) => (n || '').trim().split(/\s+/)[0];
const names = (list: Who[]) => list.length <= 2 ? list.map(w => `«${firstName(w.name)}»`).join(' و ') : `«${firstName(list[0].name)}» و ${pNum(list.length - 1)} دوست دیگه`;
const btn = 'px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50';
const primary = `${btn} bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black`;
const quiet = `${btn} bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200`;

function Faces({ people }: { people: Who[] }) {
  return (
    <span className="flex -space-x-2 space-x-reverse">
      {people.slice(0, 4).map(p => <GeneratedAvatar key={p.id} seed={p.id} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#18181b] bg-gray-100" />)}
    </span>
  );
}

function trust(p: { isFriend: boolean; mutualFriends: number; user: Who }) {
  if (p.isFriend) return 'دوستته';
  if (p.mutualFriends) return `${pNum(p.mutualFriends)} دوست مشترک`;
  return p.user.city || '';
}

function InviteFriends({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [friends, setFriends] = useState<Who[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  useEffect(() => { api<{ data: { friends: Who[] } }>('/api/friends', { silent: true }).then(d => setFriends(d.data.friends)).catch(() => setFriends([])); }, []);
  const send = async () => {
    setSending(true);
    try {
      const res = await api<{ message: string }>(`/api/events/${eventId}/invite`, { body: { friendIds: picked } });
      showToast(res.message, 'success');
      onClose();
    } catch { /* toast shown */ } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-label="دعوت دوستان" className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">کیا رو با خودت می‌بری؟</h3>
          <button onClick={onClose} aria-label="بستن"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        {friends === null ? <div className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" /> : friends.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
            <p>هنوز دوستی توی میونت نداری.</p>
            <button onClick={() => navigate('/friends')} className={primary}><UserPlus className="w-4 h-4" /> دعوت دوستان به میونت</button>
          </div>
        ) : (
          <>
            <ul className="space-y-1">
              {friends.map(f => (
                <li key={f.id}>
                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={picked.includes(f.id)} onChange={() => setPicked(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} />
                    <GeneratedAvatar seed={f.id} className="w-8 h-8 rounded-full bg-gray-100" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{f.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button disabled={!picked.length || sending} onClick={send} className={`${primary} w-full justify-center`}><Send className="w-4 h-4" /> بفرست</button>
          </>
        )}
      </div>
    </div>
  );
}

export function GoTogether({ eventId }: { eventId: number }) {
  const { profile, requireLogin } = useAppData();
  const [data, setData] = useState<Together | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => api<{ data: Together }>(`/api/events/${eventId}/together`, { silent: true }).then(d => setData(d.data)).catch(() => {});
  useEffect(() => { load(); }, [eventId, profile?.id]);

  const run = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.message) showToast(res.message, 'success');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.data?.code === 'PHONE_REQUIRED') navigate('/profile');
    } finally { setBusy(null); }
  };

  if (!data) return null;
  const lookForCompany = async () => {
    if (!requireLogin()) return;
    const note = await promptDialog({ title: 'دنبال همراهم', message: 'یه خط درباره‌ی خودت یا برنامه‌ت بنویس (اختیاری). مثلاً «اولین بارمه، قبلش یه قهوه بخوریم؟»', placeholder: 'یادداشت کوتاه', confirmText: 'ثبت', minLength: 0 });
    if (note === null) return;
    run('post', () => api(`/api/events/${eventId}/companions`, { body: { note } }));
  };
  const ask = async (post: Post) => {
    if (!requireLogin()) return;
    const message = await promptDialog({ title: `با «${firstName(post.user.name)}» بری؟`, message: 'یه پیام کوتاه بفرست (اختیاری).', placeholder: 'سلام! منم میام…', confirmText: 'بریم با هم', minLength: 0 });
    if (message === null) return;
    run(`ask-${post.id}`, () => api(`/api/companions/${post.id}/requests`, { body: { message } }));
  };
  const nobody = !data.friendsGoing.length && !data.friendsSaved.length && !data.posts.length && !data.myPost;

  return (
    <section aria-label="تنها نرو" className="mt-8 rounded-3xl border border-amber-200/70 dark:border-white/10 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-white/5 dark:to-transparent p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><HandHeart className="w-5 h-5 text-orange-500 dark:text-[#d9ff00]" /> تنها نرو</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.goingCount > 1 ? `${pNum(data.goingCount)} نفر میان` : data.goingCount === 1 ? 'یه نفر میاد' : 'هنوز کسی ثبت‌نام نکرده؛ اولی باش'}
            {data.companionCount > 0 && ` · ${data.companionCount > 1 ? `${pNum(data.companionCount)} نفر دنبال همراه‌ان` : 'یه نفر دنبال همراهه'}`}
          </p>
        </div>
        {data.canPlan && (
          <button onClick={() => (requireLogin() ? setInviting(true) : null)} className={quiet}><UserPlus className="w-4 h-4" /> دعوت دوستان</button>
        )}
      </div>

      {data.friendsGoing.length > 0 && (
        <div className="flex items-center gap-3"><Faces people={data.friendsGoing} /><p className="text-sm font-bold text-gray-800 dark:text-gray-200">{names(data.friendsGoing)} {data.friendsGoing.length > 1 ? 'میان' : 'میاد'}</p></div>
      )}
      {data.friendsSaved.length > 0 && (
        <div className="flex items-center gap-3"><Faces people={data.friendsSaved} /><p className="text-sm text-gray-700 dark:text-gray-300">{names(data.friendsSaved)} هم ذخیره‌ش {data.friendsSaved.length > 1 ? 'کردن' : 'کرده'}</p></div>
      )}

      {data.canPlan && profile && data.myPost && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-3 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm text-gray-800 dark:text-gray-200"><b>دنبال همراهی.</b> {data.myPost.note && <span className="text-gray-600 dark:text-gray-400">«{data.myPost.note}»</span>}</p>
            <button disabled={busy === 'close'} onClick={() => run('close', () => api(`/api/events/${eventId}/companions`, { method: 'DELETE' }))} className="text-xs text-gray-500 shrink-0">دیگه نمی‌گردم</button>
          </div>
          {data.myPost.requests.length === 0 ? <p className="text-xs text-gray-500">هنوز کسی درخواست نداده. هر کی پایه باشه خبرت می‌کنیم.</p> : (
            <ul className="space-y-2">
              {data.myPost.requests.map(r => (
                <li key={r.id} className="flex items-center gap-3 flex-wrap">
                  <GeneratedAvatar seed={r.user.id} className="w-9 h-9 rounded-full bg-gray-100" />
                  <span className="flex-1 min-w-0 text-sm">
                    <b className="text-gray-900 dark:text-gray-100">{r.user.name}</b> <span className="text-xs text-gray-500">{trust(r)}</span>
                    {r.message && <span className="block text-xs text-gray-600 dark:text-gray-400 truncate">«{r.message}»</span>}
                  </span>
                  {r.status === 'ACCEPTED' ? (
                    <button onClick={() => navigate(`/together/${r.id}`)} className={primary}><MessageCircle className="w-4 h-4" /> گفتگو</button>
                  ) : (
                    <span className="flex gap-2">
                      <button disabled={busy === `acc-${r.id}`} onClick={() => run(`acc-${r.id}`, () => api(`/api/companion-requests/${r.id}/accept`, { body: {} }))} className={primary}><Check className="w-4 h-4" /> پایه‌م</button>
                      <button disabled={busy === `dec-${r.id}`} onClick={() => run(`dec-${r.id}`, () => api(`/api/companion-requests/${r.id}/decline`, { body: {} }))} className={quiet} aria-label="نه، ممنون"><X className="w-4 h-4" /></button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data.canPlan && data.posts.length > 0 && (
        <ul className="space-y-2" aria-label="دنبال همراه">
          {data.posts.map(p => (
            <li key={p.id} className="rounded-2xl bg-white/80 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-3 flex items-center gap-3 flex-wrap">
              <GeneratedAvatar seed={p.user.id} className="w-10 h-10 rounded-full bg-gray-100" />
              <span className="flex-1 min-w-0 text-sm">
                <b className="text-gray-900 dark:text-gray-100">{p.user.name}</b> <span className="text-xs text-gray-500">{trust(p)}</span>
                <span className="block text-xs text-gray-600 dark:text-gray-400">{p.note ? `«${p.note}»` : 'دنبال همراهه'}</span>
              </span>
              {!p.myRequest || p.myRequest.status === 'CANCELLED' ? (
                <button disabled={busy === `ask-${p.id}`} onClick={() => ask(p)} className={primary}><Users className="w-4 h-4" /> بریم با هم</button>
              ) : p.myRequest.status === 'ACCEPTED' ? (
                <button onClick={() => navigate(`/together/${p.myRequest!.id}`)} className={primary}><MessageCircle className="w-4 h-4" /> گفتگو</button>
              ) : p.myRequest.status === 'PENDING' ? (
                <button disabled={busy === `cancel-${p.id}`} onClick={() => run(`cancel-${p.id}`, () => api(`/api/companion-requests/${p.myRequest!.id}`, { method: 'DELETE' }))} className={quiet}>منتظر جواب · لغو</button>
              ) : <span className="text-xs text-gray-500">این بار نشد</span>}
            </li>
          ))}
        </ul>
      )}

      {data.canPlan && !data.myPost && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-700 dark:text-gray-300">{nobody ? 'کسی رو نداری باهاش بری؟ اینجا همراه پیدا کن.' : 'همراه نداری؟'}</p>
          <button disabled={busy === 'post'} onClick={lookForCompany} className={primary}><HandHeart className="w-4 h-4" /> دنبال همراهم</button>
        </div>
      )}
      {data.canPlan && (data.posts.length > 0 || data.myPost) && (
        <p className="text-[11px] text-gray-500">برای امنیت: اولین بار توی خود رویداد یا یه جای شلوغ همدیگه رو ببینید، شماره‌ی شخصی رو زود نده و اگه کسی اذیتت کرد از داخل گفتگو گزارشش کن.</p>
      )}
      {inviting && <InviteFriends eventId={eventId} onClose={() => setInviting(false)} />}
    </section>
  );
}
