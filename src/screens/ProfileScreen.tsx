import React, { useState } from 'react';
import { Star, User, Heart, Activity, Shield, LogOut, Trash2, Settings, Clock, XCircle, Edit3, Smartphone, MonitorSmartphone, MessageSquare, LifeBuoy, Users } from 'lucide-react';
import GamificationPanel from '../components/GamificationPanel';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { useAppData } from '../lib/appData';
import { useAuth } from '../lib/AuthContext';
import { api, showToast } from '../lib/apiClient';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { navigate } from '../lib/router';
import { pNum } from '../lib/format';
import { normalizeIranMobile, maskMobile } from '../lib/phone';
import { SiteFooter } from '../components/SiteFooter';

export function ProfileScreen() {
  const { profile, setProfile, refreshProfile } = useAppData();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  if (!profile) return <div className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />;

  const requestOrganizer = async () => {
    const note = await promptDialog({
      title: 'درخواست حساب برگزارکننده',
      message: 'درباره خودتان، نوع رویدادهایی که برگزار می‌کنید و راه‌های ارتباطی (سایت/اینستاگرام) بنویسید. درخواست شما توسط مدیر بررسی می‌شود.',
      multiline: true,
      minLength: 10,
      confirmText: 'ارسال درخواست',
      defaultValue: profile.organizerRequestNote || '',
    });
    if (!note) return;
    try {
      const res = await api<any>('/api/users/me/organizer-request', { body: { note } });
      showToast(res.message, 'success');
      refreshProfile();
    } catch { /* toast shown */ }
  };

  const clearHistory = async () => {
    const ok = await confirmDialog({
      title: 'پاک‌سازی تاریخچه بازدیدها',
      message: 'تاریخچه رویدادهایی که دیده‌اید و برای پیشنهادها استفاده می‌شود پاک می‌شود. نشان‌شده‌ها، ثبت‌نام‌ها و بلیت‌ها باقی می‌مانند.',
      confirmText: 'پاک کن',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api<any>('/api/users/me/history', { method: 'DELETE' });
      showToast(res.message, 'success');
    } catch { /* toast shown */ }
  };

  // Attach a mobile number (Google accounts), so the user can sign in by SMS later.
  const linkPhone = async () => {
    const raw = await promptDialog({ title: 'اتصال شماره موبایل', message: 'با این شماره می‌توانید همیشه با پیامک وارد حسابتان شوید.', placeholder: '09123456789', confirmText: 'ارسال کد' });
    if (!raw) return;
    const phone = normalizeIranMobile(raw);
    if (!phone) { showToast('شماره موبایل معتبر نیست.', 'error'); return; }
    try {
      const sent = await api<any>('/api/auth/otp/request', { body: { phone, purpose: 'LINK' } });
      const code = await promptDialog({
        title: 'کد تأیید',
        message: `کد ارسال‌شده به ${sent.phone} را وارد کنید.${sent.devCode ? ` (محیط توسعه: ${sent.devCode})` : ''}`,
        placeholder: '••••••',
        confirmText: 'تأیید',
      });
      if (!code) return;
      const res = await api<any>('/api/auth/phone/link', { body: { phone, code } });
      setProfile(res.data);
      showToast(res.message, 'success');
    } catch { /* toast shown */ }
  };

  const setSmsReminders = async (on: boolean) => {
    setProfile(p => (p ? { ...p, smsReminders: on } as any : p));
    try {
      await api('/api/users/me/sms-preferences', { method: 'PUT', body: { reminders: on } });
    } catch {
      setProfile(p => (p ? { ...p, smsReminders: !on } as any : p));
    }
  };

  const signOutOthers = async () => {
    const ok = await confirmDialog({ title: 'خروج از دستگاه‌های دیگر', message: 'همه دستگاه‌هایی که با شماره شما وارد شده‌اند (به‌جز همین دستگاه) خارج می‌شوند.', confirmText: 'خروج از بقیه' });
    if (!ok) return;
    try {
      const res = await api<any>('/api/auth/logout-all', { body: {} });
      showToast(res.message, 'success');
    } catch { /* toast shown */ }
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isOrganizer = profile.role === 'ORGANIZER' || profile.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-6 border-b border-gray-200 dark:border-white/10">
        <div className="w-24 h-24 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-full flex items-center justify-center text-teal-600 dark:text-[#d9ff00] text-3xl font-bold">{profile.name?.charAt(0) || 'U'}</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100">{profile.name}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {[profile.phone ? maskMobile(profile.phone) : null, profile.email, profile.city].filter(Boolean).join(' • ')}
          </p>
          <button onClick={() => setEditing(true)} className="mt-2 text-sm text-teal-600 dark:text-[#d9ff00] hover:underline inline-flex items-center gap-1"><Edit3 className="w-4 h-4" /> ویرایش پروفایل</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-500/20">
          <Star className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-2xl font-bold text-orange-600">{pNum(profile.points)}</span>
          <span className="text-sm text-orange-700 dark:text-orange-300">امتیاز • {profile.level?.name}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl flex flex-col items-center justify-center border border-blue-100 dark:border-blue-500/20">
          <User className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{profile.role === 'ADMIN' ? 'مدیر سیستم' : profile.role === 'ORGANIZER' ? 'برگزارکننده' : 'کاربر عادی'}</span>
          <span className="text-sm text-blue-700 dark:text-blue-300">نوع حساب</span>
        </div>
      </div>

      {profile.role === 'USER' && (
        <div className="bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/20 dark:border-[#d9ff00]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#515739] dark:text-white mb-1 flex items-center gap-2"><Activity className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> حساب برگزارکننده</h3>
            {profile.organizerStatus === 'PENDING' ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"><Clock className="w-4 h-4" /> درخواست شما در حال بررسی است. نتیجه از طریق اعلان‌ها اطلاع داده می‌شود.</p>
            ) : profile.organizerStatus === 'REJECTED' ? (
              <p className="text-sm text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> درخواست قبلی تأیید نشد. می‌توانید با توضیحات کامل‌تر دوباره درخواست دهید.</p>
            ) : (
              <p className="text-sm text-teal-700 dark:text-[#d9ff00]">با حساب برگزارکننده می‌توانید رویداد ثبت کنید و بلیت بفروشید. درخواست‌ها توسط مدیر بررسی می‌شوند.</p>
            )}
          </div>
          {profile.organizerStatus !== 'PENDING' && (
            <button onClick={requestOrganizer} className="whitespace-nowrap px-6 py-2.5 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black rounded-xl font-bold w-full md:w-auto">
              {profile.organizerStatus === 'REJECTED' ? 'درخواست دوباره' : 'ثبت درخواست'}
            </button>
          )}
        </div>
      )}

      <GamificationPanel />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => navigate('/tickets')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5">
          <span className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><Heart className="w-6 h-6" /></span>
          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">بلیت‌ها و ذخیره‌ها</span>
        </button>
        <button onClick={() => navigate('/friends')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5">
          <span className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Users className="w-6 h-6" /></span>
          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">دوستان و همراه‌ها</span>
        </button>
        {isOrganizer && (
          <button onClick={() => navigate('/organizer')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5">
            <span className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Activity className="w-6 h-6" /></span>
            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">پنل برگزارکننده</span>
          </button>
        )}
        {profile.role === 'ADMIN' && (
          <button onClick={() => navigate('/admin')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5">
            <span className="w-12 h-12 rounded-full bg-teal-600/10 flex items-center justify-center text-teal-600 dark:text-[#d9ff00]"><Shield className="w-6 h-6" /></span>
            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">مدیریت سیستم</span>
          </button>
        )}
        <button onClick={signOut} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center gap-3 hover:bg-red-500/10 hover:border-red-500/30 group">
          <span className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-red-500"><LogOut className="w-6 h-6" /></span>
          <span className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-red-500 text-sm">خروج از حساب</span>
        </button>
      </div>

      <div className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> حریم خصوصی و داده‌های شما</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">برای پیشنهادهای بهتر از علایق و رویدادهایی که دیده‌اید استفاده می‌کنیم. هر زمان بخواهید می‌توانید آن‌ها را تغییر دهید یا پاک کنید.</p>
        <div className="space-y-3">
          {!profile.phone && (
            <button onClick={linkPhone} className="w-full flex items-center gap-3 p-4 rounded-xl border border-teal-600/30 bg-teal-600/5 hover:border-teal-600/60 text-right">
              <Smartphone className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
              <span><span className="block font-bold text-gray-900 dark:text-gray-100">اتصال شماره موبایل</span><span className="text-xs text-gray-500">ورود با پیامک، حتی وقتی ورود با گوگل در دسترس نباشد</span></span>
            </button>
          )}
          {profile.phone && (
            <label className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <span className="flex-1"><span className="block font-bold text-gray-900 dark:text-gray-100">پیامک یادآوری رویدادها</span><span className="text-xs text-gray-500">یک روز قبل از رویدادهایی که در آن ثبت‌نام کرده‌اید. پیامک بلیت همیشه ارسال می‌شود.</span></span>
              <input type="checkbox" className="w-5 h-5" checked={(profile as any).smsReminders !== false} onChange={(e) => setSmsReminders(e.target.checked)} aria-label="پیامک یادآوری رویدادها" />
            </label>
          )}
          {profile.phone && (
            <button onClick={signOutOthers} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-teal-600/50 text-right">
              <MonitorSmartphone className="w-5 h-5 text-gray-500" />
              <span><span className="block font-bold text-gray-900 dark:text-gray-100">خروج از دستگاه‌های دیگر</span><span className="text-xs text-gray-500">اگر روی دستگاه دیگری وارد شده‌اید و به آن دسترسی ندارید</span></span>
            </button>
          )}
          <button onClick={() => navigate('/support')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-teal-600/50 text-right">
            <LifeBuoy className="w-5 h-5 text-gray-500" />
            <span><span className="block font-bold text-gray-900 dark:text-gray-100">پشتیبانی</span><span className="text-xs text-gray-500">مشکل در خرید، بلیت یا حساب؟ درخواست ثبت کنید</span></span>
          </button>
          <button onClick={clearHistory} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 text-right">
            <Trash2 className="w-5 h-5 text-gray-500" />
            <span><span className="block font-bold text-gray-900 dark:text-gray-100">پاک‌سازی تاریخچه بازدیدها</span><span className="text-xs text-gray-500">رویدادهایی که مشاهده کرده‌اید</span></span>
          </button>
          <button onClick={() => navigate('/onboarding')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-teal-600/50 text-right">
            <Settings className="w-5 h-5 text-gray-500" />
            <span><span className="block font-bold text-gray-900 dark:text-gray-100">ویرایش علایق من</span><span className="text-xs text-gray-500">تغییر تگ‌های مورد علاقه</span></span>
          </button>
        </div>
      </div>

      <SiteFooter />

      {editing && (
        <ProfileEditModal
          profile={profile as any}
          onClose={() => setEditing(false)}
          onSave={async (updatedData) => {
            try {
              const data = await api<any>(`/api/users/${profile.id}/profile`, { method: 'PUT', body: updatedData });
              setProfile(data.data);
              showToast('پروفایل با موفقیت بروزرسانی شد', 'success');
            } catch { /* toast shown */ }
          }}
        />
      )}
    </div>
  );
}
