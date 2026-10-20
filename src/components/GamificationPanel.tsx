import React, { useState, useEffect } from 'react';
import { Trophy, Share2, Copy, Gift, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const pNum = (n: any) => {
  if (n === null || n === undefined) return '';
  return n.toString().replace(/\d/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

export default function GamificationPanel({ userPoints, addToast }: { userPoints: number, addToast: (msg: string, type?: 'success'|'info'|'error') => void }) {
  const { dbUserId, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const inviteLink = `https://app.mevent.com/invite/${user?.uid?.substring(0,6) || '123'}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    addToast('لینک دعوت کپی شد! با ثبت‌نام دوستانتان ۵۰ امتیاز بگیرید.', 'success');
  };

  const getBadge = (points: number) => {
    if (points >= 1000) return { name: 'اسطوره رویدادها', color: 'text-amber-500 bg-amber-50 border-amber-200' };
    if (points >= 500) return { name: 'جستجوگر فعال', color: 'text-purple-600 bg-purple-50 border-purple-200' };
    if (points >= 100) return { name: 'عضو وفادار', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    return { name: 'تازه‌وارد', color: 'text-gray-300 bg-gray-100 dark:bg-[#1f1f23] border-gray-300 dark:border-white/20' };
  };

  const userBadge = getBadge(userPoints);

  return (
    <div className="space-y-6 mt-6">
      {/* Invite & Earn Card */}
      <div className="bg-gradient-to-br from-teal-600 dark:from-[#d9ff00] to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/90 dark:bg-[#18181b] opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-600/10 dark:bg-[#d9ff00]/10 opacity-20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 text-center md:text-right">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
              <Gift className="w-6 h-6 text-yellow-300" />
              دعوت از دوستان، دریافت اعتبار!
            </h3>
            <p className="text-gray-200 text-sm leading-relaxed mb-4">
              با دعوت هر یک از دوستانتان به میونت، ۵۰ امتیاز دریافت کنید. از امتیازات برای دریافت بلیت رایگان و تخفیف ویژه استفاده کنید.
            </p>
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-gray-200 dark:border-white/10 backdrop-blur-sm max-w-sm mx-auto md:mx-0">
              <span className="flex-1 text-left text-sm text-gray-200 font-mono select-all overflow-hidden whitespace-nowrap">{inviteLink}</span>
              <button 
                onClick={copyInviteLink}
                className="bg-white/90 dark:bg-[#18181b] text-teal-600 dark:text-[#d9ff00] p-2 rounded-lg hover:bg-teal-600/10 dark:bg-[#d9ff00]/10 transition-colors flex items-center justify-center"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-auto bg-white/10 dark:bg-[#18181b]/10 backdrop-blur-md rounded-2xl p-4 border border-gray-300 dark:border-white/20 text-center">
            <span className="block text-gray-200 text-xs mb-1">سطح فعلی شما</span>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border \${userBadge.color} mb-2 bg-white/90 dark:bg-[#18181b]/90`}>
              {userBadge.name}
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-white">{pNum(userPoints)} <span className="text-sm font-normal opacity-80">امتیاز</span></div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white/90 dark:bg-[#18181b] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
        <h3 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          برترین‌های میونت (لیدربرد)
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-teal-600 dark:border-[#d9ff00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {(leaderboard || []).map((u, i) => {
              const isCurrentUser = u.id === dbUserId;
              return (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-colors \${isCurrentUser ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600/20 dark:border-[#d9ff00]/20' : 'bg-gray-100/50 dark:bg-[#1f1f23]/50 border-transparent hover:bg-gray-100 dark:bg-[#1f1f23]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm \${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-white/10 text-gray-700' : i === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-gray-600 dark:text-gray-400'}`}>
                      {pNum(i + 1)}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600/20 dark:from-[#d9ff00]/20 to-teal-600/10 dark:to-[#d9ff00]/10 flex items-center justify-center text-teal-600 dark:text-[#d9ff00] font-bold border border-teal-600/30 dark:border-[#d9ff00]/30 shadow-sm">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm \${isCurrentUser ? 'text-gray-900 dark:text-white' : 'text-[#515739] dark:text-gray-100'}`}>
                        {u.name} {isCurrentUser && <span className="text-xs bg-teal-600/30 dark:bg-[#d9ff00]/30 text-white px-1.5 py-0.5 rounded ml-1">شما</span>}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Award className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{getBadge(u.points).name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-teal-600 dark:text-[#d9ff00] flex items-center gap-1">
                    {pNum(u.points)}
                    <span className="text-[10px] text-gray-400 font-normal">امتیاز</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
