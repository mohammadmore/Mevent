import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, ArrowRight, Activity, Calendar, Check, Share2, Flag } from 'lucide-react';
import { getEventBackgroundIcon } from '../lib/icons';
import { useAuth } from '../lib/AuthContext';
import { useAppData } from '../lib/appData';
import { api, showToast } from '../lib/apiClient';
import { promptDialog } from '../lib/dialog';
import { absoluteUrl } from '../lib/router';
import { pNum } from '../lib/format';
import { REPORT_REASONS } from './EventDetail';

interface Hub { id: number; name: string; description?: string; type: string; imageUrl?: string; followersCount: number; isMember?: boolean; isOwner?: boolean }

interface Props {
  selectedHubId: number | null;
  onOpenHub: (id: number) => void;
  onBack: () => void;
}

export const HubsPanel = ({ selectedHubId, onOpenHub, onBack }: Props) => {
  const { dbUserId } = useAuth();
  const { requireLogin, openEvent } = useAppData();
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [hubEvents, setHubEvents] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('عمومی');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchHubs = () => api<{ data: Hub[] }>('/api/hubs', { silent: true }).then(d => setHubs(d.data)).catch(() => setHubs([]));
  useEffect(() => { fetchHubs(); }, [dbUserId]);

  const selectedHub = hubs?.find(h => h.id === selectedHubId) || null;

  useEffect(() => {
    if (!selectedHubId) return;
    setHubEvents(null);
    api<{ data: any[] }>(`/api/hubs/${selectedHubId}/events`, { silent: true }).then(d => setHubEvents(d.data)).catch(() => setHubEvents([]));
  }, [selectedHubId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    try {
      const data = await api<{ url: string }>('/api/upload', { body: formData });
      setImageUrl(data.url);
    } catch { /* toast shown */ } finally {
      setIsUploading(false);
    }
  };

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ data: Hub }>('/api/hubs', { body: { name, description, type, imageUrl } });
      showToast('جامعه ساخته شد.', 'success');
      setCreating(false);
      setName(''); setDescription(''); setImageUrl('');
      await fetchHubs();
      onOpenHub(res.data.id);
    } catch { /* toast shown */ } finally {
      setBusy(false);
    }
  };

  const toggleMembership = async (hub: Hub) => {
    if (!requireLogin()) return;
    setBusy(true);
    try {
      const res = await api<{ isMember: boolean; followersCount: number }>(`/api/hubs/${hub.id}/join`, { method: hub.isMember ? 'DELETE' : 'POST' });
      setHubs(prev => (prev || []).map(h => h.id === hub.id ? { ...h, isMember: res.isMember, followersCount: res.followersCount } : h));
      showToast(res.isMember ? `به جامعه «${hub.name}» پیوستید.` : `از جامعه «${hub.name}» خارج شدید.`, 'success');
    } catch { /* toast shown */ } finally {
      setBusy(false);
    }
  };

  const shareHub = (hub: Hub) => {
    const url = absoluteUrl(`/hubs/${hub.id}`);
    if (navigator.share) navigator.share({ title: hub.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => showToast('لینک جامعه کپی شد.', 'success'));
  };

  const reportHub = async (hub: Hub) => {
    if (!requireLogin()) return;
    const reason = await promptDialog({ title: 'گزارش تخلف جامعه', message: 'دلیل گزارش را انتخاب یا وارد کنید.', choices: REPORT_REASONS, confirmText: 'ارسال گزارش' });
    if (!reason) return;
    api<any>('/api/reports', { body: { targetType: 'HUB', targetId: hub.id, reason } }).then(r => showToast(r.message, 'success')).catch(() => {});
  };

  const input = 'w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-600 dark:focus:ring-[#d9ff00]/30';
  const panel = 'bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-5xl mx-auto w-full relative';

  if (creating) {
    return (
      <div className={`${panel} max-w-2xl`}>
        <button onClick={() => setCreating(false)} aria-label="بازگشت" className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
          <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-[#d9ff00]"><PlusCircle className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100">ایجاد جامعه جدید</h2>
            <p className="text-sm text-gray-500 mt-1">جامعه خود را بسازید و افراد هم‌فکر را دور هم جمع کنید.</p>
          </div>
        </div>
        <form onSubmit={handleCreateHub} className="space-y-6">
          <label className="block">
            <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">نام جامعه</span>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="مثلا: علاقه‌مندان به هوش مصنوعی" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">توضیحات</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${input} min-h-[120px]`} placeholder="درباره جامعه خود توضیح دهید..." />
          </label>
          <div>
            <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">تصویر جامعه (اختیاری)</span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-300 dark:border-white/20">
                {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <Users className="w-8 h-8 text-gray-500" />}
              </div>
              <div className="flex-1">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileUpload} disabled={isUploading} className="w-full text-sm text-gray-500" />
                {isUploading && <p className="text-xs text-teal-600 dark:text-[#d9ff00] mt-2 font-medium">در حال آپلود...</p>}
              </div>
            </div>
          </div>
          <div>
            <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">نوع جامعه</span>
            <div className="grid grid-cols-2 gap-4">
              {['عمومی', 'خصوصی'].map(t => (
                <button type="button" key={t} onClick={() => setType(t)} aria-pressed={type === t} className={`p-4 rounded-xl border text-sm font-medium ${type === t ? 'border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]' : 'border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300'}`}>{t}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy || isUploading} className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-3.5 rounded-xl disabled:opacity-50">
            {busy ? 'در حال ایجاد...' : 'ایجاد جامعه'}
          </button>
        </form>
      </div>
    );
  }

  if (selectedHubId) {
    if (hubs === null) return <div className={`${panel} h-60 animate-pulse`} />;
    if (!selectedHub) {
      return (
        <div className={`${panel} text-center py-16`}>
          <p className="font-bold text-gray-800 dark:text-gray-100 mb-3">این جامعه پیدا نشد.</p>
          <button onClick={onBack} className="text-sm font-bold text-teal-600 dark:text-[#d9ff00]">بازگشت به جوامع</button>
        </div>
      );
    }
    return (
      <div className={panel}>
        <button onClick={onBack} aria-label="بازگشت" className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 z-10">
          <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-10 border-b border-gray-200 dark:border-white/10">
          <div className="w-24 h-24 bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-2xl overflow-hidden flex items-center justify-center text-teal-600 dark:text-[#d9ff00] shrink-0">
            {selectedHub.imageUrl ? <img src={selectedHub.imageUrl} alt="" className="w-full h-full object-cover" /> : <Users className="w-12 h-12" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-3xl font-bold text-[#515739] dark:text-gray-100">{selectedHub.name}</h2>
              <span className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-2.5 py-1 rounded-full">{selectedHub.type}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{selectedHub.description || 'بدون توضیحات'}</p>
            <div className="flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {pNum(selectedHub.followersCount)} عضو</span>
              <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> {pNum(hubEvents?.length ?? 0)} رویداد پیش رو</span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {!selectedHub.isOwner && (
              <button
                onClick={() => toggleMembership(selectedHub)}
                disabled={busy}
                className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${selectedHub.isMember ? 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200' : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black'}`}
              >
                {selectedHub.isMember ? <><Check className="w-4 h-4" /> عضو هستید</> : 'پیوستن'}
              </button>
            )}
            <button onClick={() => shareHub(selectedHub)} aria-label="اشتراک‌گذاری" className="p-3 rounded-xl bg-gray-100 dark:bg-white/10"><Share2 className="w-5 h-5" /></button>
            <button onClick={() => reportHub(selectedHub)} aria-label="گزارش تخلف" className="p-3 rounded-xl bg-gray-100 dark:bg-white/10"><Flag className="w-5 h-5" /></button>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" /> رویدادهای جامعه</h3>
        {hubEvents === null ? (
          <div className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        ) : hubEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hubEvents.map((event: any) => (
              <button key={event.id} onClick={() => openEvent(event)} className="text-right bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl transition-all group relative">
                {getEventBackgroundIcon(event.bgIcon, event.tags || [], false)}
                {event.imageUrl ? (
                  <div className="w-full h-40 overflow-hidden"><img src={event.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                ) : (
                  <div className="w-full h-40 bg-teal-600/10 dark:bg-[#d9ff00]/10 flex items-center justify-center"><Calendar className="w-12 h-12 text-teal-600/60 dark:text-[#d9ff00]/60" /></div>
                )}
                <div className="p-4">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{event.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-[#1f1f23] rounded-2xl p-10 text-center border border-dashed border-gray-200 dark:border-white/10">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">رویداد پیش رویی در این جامعه ثبت نشده است.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={panel}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">جوامع و هاب‌ها</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">به جوامع مورد علاقه بپیوندید یا جامعه خودتان را بسازید.</p>
        </div>
        <button onClick={() => { if (requireLogin()) setCreating(true); }} className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> ایجاد جامعه
        </button>
      </div>

      {hubs === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{[0, 1, 2].map(i => <div key={i} className="h-56 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
      ) : hubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hubs.map(hub => (
            <div key={hub.id} className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center">
              <button onClick={() => onOpenHub(hub.id)} className="flex flex-col items-center w-full">
                <span className="w-20 h-20 bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-full overflow-hidden flex items-center justify-center text-teal-600 dark:text-[#d9ff00] mb-4">
                  {hub.imageUrl ? <img src={hub.imageUrl} alt="" className="w-full h-full object-cover" /> : <Users className="w-10 h-10" />}
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{hub.name}</span>
                <span className="text-sm text-gray-500 mb-4 line-clamp-2">{hub.description || 'بدون توضیحات'}</span>
              </button>
              <div className="flex items-center justify-center gap-3 w-full border-t border-gray-100 dark:border-white/5 pt-4 mt-auto">
                <span className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-2.5 py-1 rounded-full">{pNum(hub.followersCount)} عضو</span>
                {!hub.isOwner && (
                  <button onClick={() => toggleMembership(hub)} disabled={busy} className={`text-xs font-bold px-3 py-1 rounded-full ${hub.isMember ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300' : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black'}`}>
                    {hub.isMember ? 'عضو هستید' : 'پیوستن'}
                  </button>
                )}
                {hub.isOwner && <span className="text-xs text-gray-500">سازنده</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-100 dark:bg-[#1f1f23] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
          <Users className="w-12 h-12 text-gray-400 mb-6" />
          <p className="text-center text-gray-900 dark:text-gray-100 font-bold text-xl mb-3">هنوز جامعه‌ای وجود ندارد</p>
          <p className="text-center text-gray-500 mb-8 max-w-sm leading-relaxed">اولین نفری باشید که جامعه خود را می‌سازد.</p>
          <button onClick={() => { if (requireLogin()) setCreating(true); }} className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2"><PlusCircle className="w-5 h-5" /> ایجاد اولین جامعه</button>
        </div>
      )}
    </div>
  );
};
