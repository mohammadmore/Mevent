import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Ticket, Users, ShieldCheck, CalendarClock, Gift } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { useAppData } from '../lib/appData';
import { navigate } from '../lib/router';
import { timeAgo } from '../lib/format';
import { getPushState, enablePush, disablePush } from '../lib/pwa';

interface Notification { id: number; type: string; title: string; body?: string; url?: string; readAt?: string | null; createdAt: string }

const ICONS: Record<string, React.ReactNode> = {
  TICKET: <Ticket className="w-5 h-5" />,
  REMINDER: <CalendarClock className="w-5 h-5" />,
  ORGANIZER_REQUEST: <ShieldCheck className="w-5 h-5" />,
  MODERATION: <ShieldCheck className="w-5 h-5" />,
  INVITE: <Gift className="w-5 h-5" />,
};

export function NotificationsScreen() {
  const { refreshUnread, refreshProfile } = useAppData();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [push, setPush] = useState<Awaited<ReturnType<typeof getPushState>> | null>(null);

  useEffect(() => {
    api<{ data: Notification[] }>('/api/notifications')
      .then(d => {
        setItems(d.data);
        // Opening the list marks everything as read.
        if (d.data.some(n => !n.readAt)) {
          api('/api/notifications/read', { body: {}, silent: true }).then(refreshUnread).catch(() => {});
        }
        // Approvals/role changes arrive as notifications: make sure the profile reflects them.
        if (d.data.some(n => n.type === 'ORGANIZER_REQUEST' && !n.readAt)) refreshProfile();
      })
      .catch(() => setItems([]));
    getPushState().then(setPush).catch(() => setPush('unsupported'));
  }, []);

  const togglePush = async () => {
    if (push === 'enabled') {
      await disablePush();
      setPush('disabled');
      showToast('اعلان‌های گوشی غیرفعال شد.', 'info');
      return;
    }
    const ok = await enablePush().catch(() => false);
    setPush(await getPushState());
    showToast(ok ? 'اعلان‌ها فعال شد؛ یادآوری رویدادها روی گوشی شما می‌آید.' : 'اجازه نمایش اعلان داده نشد. از تنظیمات مرورگر آن را فعال کنید.', ok ? 'success' : 'warning');
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 flex items-center gap-2"><Bell className="w-6 h-6 text-teal-600 dark:text-[#d9ff00]" /> اعلانات شما</h2>
        {push && push !== 'unsupported' && push !== 'unavailable' && (
          <button onClick={togglePush} disabled={push === 'denied'} className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center gap-1.5 disabled:opacity-60">
            {push === 'enabled' ? <><BellOff className="w-4 h-4" /> غیرفعال‌سازی اعلان گوشی</> : push === 'denied' ? 'اعلان در مرورگر مسدود است' : <><BellRing className="w-4 h-4" /> فعال‌سازی اعلان گوشی</>}
          </button>
        )}
      </div>

      {items === null ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">اعلانی ندارید. یادآوری رویدادها، بلیت‌ها و نتیجه درخواست‌ها اینجا می‌آید.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(n => (
            <li key={n.id}>
              <button
                onClick={() => n.url && navigate(n.url)}
                className={`w-full text-right p-4 rounded-xl flex gap-4 border transition-colors ${!n.readAt ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600/20 dark:border-[#d9ff00]/20' : 'bg-gray-100 dark:bg-[#1f1f23] border-gray-200 dark:border-white/10'} ${n.url ? 'hover:border-teal-500/50' : 'cursor-default'}`}
              >
                <span className="w-10 h-10 bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] rounded-full flex items-center justify-center shrink-0">{ICONS[n.type] || <Users className="w-5 h-5" />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-gray-900 dark:text-white text-sm mb-1">{n.title}</span>
                  {n.body && <span className="block text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{n.body}</span>}
                  <span className="text-[10px] text-gray-500">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
