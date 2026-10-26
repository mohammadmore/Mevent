import React, { useState, useEffect } from 'react';
import { Trophy, Copy, Gift, Award, Share2, History } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { api, showToast } from '../lib/apiClient';
import { absoluteUrl } from '../lib/router';
import { pNum, timeAgo, formatToman } from '../lib/format';

const REASONS: Record<string, string> = {
  RSVP: 'ثبت‌نام در رویداد', RSVP_REMOVED: 'لغو ثبت‌نام', RSVP_CANCELLED: 'لغو بلیت',
  SAVE: 'نشان کردن رویداد', SAVE_REMOVED: 'حذف نشان', VIEW: 'مشاهده رویداد', SHARE: 'اشتراک‌گذاری رویداد',
  FRIEND_TICKET: 'خرید بلیت برای دوست', TICKET_DISCOUNT: 'تخفیف بلیت', POINTS_REFUND: 'بازگشت امتیاز',
  INVITE_ACCEPTED: 'عضویت دوست دعوت‌شده', INVITE_JOINED: 'هدیه عضویت با دعوت', ADMIN_ADJUSTMENT: 'تنظیم توسط مدیر',
};

interface PointsData {
  points: number;
  inviteCode: string | null;
  level: { name: string; progress: number; next: { name: string; pointsNeeded: number } | null };
  redeem: { pointValueToman: number; maxShare: number };
  history: { id: number; delta: number; reason: string; createdAt: string }[];
}

export default function GamificationPanel() {
  const { dbUserId } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null);
  const [data, setData] = useState<PointsData | null>(null);

  useEffect(() => {
    api<{ data: any[] }>('/api/users/leaderboard', { silent: true }).then(d => setLeaderboard(d.data)).catch(() => setLeaderboard([]));
    api<{ data: PointsData }>('/api/users/me/points', { silent: true }).then(d => setData(d.data)).catch(() => {});
  }, []);

  const inviteLink = data?.inviteCode ? absoluteUrl(`/invite/${data.inviteCode}`) : '';

  const shareInvite = async () => {
    if (!inviteLink) return;
    const text = 'با این لینک عضو میونت شو و ۵۰ امتیاز هدیه بگیر!';
    if (navigator.share) {
      navigator.share({ title: 'دعوت به میونت', text, url: inviteLink }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(inviteLink).catch(() => {});
      showToast('لینک دعوت کپی شد. با عضویت هر دوست ۱۰۰ امتیاز می‌گیرید.', 'success');
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="bg-gradient-to-br from-teal-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 w-full min-w-0 text-center md:text-right">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
              <Gift className="w-6 h-6 text-yellow-300" /> دعوت از دوستان، دریافت امتیاز!
            </h3>
            <p className="text-white/85 text-sm leading-relaxed mb-4">
              با عضویت هر دوست ۱۰۰ امتیاز می‌گیرید و دوستتان هم ۵۰ امتیاز هدیه می‌گیرد. هر امتیاز {pNum(data?.redeem.pointValueToman ?? 10)} تومان تخفیف در خرید بلیت است (تا {pNum(Math.round((data?.redeem.maxShare ?? 0.5) * 100))}٪ مبلغ).
            </p>
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10 w-full max-w-sm mx-auto md:mx-0 min-w-0">
              <span className="flex-1 min-w-0 text-left text-sm font-mono select-all overflow-hidden whitespace-nowrap text-ellipsis" dir="ltr">{inviteLink || '...'}</span>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink).then(() => showToast('لینک دعوت کپی شد.', 'success')).catch(() => {}); }} disabled={!inviteLink} aria-label="کپی لینک دعوت" className="bg-white text-teal-700 p-2.5 rounded-lg shrink-0"><Copy className="w-4 h-4" /></button>
              <button onClick={shareInvite} disabled={!inviteLink} aria-label="اشتراک‌گذاری لینک دعوت" className="bg-white text-teal-700 p-2.5 rounded-lg shrink-0"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="w-full md:w-56 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
            <span className="block text-white/80 text-xs mb-1">سطح فعلی شما</span>
            <div className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-white text-teal-700 mb-2">{data?.level.name || '...'}</div>
            <div className="text-3xl font-black">{pNum(data?.points ?? 0)} <span className="text-sm font-normal opacity-80">امتیاز</span></div>
            {data?.level.next && (
              <>
                <div className="h-2 bg-white/20 rounded-full mt-3 overflow-hidden"><div className="h-full bg-yellow-300" style={{ width: `${Math.round(data.level.progress * 100)}%` }} /></div>
                <p className="text-[11px] text-white/80 mt-1">{pNum(data.level.next.pointsNeeded)} امتیاز تا سطح {data.level.next.name}</p>
              </>
            )}
            {data && <p className="text-[11px] text-white/80 mt-2">ارزش تخفیف: {formatToman(data.points * data.redeem.pointValueToman)}</p>}
          </div>
        </div>
      </div>

      {data && data.history.length > 0 && (
        <details className="bg-white/90 dark:bg-[#18181b] rounded-3xl p-6 border border-gray-200 dark:border-white/10">
          <summary className="font-bold text-gray-800 dark:text-gray-100 cursor-pointer flex items-center gap-2"><History className="w-5 h-5" /> تاریخچه امتیازها</summary>
          <ul className="mt-4 space-y-2">
            {data.history.map(h => (
              <li key={h.id} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{REASONS[h.reason] || h.reason} <span className="text-xs text-gray-500">• {timeAgo(h.createdAt)}</span></span>
                <span className={`font-bold ${h.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`} dir="ltr">{h.delta > 0 ? '+' : ''}{pNum(h.delta)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="bg-white/90 dark:bg-[#18181b] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> برترین‌های میونت</h3>
        {leaderboard === null ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <ol className="space-y-3">
            {leaderboard.map((u, i) => {
              const me = u.id === dbUserId;
              return (
                <li key={u.id} className={`flex items-center justify-between p-3 rounded-2xl border ${me ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600/20' : 'bg-gray-100/50 dark:bg-[#1f1f23]/50 border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-500/20 text-yellow-600' : i === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-400'}`}>{pNum(i + 1)}</span>
                    <span className="w-10 h-10 rounded-full bg-teal-600/15 flex items-center justify-center text-teal-600 dark:text-[#d9ff00] font-bold">{u.name?.charAt(0) || 'U'}</span>
                    <span>
                      <span className="block font-bold text-sm text-gray-900 dark:text-gray-100">{u.name} {me && <span className="text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded mr-1">شما</span>}</span>
                      <span className="flex items-center gap-1 mt-0.5 text-xs text-gray-600 dark:text-gray-400"><Award className="w-3 h-3" /> {u.level?.name}</span>
                    </span>
                  </div>
                  <span className="font-bold text-teal-600 dark:text-[#d9ff00]">{pNum(u.points)} <span className="text-[10px] text-gray-400 font-normal">امتیاز</span></span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
