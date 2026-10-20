import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, ArrowRight, Activity, Calendar } from 'lucide-react';
import { getEventBackgroundIcon } from '../lib/icons';
import { EventDetail } from './EventDetail';

export const HubsPanel = ({ dbUserId, initialHubs, events, onNavigateToEvent }: any) => {
  const [hubs, setHubs] = useState<any[]>(initialHubs || []);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedHub, setSelectedHub] = useState<any>(null);
  
  // Create Hub state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('عمومی');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      const res = await fetch('/api/hubs');
      const data = await res.json();
      setHubs(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, type, imageUrl, ownerId: dbUserId })
      });
      if (res.ok) {
        await fetchHubs();
        setView('list');
        setName('');
        setDescription('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'create') {
    return (
      <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full overflow-y-auto pb-24 md:pb-6 relative animate-in fade-in slide-in-from-bottom-4">
        <button 
          onClick={() => setView('list')}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-[#d9ff00]">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100">ایجاد جامعه جدید</h2>
            <p className="text-sm text-gray-400 mt-1">جامعه خود را بسازید و افراد هم‌فکر را دور هم جمع کنید.</p>
          </div>
        </div>
        
        <form onSubmit={handleCreateHub} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-100 mb-2">نام جامعه</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 dark:border-[#d9ff00] focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00]/30 transition-all"
              placeholder="مثلا: علاقه‌مندان به هوش مصنوعی"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-100 mb-2">توضیحات</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-600 dark:border-[#d9ff00] focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00]/30 transition-all min-h-[120px]"
              placeholder="درباره جامعه خود توضیح دهید..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-100 mb-2">تصویر پروفایل جامعه (اختیاری)</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-300 dark:border-white/20">
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-600/10 dark:bg-[#d9ff00]/10 file:text-teal-600 dark:text-[#d9ff00] hover:file:bg-teal-600/20 dark:bg-[#d9ff00]/20 transition-colors"
                  disabled={isUploading}
                />
                {isUploading && <p className="text-xs text-teal-600 dark:text-[#d9ff00] mt-2 font-medium">در حال آپلود...</p>}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-100 mb-2">نوع جامعه</label>
            <div className="grid grid-cols-2 gap-4">
              {['عمومی', 'خصوصی'].map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${type === t ? 'border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]' : 'border-gray-300 dark:border-white/20 bg-white/90 dark:bg-[#18181b] text-gray-300 hover:bg-gray-100 dark:bg-[#1f1f23]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-3.5 rounded-xl hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-lg shadow-teal-600/20 dark:shadow-[#d9ff00]/20 disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ایجاد...' : 'ایجاد جامعه'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'detail' && selectedHub) {
    const hubEvents = (events || []).filter((e: any) => e.hubId === selectedHub.id);
    
    return (
      <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6 relative animate-in fade-in slide-in-from-bottom-4">
        <button 
          onClick={() => setView('list')}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/5 transition-colors z-10"
        >
          <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-10 border-b border-gray-200 dark:border-white/10">
          <div className="w-24 h-24 bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-2xl overflow-hidden flex items-center justify-center text-teal-600 dark:text-[#d9ff00] shrink-0 border border-teal-600/20 dark:border-[#d9ff00]/20 shadow-inner">
            {selectedHub.imageUrl ? (
               <img src={selectedHub.imageUrl} alt={selectedHub.name} className="w-full h-full object-cover" />
            ) : (
               <Users className="w-12 h-12" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-[#515739] dark:text-gray-100">{selectedHub.name}</h2>
              <span className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-2.5 py-1 rounded-full border border-teal-600/20 dark:border-[#d9ff00]/20">
                {selectedHub.type}
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-4">{selectedHub.description || 'بدون توضیحات'}</p>
            <div className="flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span>{selectedHub.followersCount} دنبال‌کننده</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span>{hubEvents.length} رویداد</span>
              </div>
            </div>
          </div>
          <button className="w-full md:w-auto bg-white/90 dark:bg-[#18181b] text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors shadow-lg">
            دنبال کردن
          </button>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
            رویدادهای جامعه
          </h3>
          {hubEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hubEvents.map((event: any) => (
                <div 
                  key={event.id} 
                  onClick={() => onNavigateToEvent(event)}
                  className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer relative"
                >
                  {getEventBackgroundIcon(event.bgIcon, event.tags || [], false)}
                  {event.imageUrl ? (
                    <div className="w-full h-40 bg-white/5 overflow-hidden relative z-0">
                      <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-teal-600/10 dark:bg-[#d9ff00]/10 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-teal-600/60 dark:text-[#d9ff00]/60" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-lg text-gray-100 mb-2 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">{event.title}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-[#1f1f23] rounded-2xl p-10 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10 border-dashed">
              <Calendar className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-400 font-medium">هیچ رویدادی در این جامعه ثبت نشده است.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-1">جوامع و هاب‌ها</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">جوامع مورد علاقه خود را پیدا کنید یا بسازید.</p>
        </div>
        <button 
          onClick={() => setView('create')} 
          className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 dark:hover:bg-[#c6eb00] shadow-md shadow-teal-600/20 dark:shadow-[#d9ff00]/20 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          ایجاد جامعه
        </button>
      </div>
      
      {hubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hubs.map(hub => (
            <div 
              key={hub.id} 
              onClick={() => { setSelectedHub(hub); setView('detail'); }}
              className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-teal-600/20 dark:border-[#d9ff00]/20 transition-all cursor-pointer flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-full overflow-hidden flex items-center justify-center text-teal-600 dark:text-[#d9ff00] mb-4 group-hover:scale-110 group-hover:border-4 group-hover:border-teal-600/20 dark:group-hover:border-[#d9ff00]/20 transition-all duration-300 shadow-inner">
                {hub.imageUrl ? (
                   <img src={hub.imageUrl} alt={hub.name} className="w-full h-full object-cover" />
                ) : (
                   <Users className="w-10 h-10" />
                )}
              </div>
              <h3 className="font-bold text-gray-100 text-lg mb-2">{hub.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{hub.description || 'بدون توضیحات'}</p>
              <div className="flex items-center justify-center gap-3 w-full border-t border-white/5 pt-4 mt-auto">
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-[#1f1f23] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10">
                  {hub.type}
                </span>
                <span className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-2.5 py-1 rounded-full border border-teal-600/20 dark:border-[#d9ff00]/20">
                  {hub.followersCount} دنبال‌کننده
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-100 dark:bg-[#1f1f23] rounded-2xl border border-gray-200 dark:border-white/10 border-dashed">
          <div className="w-24 h-24 bg-white/90 dark:bg-[#18181b] rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200 dark:border-white/10">
            <Users className="w-12 h-12 text-gray-700 dark:text-gray-300" />
          </div>
          <p className="text-center text-gray-100 font-bold text-xl mb-3">هنوز جامعه‌ای وجود ندارد</p>
          <p className="text-center text-gray-400 mb-8 max-w-sm leading-relaxed">اولین نفری باشید که جامعه خود را می‌سازد و افراد هم‌فکر را دور هم جمع می‌کند.</p>
          <button 
            onClick={() => setView('create')}
            className="bg-white/90 dark:bg-[#18181b] text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-100 dark:bg-[#1f1f23] shadow-lg transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            ایجاد اولین جامعه
          </button>
        </div>
      )}
    </div>
  );
};
