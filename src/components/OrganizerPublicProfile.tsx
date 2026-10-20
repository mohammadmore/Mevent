import React, { useState, useEffect } from 'react';
import { Event, User } from '../types';
import { ArrowRight, MapPin, Calendar, Clock, DollarSign, Share2, Heart, ExternalLink, Activity, Users, Star } from 'lucide-react';
import { getEventBackgroundIcon } from '../lib/icons';

interface OrganizerPublicProfileProps {
  organizerId: number;
  onBack: () => void;
  onEventClick: (event: Event) => void;
}

export function OrganizerPublicProfile({ organizerId, onBack, onEventClick }: OrganizerPublicProfileProps) {
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'past'>('ongoing');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [profileRes, eventsRes] = await Promise.all([
          fetch(`/api/users/${organizerId}/profile`),
          fetch(`/api/organizer/events?userId=${organizerId}`)
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setOrganizer(profileData.data);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const allEvents = eventsData.data || [];
          setEvents(allEvents.filter((e: Event) => e.status === 'PUBLISHED'));
        }
      } catch (err) {
        console.error("Error fetching organizer details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [organizerId]);

  const ongoingEvents = events.filter(e => {
    if (!e.startTime) return true;
    return new Date(e.startTime) >= new Date();
  });

  const pastEvents = events.filter(e => {
    if (!e.startTime) return false;
    return new Date(e.startTime) < new Date();
  });

  const displayEvents = activeTab === 'ongoing' ? ongoingEvents : pastEvents;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[120] flex items-center justify-center animate-in fade-in">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 dark:border-[#d9ff00]"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[120] overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300" dir="rtl">
      {/* Header (App Bar) */}
      <div className="flex items-center gap-4 p-4 fixed top-0 w-full bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md z-50 border-b border-gray-100 dark:border-white/10">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-[#515739] dark:text-gray-100">پروفایل برگزارکننده</h1>
      </div>

      <div className="pt-16 pb-6 w-full">
        {/* Cover Image */}
        <div className="w-full h-48 md:h-64 bg-gray-200 dark:bg-[#1f1f23] relative">
          {organizer?.coverImage ? (
            <img 
              src={organizer.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 bg-gradient-to-r from-teal-500/20 to-teal-700/20">
              {/* Fallback cover pattern */}
            </div>
          )}
        </div>

        <div className="px-5 md:px-10 max-w-4xl mx-auto w-full -mt-12 relative z-10">
          {/* Organizer Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 text-center md:text-right">
            <img 
              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${organizerId}&backgroundColor=transparent`} 
              alt="Organizer Avatar" 
              className="w-24 h-24 rounded-full border-4 border-white dark:border-[#18181b] bg-gray-100 dark:bg-[#1f1f23] shadow-md"
            />
            <div className="flex-1 md:mt-14">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {organizer?.name || 'برگزارکننده میونت'}
                </h2>
                {organizer?.organizerType === 'CORPORATE' && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md">
                    موسسه حقوقی
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {organizer?.points || 0} امتیاز</span>
                <span className="flex items-center gap-1"><Activity className="w-4 h-4" /> {events.length} رویداد</span>
              </div>
              
              {organizer?.bio && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap max-w-2xl leading-relaxed">
                  {organizer.bio}
                </p>
              )}

              {organizer?.website && (
                <a href={organizer.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-teal-600 dark:text-[#d9ff00] hover:underline">
                  <ExternalLink className="w-4 h-4" /> وب‌سایت
                </a>
              )}
            </div>
          </div>

          {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 mb-6">
          <button 
            onClick={() => setActiveTab('ongoing')}
            className={`pb-3 text-sm font-bold relative transition-colors ${activeTab === 'ongoing' ? 'text-teal-600 dark:text-[#d9ff00]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            رویدادهای جاری ({ongoingEvents.length})
            {activeTab === 'ongoing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-[#d9ff00] rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`pb-3 text-sm font-bold relative transition-colors ${activeTab === 'past' ? 'text-teal-600 dark:text-[#d9ff00]' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            رویدادهای تمام‌شده ({pastEvents.length})
            {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-[#d9ff00] rounded-t-full"></div>}
          </button>
        </div>

        {/* Event List */}
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {displayEvents.length === 0 ? (
            <div className="col-span-full py-10 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">رویدادی یافت نشد.</p>
            </div>
          ) : (
            displayEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="group break-inside-avoid rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#1f1f23] hover:border-teal-600/50 dark:hover:border-[#d9ff00]/50 transition-all duration-300 cursor-pointer overflow-hidden relative"
              >
                {getEventBackgroundIcon(event.bgIcon, event.tags || [], false)}
                {event.imageUrl && (
                  <div className="w-full h-48 overflow-hidden relative z-0">
                    <img loading="lazy" src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                  </div>
                )}
                <div className="p-4 relative z-10">
                  <h3 className="font-bold text-lg mb-2 text-[#515739] dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">{event.title}</h3>
                  <div className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{(event.fuzzyTime?.startsWith('{') ? JSON.parse(event.fuzzyTime).label : event.fuzzyTime) || (event.startTime ? (() => {
                        const d = new Date(event.startTime);
                        const parts = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', calendar: 'persian' }).formatToParts(d);
                        const dict = Object.fromEntries(parts.map(p => [p.type, p.value]));
                        const timePart = new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short', calendar: 'persian' }).format(d);
                        return `${dict.weekday} ${dict.day} ${dict.month} ${dict.year} • ${timePart}`;
                      })() : "زمان نامشخص")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span dir="auto" className="truncate text-right">{event.location?.address || (event as any).address || "مکان نامشخص"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-gray-100 dark:bg-[#18181b] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
