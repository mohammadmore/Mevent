import React, { useState, lazy, Suspense } from 'react';
import { Event } from '../types';
import { useAuth } from '../lib/AuthContext';
import { ArrowRight, MapPin, Map, Calendar, Clock, DollarSign, Share2, Heart, Tag, Ticket, ExternalLink, CheckCircle, X, Info, Sparkles, Flag, Users } from 'lucide-react';
import { api, showToast } from '../lib/apiClient';
import { promptDialog } from '../lib/dialog';
import { absoluteUrl } from '../lib/router';
import { useAppData } from '../lib/appData';
import { formatDateParts, fuzzyTimeLabel, pNum } from '../lib/format';
import { tehranParts } from '../lib/time';

export const REPORT_REASONS = ['اطلاعات نادرست یا گمراه‌کننده', 'کلاهبرداری یا فروش بلیت جعلی', 'محتوای نامناسب یا توهین‌آمیز', 'رویداد لغو شده است', 'تکراری یا اسپم'];
import { getEventBackgroundIcon } from '../lib/icons';
import { PriceWidget } from './PriceWidget';
import { GeneratedAvatar } from './Avatar';
import { NavigationLinks } from './NavigationLinks';
const MiniMap = lazy(() => import('./MiniMap'));

interface EventDetailProps {
  isSaved: boolean;
  onToggleSave: () => void;
  event: Event;
  onBack: () => void;
  onBuyTicket: (e: React.MouseEvent, event: Event) => void;
  onRsvp: (e: React.MouseEvent, event: Event) => void;
  isRsvp?: boolean;
  onOrganizerClick?: (organizerId: number) => void;
}


// Dates are shown in Iran time for every visitor.
const formatDetailDate = (dateString: string | Date) => formatDateParts(dateString);
const advancedLabels: Record<string, string> = {

  director: 'کارگردان',
  producer: 'تهیه‌کننده',
  writer: 'نویسنده / فیلمنامه‌نویس',
  mainCast: 'بازیگران اصلی',
  supportingCast: 'بازیگران فرعی',
  cinematographer: 'مدیر فیلمبرداری',
  editor: 'تدوین‌گر',
  composer: 'آهنگساز',
  soundDesigner: 'طراح صدا / صداگذار',
  productionDesign: 'طراح صحنه و لباس',
  makeupArtist: 'طراح چهره‌پردازی',
  vfx: 'جلوه‌های ویژه (VFX)',
  genre: 'ژانر فیلم',
  ageRating: 'رده سنی',
  productionYear: 'سال ساخت',
  duration: 'مدت زمان فیلم',
  originalLanguage: 'زبان اصلی',
  subtitles: 'وضعیت زیرنویس/دوبله',
  nationalAwards: 'جوایز داخلی',
  internationalAwards: 'جوایز بین‌المللی',
  festivals: 'حضور در جشنواره‌ها',

  dressCode: 'کد پوشش (Dress Code)',
  parking: 'وضعیت پارکینگ',
  accessibility: 'امکانات برای توان‌یابان',
  ageRestriction: 'محدودیت سنی',
  foodAndDrink: 'پذیرایی و غذا',
  weatherPolicy: 'شرایط آب و هوایی',
  cancellationPolicy: 'قوانین لغو بلیت',
  itemsToBring: 'لوازم مورد نیاز',
  prohibitedItems: 'لوازم ممنوعه',
  scheduleDetails: 'جزئیات زمان‌بندی',
  speakersOrPerformers: 'سخنرانان / اجراکنندگان',
  networkingOpportunities: 'فرصت‌های شبکه‌سازی',
  photographyPolicy: 'قوانین عکاسی',
  merchandise: 'فروش محصولات/مرچندایز',
  wifiAvailability: 'وضعیت اینترنت (Wi-Fi)',
  restrooms: 'سرویس‌های بهداشتی',
  securityInfo: 'اطلاعات امنیتی',
  firstAid: 'کمک‌های اولیه',
  publicTransport: 'دسترسی با نقلیه عمومی',
  accommodationOptions: 'امکانات اقامتی',
};

