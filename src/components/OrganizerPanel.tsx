import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { Calendar, Users, BarChart3, Edit, Copy, Trash2, Eye, Bookmark, CheckCircle, Ticket, Activity, QrCode, Power, X } from 'lucide-react';
import EventForm from './EventForm';
import PlaceForm from './PlaceForm';
import ChainForm from './ChainForm';
import { useToast } from './Toast';
import { CheckInModal } from './CheckInModal';
import { KycCard } from './KycCard';
import { CouponManager } from './CouponManager';
import { EventChangeActions } from './EventChangeActions';
import { useAppData } from '../lib/appData';
import { confirmDialog } from '../lib/dialog';
import { api } from '../lib/apiClient';

interface OrganizerPanelProps {
  userId: number;
}

export default function OrganizerPanel({ userId }: OrganizerPanelProps) {
  const { addToast } = useToast();
  const { profile } = useAppData();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [attendees, setAttendees] = useState<any[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [createMode, setCreateMode] = useState<'EVENT' | 'PLACE' | 'CHAIN' | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const toggleStatus = async (id: number, status: string) => {
    try {
      await api(`/api/events/${id}`, { method: 'PUT', body: { status } });
      fetchEvents();
      addToast(`وضعیت رویداد به ${status === 'PUBLISHED' ? 'منتشر شده' : 'پیش‌نویس'} تغییر یافت`, 'success');
    } catch { /* toast shown */ }
  };

  const deleteEvent = async (id: number) => {
    const ok = await confirmDialog({ title: 'حذف رویداد', message: 'این رویداد و همه ثبت‌نام‌های رایگان آن حذف می‌شود. رویدادهایی که بلیت فروخته‌اند را به‌جای حذف، پیش‌نویس کنید.', confirmText: 'حذف', danger: true });
    if (!ok) return;
    try {
      // The server refuses (with an explanation) when paid tickets exist.
      await api(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== id));
      if (selectedEventId === id) setSelectedEventId(null);
      addToast('رویداد با موفقیت حذف شد', 'info');
    } catch { /* toast shown */ }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizer/events?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAttendees(null);
    if (selectedEventId) {
      fetchStats(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchStats = async (id: number) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/organizer/events/${id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-teal-600 dark:border-[#d9ff00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showScanner && selectedEventId && (
        <CheckInModal
          eventId={selectedEventId}
          eventTitle={events.find(e => e.id === selectedEventId)?.title || ''}
          onClose={() => setShowScanner(false)}
          onCheckedIn={() => fetchStats(selectedEventId)}
        />
      )}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
        <div>
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-teal-700 dark:hover:bg-[#c6eb00]">
                ایجاد جدید +
              </button>
              {showCreateMenu && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#1f1f23] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden">
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5" onClick={() => { setCreateMode('PLACE'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">افزودن پاتوق</h4>
                    <p className="text-xs text-gray-500 mt-1">کسب‌وکار یا مکانی با ساعات کاری مشخص دارید؟ (مثل کافه، موزه)</p>
                  </div>
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5" onClick={() => { setCreateMode('EVENT'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">افزودن رویداد</h4>
                    <p className="text-xs text-gray-500 mt-1">برنامه خاصی با تاریخ و ساعت شروع و پایان دارید؟</p>
                  </div>
                  <div className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={() => { setCreateMode('CHAIN'); setShowCreateMenu(false); }}>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">ساخت زنجیره</h4>
                    <p className="text-xs text-gray-500 mt-1">چندین رویداد مرتبط دارید که می‌خواهید در یک قالب نمایش داده شوند؟</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
            داشبورد برگزارکننده
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">مدیریت رویدادها و مشاهده آمار</p>
        </div>
      </div>

      <KycCard />

      
      {createMode && (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 w-full relative">
          <button 
            onClick={() => setCreateMode(null)}
            className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">
            {createMode === 'PLACE' ? 'افزودن پاتوق جدید' : createMode === 'CHAIN' ? 'ساخت زنجیره جدید' : 'ایجاد رویداد جدید'}
          </h3>
          {createMode === 'EVENT' && <EventForm onSuccess={() => { setCreateMode(null); fetchEvents(); }} />}
          {createMode === 'PLACE' && <PlaceForm onSuccess={() => { setCreateMode(null); }} />}
          {createMode === 'CHAIN' && <ChainForm onSuccess={() => { setCreateMode(null); }} />}
        </div>
      )}

      {editingEvent ? (
        <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 w-full relative">
          <button 
            onClick={() => setEditingEvent(null)}
            className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg mb-4 text-[#515739] dark:text-gray-100">ویرایش رویداد: {editingEvent.title}</h3>
          <EventForm 
            initialData={editingEvent} 
            onSuccess={() => {
              setEditingEvent(null);
              fetchEvents();
            }} 
          />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-100 dark:bg-[#1f1f23] rounded-2xl border border-dashed border-gray-300 dark:border-white/20">
          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">شما هنوز رویدادی ایجاد نکرده‌اید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">رویدادهای من</h3>
            <div className="space-y-3">
              {(events || []).map((event) => (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`relative overflow-hidden p-4 rounded-xl border cursor-pointer transition-all ${selectedEventId === event.id ? 'border-teal-600 dark:border-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 shadow-sm' : 'border-gray-300 dark:border-white/20 bg-white/90 dark:bg-[#18181b] hover:border-teal-600/50 dark:hover:border-[#d9ff00]/50 hover:shadow-sm'}`}
                >
                  <div className="relative z-10">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{event.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    {new Date(event.startTime).toLocaleDateString('fa-IR')}
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-gray-200 dark:border-white/10/60 pt-3">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/> فروش</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }}
                        aria-label="ویرایش" className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10" title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'); }}
                        aria-label={event.status === 'PUBLISHED' ? 'منتشر شده؛ برای پیش‌نویس کردن بزنید' : 'پیش‌نویس؛ برای انتشار بزنید'} className={`p-2.5 rounded-lg ${event.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-600' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`} title="تغییر وضعیت (انتشار/پیش‌نویس)"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                        aria-label="حذف" className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100" title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="lg:col-span-2">
            {selectedEventId ? (
              <div className="bg-white/90 dark:bg-[#18181b] rounded-2xl border border-gray-300 dark:border-white/20 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                  آمار رویداد
                </h3>
                {events.find(e => e.id === selectedEventId) && (
                  <div className="mb-6">
                    <EventChangeActions event={events.find(e => e.id === selectedEventId)!} onChanged={() => { fetchEvents(); fetchStats(selectedEventId); }} />
                  </div>
                )}
                
                {statsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-teal-600 dark:border-[#d9ff00] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : stats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-xl p-4 flex flex-col items-center justify-center border border-teal-600/20 dark:border-[#d9ff00]/20">
                        <Ticket className="w-6 h-6 text-teal-600 dark:text-[#d9ff00] mb-2" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ticketsSold}</span>
                        <span className="text-xs text-teal-600 dark:text-[#d9ff00] mt-1">بلیت فروخته شده</span>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 flex flex-col items-center justify-center border border-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                        <span className="text-2xl font-bold text-green-900">{stats.rsvps}</span>
                        <span className="text-xs text-green-600 mt-1">ثبت‌نام (رایگان)</span>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center border border-blue-100">
                        <Bookmark className="w-6 h-6 text-blue-600 mb-2" />
                        <span className="text-2xl font-bold text-blue-900">{stats.saves}</span>
                        <span className="text-xs text-blue-600 mt-1">نشان شده</span>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 flex flex-col items-center justify-center border border-orange-100">
                        <Eye className="w-6 h-6 text-orange-600 mb-2" />
                        <span className="text-2xl font-bold text-orange-900">{stats.views}</span>
                        <span className="text-xs text-orange-600 mt-1">بازدیدها</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      ظرفیت: {stats.capacity?.toLocaleString('fa-IR')} • جای خالی: {stats.seatsLeft?.toLocaleString('fa-IR')} • ورود ثبت‌شده: {stats.checkedIn?.toLocaleString('fa-IR')} • لغو شده: {stats.cancelled?.toLocaleString('fa-IR')}
                    </p>
                    
                    <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-700 font-medium mb-1">مجموع درآمد</p>
                        <p className="text-3xl font-bold text-emerald-600">{(stats.revenue / 1000).toLocaleString()} <span className="text-lg">هزار تومان</span></p>
                      </div>
                      <div className="w-12 h-12 bg-white/90 dark:bg-[#18181b] rounded-full flex items-center justify-center shadow-sm text-emerald-600">
                        <Activity className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        مدیریت شرکت‌کنندگان
                      </h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            if (attendees) { setAttendees(null); return; }
                            api<{ data: any[] }>(`/api/organizer/events/${selectedEventId}/attendees`).then(d => setAttendees(d.data)).catch(() => {});
                          }}
                          className="flex-1 bg-white/90 dark:bg-[#18181b] border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100"
                        >
                          {attendees ? 'بستن لیست' : 'لیست ثبت‌نامی‌ها'}
                        </button>
                        <button onClick={() => setShowScanner(true)} className="flex-1 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 dark:hover:bg-[#c6eb00] shadow-md flex items-center justify-center gap-2">
                          <QrCode className="w-4 h-4" /> ثبت ورود (QR / کد)
                        </button>
                      </div>
                      {attendees && (
                        <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10 text-sm max-h-72 overflow-y-auto">
                          {attendees.length === 0 && <li className="py-3 text-gray-500">هنوز کسی ثبت‌نام نکرده است.</li>}
                          {attendees.map((a: any, i: number) => (
                            <li key={i} className="py-2 flex justify-between gap-2">
                              <span className="text-gray-800 dark:text-gray-200">{a.name}{a.label ? ` (${a.label})` : ''}</span>
                              <span className="text-xs text-gray-500">{a.status === 'USED' ? 'وارد شد' : a.status === 'ACTIVE' ? 'بلیت معتبر' : a.status === 'RSVP' ? 'ثبت‌نام رایگان' : a.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">خطا در دریافت آمار.</p>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-[#1f1f23] rounded-2xl border border-dashed border-gray-300 dark:border-white/20 py-20">
                <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">یک رویداد را برای مشاهده آمار انتخاب کنید.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!createMode && !editingEvent && <CouponManager events={events} isAdmin={profile?.role === 'ADMIN'} />}
    </div>
  );
}