export function EventDetail({ event, onBack, onBuyTicket, isSaved, onToggleSave, onRsvp, isRsvp, onOrganizerClick }: EventDetailProps) {

  const [advancedFieldsConfig, setAdvancedFieldsConfig] = React.useState<any[]>([]);
  const [basicFieldsConfig, setBasicFieldsConfig] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    api('/api/admin/settings', { silent: true })
      .then(data => {
        if (data.data?.event_basic_fields) {
          setBasicFieldsConfig(data.data.event_basic_fields);
        }
        if (data.data?.event_advanced_fields) {
          setAdvancedFieldsConfig(data.data.event_advanced_fields);
        }
      })
      .catch(console.error);
  }, []);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const coord = (v: unknown) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
  const mapLat = coord(event.location?.lat ?? (event as any).lat);
  const mapLng = coord(event.location?.lng ?? (event as any).lng);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);
  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [event.id]);

  React.useEffect(() => {
    api(`/api/events/${event.id}/similar`, { silent: true })
      .then(data => {
        if (data && data.data) {
          setSimilarEvents(data.data);
        }
      })
      .catch(console.error);

    api(`/api/events/${event.id}/nearby-places`, { silent: true })
      .then(data => {
        if (data && data.data) {
          // Filter by time and assign tags
          const getTimingTag = (place: any) => {
            if (!place.workingHours || !event.startTime) return null;
            
            const persianToEnglishDigits = (str: string) => {
              const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
              for (let i = 0; i < 10; i++) {
                str = str.replace(persianNumbers[i], i.toString());
              }
              return str;
            };
            
            const normalized = persianToEnglishDigits(place.workingHours);
            const nums = normalized.match(/\d+/g);
            if (!nums || nums.length < 2) return null;
            
            let start = parseInt(nums[0]);
            let end = parseInt(nums[nums.length - 1]);
            
            if (end >= 1 && end <= 11) end += 12;
            if (start >= 1 && start <= 5) start += 12;
            
            // Opening hours are local (Tehran) wall-clock times, so compare in Tehran time.
            const eventStart = new Date(event.startTime);
            const startParts = tehranParts(eventStart);
            const eventStartHour = startParts.hour + startParts.minute / 60;
            const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
            const endParts = tehranParts(eventEnd);
            const eventEndHour = endParts.hour + endParts.minute / 60;
            
            const isOpenAt = (hour: number) => {
               const h = (hour + 24) % 24;
               if (start <= end) {
                   return h >= start && h < end;
               } else {
                   return h >= start || h < end;
               }
            };
            
            let isOpenAfter = false;
            for (let i = 0.5; i <= 2; i += 0.5) {
                if (isOpenAt(eventEndHour + i)) {
                    isOpenAfter = true;
                    break;
                }
            }
            
            let isOpenBefore = false;
            for (let i = 0.5; i <= 2; i += 0.5) {
                if (isOpenAt(eventStartHour - i)) {
                    isOpenBefore = true;
                    break;
                }
            }
            
            if (isOpenAfter && isOpenBefore) return "بعدش بریم";
            if (isOpenAfter) return "بعدش بریم";
            if (isOpenBefore) return "قبلش بریم";
            return null;
          };

          const placesWithTags = data.data.map((p: any) => {
             return { ...p, timingTag: getTimingTag(p) };
          }).filter((p: any) => p.timingTag !== null);

          setNearbyPlaces(placesWithTags);
        }
      })
      .catch(console.error);
  }, [event.id]);
  const { dbUserId } = useAuth();
  const { requireLogin } = useAppData();
  
  const getFieldLabel = (name: string, defaultLabel: string) => {
    return basicFieldsConfig.find(f => f.name === name)?.label || defaultLabel;
  };
  
  const handleShare = async () => {
    if (dbUserId) {
      try {
        // Sharing is rewarded once per event; the server decides whether points are due.
        const data = await api<any>('/api/interactions', { body: { eventId: event.id, type: 'SHARE' }, silent: true });
        if (data?.pointsAwarded > 0) {
          showToast(`${pNum(data.pointsAwarded)} امتیاز بابت اشتراک‌گذاری رویداد دریافت کردید!`, 'success');
        }
      } catch (err) {}
    }

    // Always share the event's own address, not whatever page the user is on.
    const url = absoluteUrl(`/events/${event.id}`);
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('لینک رویداد کپی شد', 'success')).catch(() => {});
    }
  };

  const handleReport = async () => {
    if (!requireLogin()) return;
    const reason = await promptDialog({
      title: 'گزارش تخلف',
      message: 'چه مشکلی در این رویداد وجود دارد؟ گزارش شما توسط مدیران بررسی می‌شود.',
      choices: REPORT_REASONS,
      placeholder: 'یا دلیل را بنویسید...',
      confirmText: 'ارسال گزارش',
    });
    if (!reason) return;
    api<any>('/api/reports', { body: { targetType: 'EVENT', targetId: event.id, reason } })
      .then(res => showToast(res.message, 'success'))
      .catch(() => {});
  };

  const seatsLeft = typeof event.seatsLeft === 'number' ? event.seatsLeft : null;
  const soldOut = seatsLeft === 0 && !isRsvp;

  const isCinema = event.tags?.includes('سینما');

  return (
    <>
    <div ref={containerRef} className="fixed inset-0 bg-gradient-to-br from-teal-50/95 via-white to-cyan-50/95 dark:from-[#18181b] dark:via-[#18181b] dark:to-[#18181b] z-[100] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-full duration-300" dir="rtl">
      {/* Header Image & Actions */}
      {event.imageUrl ? (
        <div className="relative h-72 sm:h-96 bg-white dark:bg-[#18181b] flex-shrink-0 overflow-hidden">
          <img 
            onClick={() => { setActiveModalImage(event.imageUrl || null); setIsImageModalOpen(true); }}
            loading="lazy" 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover cursor-pointer" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0) 100%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0) 100%)' 
            }} 
          />
          
          {/* Top actions */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 via-black/20 to-transparent z-10">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReport}
                aria-label="گزارش تخلف"
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
              >
                <Flag className="w-5 h-5" />
              </button>
              <button 
                onClick={handleShare}
                aria-label="اشتراک‌گذاری"
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={onToggleSave}
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom fade out gradient */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#18181b] dark:via-[#18181b]/80 dark:to-transparent pointer-events-none z-10" />
        </div>
      ) : (
        <div className="flex justify-between items-center p-4 sticky top-0 z-50">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/90 dark:bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReport}
              aria-label="گزارش تخلف"
              className="w-10 h-10 bg-white/90 dark:bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <Flag className="w-5 h-5" />
            </button>
            <button 
              onClick={handleShare}
              aria-label="اشتراک‌گذاری"
              className="w-10 h-10 bg-white/90 dark:bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onToggleSave}
              className="w-10 h-10 bg-white/90 dark:bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 px-5 md:px-10 pb-10 relative z-20 max-w-5xl mx-auto w-full ${event.imageUrl ? '-mt-20 pt-2' : 'py-6 md:py-10'}`}>
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags && event.tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-2.5 py-1 rounded-full">
              <Tag className="w-3 h-3" />
              {tag.replace('#', '')}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors"
            onClick={() => onOrganizerClick && onOrganizerClick(event.organizerId)}
          >
            <GeneratedAvatar loading="lazy" seed={event.organizerId || event.title} alt="Organizer" className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-600 dark:text-gray-400">برگزارکننده اصلی</span>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{event.organizer?.name || 'مجری رویداد'}</span>
            </div>
          </div>
          
          {event.coOrganizerIds && event.coOrganizerIds.length > 0 && event.coOrganizerIds.map(coId => (
            <div 
              key={coId}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors"
              onClick={() => onOrganizerClick && onOrganizerClick(coId)}
            >
              <GeneratedAvatar loading="lazy" seed={coId} alt="Co-Organizer" className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-600 dark:text-gray-400">همکار</span>
              </div>
            </div>
          ))}
        </div>
                {event.city && (
          <div className="flex items-center gap-1 mb-2 text-teal-600 dark:text-[#d9ff00] font-bold text-sm bg-teal-50 dark:bg-[#d9ff00]/10 w-fit px-3 py-1 rounded-full border border-teal-200 dark:border-[#d9ff00]/20">
            <MapPin className="w-4 h-4" />
            {event.city}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#515739] dark:text-gray-100 mb-6 leading-tight">{event.title}</h1>

        <div className="space-y-5 mb-8">
          {!isCinema && <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10">
            <div className="w-12 h-12 bg-white dark:bg-[#18181b] rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-[#d9ff00]">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#515739] dark:text-gray-100 mb-1">تاریخ و زمان</h3>
              {event.startTime ? <><p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{formatDetailDate(event.startTime).datePart}</p><p className="text-xs text-gray-600 dark:text-gray-400 mt-1">ساعت {formatDetailDate(event.startTime).timePart}</p></> : <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{fuzzyTimeLabel(event.fuzzyTime) || 'زمان نامشخص'}</p>}
            </div>
          </div>}
          {!isCinema && <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10">
            <div className="w-12 h-12 bg-white dark:bg-[#18181b] rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-[#d9ff00]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#515739] dark:text-gray-100 mb-1">{getFieldLabel('address', 'مکان برگزاری')}</h3>
              <div className="flex items-start gap-2">
                <p dir="auto" className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed mt-0.5">{event.location?.address || (event as any).address || 'مکان نامشخص'}</p>
                {((event.location?.lat && event.location?.lng) || ((event as any).lat && (event as any).lng)) && (
                  <button 
                    onClick={() => setIsMapModalOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-[#d9ff00]/10 hover:bg-teal-100 dark:hover:bg-[#d9ff00]/20 text-teal-700 dark:text-[#d9ff00] px-2.5 py-1 rounded-lg transition-colors text-xs font-bold shrink-0 cursor-pointer"
                    title="مشاهده روی نقشه"
                  >
                    <Map className="w-3.5 h-3.5" />
                    روی نقشه
                  </button>
                )}
              </div>
            </div>
          </div>}
          {!isCinema && <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10">
            <div className="w-12 h-12 bg-white dark:bg-[#18181b] rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-[#d9ff00]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#515739] dark:text-gray-100 mb-1">{getFieldLabel('cost', 'هزینه شرکت')}</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium"><PriceWidget cost={event.cost} /></div>
            </div>
          </div>}
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-3">درباره رویداد</h2>
          <div className="prose prose-sm text-gray-700 dark:text-gray-300 leading-loose">
            
            <div className="flex gap-4 mt-6">
              {(event.website || event.instagram || event.telegram || event.twitter) && (
                <div className="flex flex-wrap gap-3 w-full bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                  {event.website && (
                    <a href={event.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-[#d9ff00] transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      وب‌سایت
                    </a>
                  )}
                  {event.instagram && (
                    <a href={`https://instagram.com/${event.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-pink-600 transition-colors">
                      <span className="font-sans">@</span>
                      اینستاگرام
                    </a>
                  )}
                  {event.telegram && (
                    <a href={`https://t.me/${event.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors">
                      <span className="font-sans">@</span>
                      تلگرام
                    </a>
                  )}
                  {event.twitter && (
                    <a href={`https://twitter.com/${event.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-400 transition-colors">
                      <span className="font-sans">@</span>
                      توییتر
                    </a>
                  )}
                </div>
              )}
            </div>

            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p className="italic text-gray-600 dark:text-gray-400">توضیحاتی برای این رویداد ثبت نشده است.</p>
            )}
          </div>
        </div>

        {similarEvents.length > 0 && (
          <div className="mt-8 mb-8 bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
              رویدادهای مشابه پیشنهادی
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similarEvents.map(simEvent => (
                <div 
                  key={simEvent.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden cursor-pointer hover:border-teal-500/50 transition-colors group flex"
                  onClick={(e) => {
                    // Quick hack to load the event using a custom event
                    // We don't have navigate here, but we can trigger a state change in App.tsx if we use a global event.
                    // Or we just dispatch a custom event that App.tsx can listen to.
                    const customEvent = new CustomEvent('navToEvent', { detail: simEvent });
                    window.dispatchEvent(customEvent);
                  }}
                >
                  <div className="w-1/3 min-h-[100px] relative">
                     {simEvent.imageUrl ? (
                        <img src={simEvent.imageUrl} alt={simEvent.title} className="w-full h-full object-cover" />
                     ) : (
                        getEventBackgroundIcon(simEvent.bgIcon, simEvent.tags || [], false)
                     )}
                  </div>
                  <div className="p-3 w-2/3 flex flex-col justify-center">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">{simEvent.title}</h4>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate">{fuzzyTimeLabel(simEvent.fuzzyTime) || (simEvent.startTime ? formatDetailDate(simEvent.startTime).datePart : "زمان نامشخص")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyPlaces.length > 0 && (
          <div className="mt-8 mb-8 bg-orange-50 dark:bg-white/5 p-6 rounded-3xl border border-orange-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500 dark:text-[#d9ff00]" />
              پاتوق‌های نزدیک (پیشنهادی)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyPlaces.map(place => (
                <div 
                  key={place.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group relative cursor-pointer hover:border-teal-500/50 transition-colors"
                  onClick={() => {
                    const customEvent = new CustomEvent('navToPlace', { detail: place });
                    window.dispatchEvent(customEvent);
                  }}
                >
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full text-white shadow-lg backdrop-blur-sm border border-white/20 ${place.timingTag === 'بعدش بریم' ? 'bg-orange-500/90 dark:bg-[#d9ff00]/90 dark:text-[#18181b]' : 'bg-teal-500/90 dark:bg-[#a855f7]/90 dark:text-white'}`}>
                      {place.timingTag}
                    </span>
                  </div>
                  <div className="h-32 relative">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover brightness-95" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{place.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{place.type} • {place.address}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{place.workingHours || 'ساعت کاری نامشخص'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-orange-500 dark:text-[#d9ff00]">
                        <span>{place.distance != null ? `${pNum(Math.round(place.distance * 10) / 10)} کیلومتر` : place.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {event.advancedDetails && (event.advancedDetails as any).cinemas && (event.advancedDetails as any).cinemas.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
              سینماها و سانس‌های اکران
            </h2>
            <div className="space-y-4">
              {(event.advancedDetails as any).cinemas.map((cinema: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                    <div className="bg-white dark:bg-black/20 p-2 rounded-xl shadow-sm">
                      <MapPin className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{cinema.name}</h3>
                      {cinema.address && <p className="text-xs text-gray-500 mt-1">{cinema.address}</p>}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {cinema.showtimes.map((st: any, sIdx: number) => (
                        <a 
                          key={sIdx}
                          href={st.ticketUrl || event.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:border-teal-300 dark:hover:border-teal-700 transition-all group"
                        >
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{st.date}</span>
                          <span className="text-lg font-bold text-teal-700 dark:text-[#d9ff00] mb-2">{st.time}</span>
                          <span className="text-xs font-bold bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-black px-3 py-1.5 rounded-lg w-full text-center flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            خرید بلیت
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {event.advancedDetails && Object.keys(event.advancedDetails).filter(k => {
          const v = (event.advancedDetails as any)[k];
          if (!v) return false;
          if (typeof v === 'string') return true;
          if (typeof v === 'object' && v.hasFeature !== undefined) return true;
          return false;
        }).length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-4">توضیحات تخصصی رویداد</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(event.advancedDetails).filter(([_, v]) => {
                if (!v) return false;
                if (typeof v === 'string') return true;
                if (typeof v === 'object' && (v as any).hasFeature !== undefined) return true;
                return false;
              }).map(([key, value]) => {
                let displayValue = '';
                if (typeof value === 'string') {
                  displayValue = value;
                } else {
                  const v = value as any;
                  if (v.hasFeature === false) {
                    displayValue = 'ندارد';
                  } else {
                    const parts = [];
                    if (v.option && v.option !== 'سایر') parts.push(v.option);
                    if (v.description) parts.push(v.description);
                    displayValue = parts.length > 0 ? parts.join(' - ') : 'دارد';
                  }
                }
                
                return (
                  <div key={key} className="bg-white dark:bg-[#1f1f23] border border-gray-100 dark:border-white/5 p-3 rounded-xl flex items-start gap-3">
                    <div className="mt-0.5 text-teal-600 dark:text-[#d9ff00] bg-teal-50 dark:bg-white/5 p-1.5 rounded-lg shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{advancedFieldsConfig.find(f => f.name === key)?.label || advancedLabels[key] || key}</h4>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{displayValue}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery Section */}
        {event.galleryUrls && event.galleryUrls.length > 0 && (
          <div className="mt-8 mb-4">
            <h2 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-4">گالری تصاویر رویداد</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {event.galleryUrls.map((url, i) => (
                <div key={i} onClick={() => { setActiveModalImage(url); setIsImageModalOpen(true); }} className="rounded-xl overflow-hidden aspect-[4/3] bg-teal-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 relative group cursor-pointer">
                  <img 
                    src={url} 
                    alt={`تصویر گالری ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar for Action */}
      <div className="sticky bottom-0 w-full p-4 bg-white dark:bg-[#18181b] border-t border-gray-200 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 mt-auto">
        <div className="max-w-md mx-auto w-full">
        {seatsLeft !== null && !event.ticketUrl && (
          <p className={`text-xs text-center mb-2 flex items-center justify-center gap-1 ${seatsLeft <= 10 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
            <Users className="w-3.5 h-3.5" /> {seatsLeft === 0 ? 'ظرفیت این رویداد تکمیل شده است' : `${pNum(seatsLeft)} جای خالی از ${pNum(event.capacity)}`}
          </p>
        )}
        <button 
          disabled={soldOut}
          onClick={(e) => event.cost > 0 || event.ticketUrl ? onBuyTicket(e, event) : onRsvp(e, event)}
          className={`w-full disabled:opacity-60 ${isRsvp ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] shadow-teal-600/5 dark:shadow-[#d9ff00]/5 hover:bg-teal-600/30 dark:bg-[#d9ff00]/30' : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black shadow-teal-600/20 dark:shadow-[#d9ff00]/20 hover:bg-teal-700 dark:hover:bg-[#c6eb00]'} font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}
        >
          {event.ticketUrl ? <ExternalLink className="w-5 h-5" /> : (isRsvp ? <CheckCircle className="w-5 h-5" /> : <Ticket className="w-5 h-5" />)}
          {event.ticketUrl ? 'تهیه بلیت از سایت رسمی' : soldOut ? 'ظرفیت تکمیل' : !dbUserId ? 'ورود و ثبت‌نام' : (event.cost > 0 ? (isRsvp ? 'خرید بلیت بیشتر' : 'خرید بلیت') : (isRsvp ? 'منم میرم (لغو)' : 'ثبت نام رایگان'))}
        </button>
        </div>
      </div>

      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsMapModalOpen(false)}>
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
              <h3 className="font-bold text-[#515739] dark:text-gray-100">مکان روی نقشه</h3>
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {mapLat != null && mapLng != null ? (
              <div className="flex-1 w-full bg-gray-100 dark:bg-[#1f1f23] min-h-[300px] relative z-0">
                <Suspense fallback={<div className="min-h-[300px]" />}>
                  <MiniMap lat={mapLat} lng={mapLng} fallback={<p className="p-6 text-sm text-gray-600 dark:text-gray-300">{event.location?.address || (event as any).address || 'نقشه در حال حاضر بارگذاری نمی‌شود.'}</p>} />
                </Suspense>
              </div>
            ) : (
              <p className="p-6 text-sm text-gray-600 dark:text-gray-300">{event.location?.address || (event as any).address}</p>
            )}

            <div className="p-4 bg-gray-50 dark:bg-[#1f1f23] border-t border-gray-100 dark:border-white/10">
              <NavigationLinks lat={mapLat} lng={mapLng} query={event.location?.address || (event as any).address} />
            </div>
          </div>
        </div>
      )}

      {isImageModalOpen && (activeModalImage || event.imageUrl) && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setIsImageModalOpen(false)}>
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center flex-1 justify-center max-h-[calc(100vh-120px)] w-full">
            <img 
              src={activeModalImage || event.imageUrl} 
              alt={event.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white mt-4 text-lg font-bold text-center shrink-0" onClick={(e) => e.stopPropagation()}>
              {event.title}
            </p>
          </div>

          {/* Thumbnails */}
          <div className="h-20 w-full mt-4 flex justify-center gap-2 overflow-x-auto shrink-0 pb-2" onClick={(e) => e.stopPropagation()}>
            {[event.imageUrl, ...(event.galleryUrls || [])].filter(Boolean).map((url, idx) => (
              <img 
                key={idx}
                src={url}
                alt={`thumbnail ${idx}`}
                onClick={() => setActiveModalImage(url)}
                className={`h-full w-auto aspect-square object-cover rounded-md cursor-pointer border-2 transition-all ${
                  (activeModalImage || event.imageUrl) === url ? 'border-teal-500 scale-105 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
