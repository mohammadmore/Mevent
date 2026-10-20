import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, Calendar, MapPin, Sparkles, X, Clock, Check, Share2, Bookmark, 
  Compass, Heart, Sun, Sunset, Moon, ArrowRight, Store, Ticket, ChevronLeft,
  Briefcase, Coffee, Music, Theater, Compass as CompassIcon, RefreshCw, Layers, Edit3, PlusCircle
, Trash2} from 'lucide-react';
import { Event, Place } from '../types';
import JalaliCalendarPicker from './JalaliCalendarPicker';
import { PriceWidget } from './PriceWidget';

interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  onSelectEvent?: (event: Event) => void;
  onSelectPlace?: (place: Place) => void;
  onSavePackage?: (pkg: any) => void;
}


const toPersianDigits = (num: number | string): string => {
  return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

const POPULAR_CITIES = [
  'تهران', 'شیراز', 'اصفهان', 'مشهد', 'تبریز', 'کیش', 'رشت', 'یزد', 'کاشان'
];

const INTEREST_TAGS = [
  { id: '#کافه', label: 'کافه‌گردی', icon: <Coffee className="w-4 h-4" /> },
  { id: '#تئاتر_و_نمایش', label: 'تئاتر و نمایش', icon: <Theater className="w-4 h-4" /> },
  { id: '#موسیقی_و_کنسرت', label: 'موسیقی و کنسرت', icon: <Music className="w-4 h-4" /> },
  { id: '#بازی_و_گیم', label: 'بازی و سرگرمی', icon: <Briefcase className="w-4 h-4" /> },
  { id: '#هنر_و_گالری', label: 'هنر و گالری', icon: <Layers className="w-4 h-4" /> },
  { id: '#طبیعت_و_گردش', label: 'طبیعت و پیاده‌روی', icon: <CompassIcon className="w-4 h-4" /> },
  { id: '#تاریخ_و_فرهنگ', label: 'تاریخ و فرهنگ', icon: <LandmarkIcon /> },
  { id: '#غذا_و_شکم‌گردی', label: 'غذا و رستوران', icon: <UtensilsIcon /> },
  { id: '#خرید_و_بازار', label: 'خرید و بازار', icon: <Store className="w-4 h-4" /> },
];

function LandmarkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
    </svg>
  );
}

function UtensilsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

const TRIP_STYLES = [
  'دوستانه / مجردی',
  'خانوادگی',
  'اقتصادی و کم‌هزینه',
  'لوکس و خاص',
  'آرامش‌بخش و فرهنگی'
];

export default function TripPlannerModal({
  isOpen,
  onClose,
  userProfile,
  onSelectEvent,
  onSelectPlace,
  onSavePackage
}: TripPlannerModalProps) {
  const [city, setCity] = useState('تهران');
  const [customCity, setCustomCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['#کافه', '#تئاتر_و_نمایش']);
  const [tripStyle, setTripStyle] = useState('دوستانه / مجردی');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [tripPackage, setTripPackage] = useState<any | null>(null);
  const [activeDayTab, setActiveDayTab] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [viewMode, setViewMode] = useState<'form' | 'result' | 'list'>('form');
  const [savedPackages, setSavedPackages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('saved_trip_packages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('saved_trip_packages', JSON.stringify(savedPackages));
  }, [savedPackages]);

  useEffect(() => {
    if (isOpen) {
      if (savedPackages.length > 0 && !tripPackage) {
        setViewMode('list');
      } else if (!tripPackage) {
        setViewMode('form');
      } else {
        setViewMode('result');
      }
    }
  }, [isOpen]);

  // Set default dates on load
  useEffect(() => {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(formatDate(today));
    setEndDate(formatDate(threeDaysLater));

    // Initialize interests from profile if available
    if (userProfile?.preferences) {
      try {
        const prefs = typeof userProfile.preferences === 'string' 
          ? JSON.parse(userProfile.preferences) 
          : userProfile.preferences;
        if (Array.isArray(prefs) && prefs.length > 0) {
          setSelectedInterests(prefs);
        }
      } catch (e) {
        // keep default
      }
    }
  }, [userProfile]);

  const handleQuickDate = (days: number) => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(future.toISOString().split('T')[0]);
  };

  const toggleInterest = (tagId: string) => {
    setSelectedInterests(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleGenerate = async () => {
    const targetCity = customCity.trim() || city;
    if (!targetCity) return;

    setIsLoading(true);
    setLoadingStep(1);

    // Simulate animated loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await fetch('/api/trip-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: targetCity,
          startDate,
          endDate,
          preferences: selectedInterests,
          tripStyle,
          userId: userProfile?.id
        })
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (res.ok && data?.data) {
        setTripPackage(data.data);
        setActiveDayTab(0);
        setIsSaved(false);
        setViewMode('result');
      } else {
        alert('خطا در دریافت برنامه سفر. لطفاً مجدداً تلاش کنید.');
      }
    } catch (err) {
      console.error(err);
      clearInterval(stepInterval);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    if (tripPackage && !tripPackage.id) {
      const newPkg = { ...tripPackage, id: Date.now().toString(), createdAt: new Date().toISOString() };
      setSavedPackages(prev => [...prev, newPkg]);
      setTripPackage(newPkg);
      if (onSavePackage) onSavePackage(newPkg);
    } else if (tripPackage && tripPackage.id) {
      // update existing
      setSavedPackages(prev => prev.map(p => p.id === tripPackage.id ? tripPackage : p));
      if (onSavePackage) onSavePackage(tripPackage);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const resetForm = () => {
    setTripPackage(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Top Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 dark:from-[#18181b] dark:via-[#222226] dark:to-[#18181b] border-b border-white/10 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-[#d9ff00]/20 flex items-center justify-center text-white dark:text-[#d9ff00] backdrop-blur-sm border border-white/20">
                <Plane className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  برنامه‌ریزی و پکیج سفر
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 dark:bg-[#d9ff00]/20 text-white dark:text-[#d9ff00] border border-white/20">
                    هوش مصنوعی
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-teal-100 dark:text-gray-400 mt-0.5">
                  پکیج پیشنهادی رویدادها و پاتوق‌های برتر بر اساس شهر، تاریخ و علایق شما
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedPackages.length > 0 && (
                <button
                  onClick={() => { setViewMode('list'); setTripPackage(null); }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 text-white text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  سفرهای من ({toPersianDigits(savedPackages.length)})
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Loading State */}
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-600/20 dark:border-[#d9ff00]/20 border-t-teal-600 dark:border-t-[#d9ff00] animate-spin"></div>
                  <Sparkles className="w-8 h-8 text-teal-600 dark:text-[#d9ff00] animate-pulse" />
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    در حال چیدن پکیج سفر در {customCity || city}...
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <p className={loadingStep >= 1 ? 'text-teal-600 dark:text-[#d9ff00] font-medium' : ''}>
                      ✓ بررسی رویدادها و همایش‌های فعال شهر
                    </p>
                    <p className={loadingStep >= 2 ? 'text-teal-600 dark:text-[#d9ff00] font-medium' : ''}>
                      ✓ یافتن بهترین پاتوق‌ها و کافه‌های متناسب با علایق
                    </p>
                    <p className={loadingStep >= 3 ? 'text-teal-600 dark:text-[#d9ff00] font-medium' : ''}>
                      ✓ تنظیم برنامه زمان‌بندی روزانه با هوش مصنوعی
                    </p>
                  </div>
                </div>
              </div>
            ) : viewMode === 'result' && tripPackage ? (
              /* Generated Package Result View */
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Edit / New Trip Action Banner */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-500/30 rounded-2xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      برنامه سفر آماده است. مایلید شهر، تاریخ یا علایق سفر را ویرایش کنید؟
                    </p>
                  </div>
                  <button
                    onClick={() => { setTripPackage(null); setViewMode('form'); }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    ویرایش پارامترها و سفر جدید
                  </button>
                </div>

                {/* Package Banner Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10 dark:from-[#d9ff00]/10 dark:via-teal-500/10 dark:to-indigo-500/10 border border-teal-500/20 dark:border-[#d9ff00]/20 p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {tripPackage.city}
                        </span>
                        <span className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                          {toPersianDigits(tripPackage.days?.length || 3)} روز سفر
                        </span>
                        <span className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                          سبک: {tripStyle}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                        {tripPackage.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        {tripPackage.summary}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={handleSave}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                          isSaved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black hover:opacity-90'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                        {isSaved ? 'پکیج ذخیره شد' : 'ذخیره پکیج'}
                      </button>

                      <button
                        onClick={handleShare}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#222226] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        {copiedLink ? 'کپی شد!' : 'اشتراک‌گذاری'}
                      </button>
                    </div>
                  </div>

                  {/* Travel Tips */}
                  {tripPackage.tips && tripPackage.tips.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/10 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-bold text-gray-800 dark:text-gray-200">نکات کلیدی سفر:</span>
                      {tripPackage.tips.map((tip: string, idx: number) => (
                        <span key={idx} className="bg-white/80 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-white/5">
                          💡 {tip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accordion Itinerary Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                      برنامه روزانه سفر
                    </h4>
                    <button
                      onClick={resetForm}
                      className="text-xs text-teal-600 dark:text-[#d9ff00] hover:underline flex items-center gap-1 font-medium whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> برنامه‌ریزی مجدد
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tripPackage.days?.map((day: any, idx: number) => {
                      const isActive = activeDayTab === idx;
                      
                      const getPersianOrdinal = (num: number) => {
                        const ordinals = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم'];
                        return ordinals[num - 1] || num.toString();
                      };

                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          <button
                            onClick={() => setActiveDayTab(isActive ? -1 : idx)}
                            className={`flex items-center justify-between w-full px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                              isActive
                                ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black shadow-md'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent dark:border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>روز {getPersianOrdinal(day.dayNumber || idx + 1)}</span>
                              <span className="text-xs opacity-80 font-normal">
                                ({day.dateLabel || `برنامه روز ${getPersianOrdinal(idx + 1)}`})
                              </span>
                            </div>
                            <ChevronLeft className={`w-5 h-5 transition-transform ${isActive ? '-rotate-90' : ''}`} />
                          </button>

                          <AnimatePresence initial={false}>
                            {isActive && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 pb-2">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Morning Block */}
                                    <ItineraryBlockCard
                                      timeTitle="صبح (۸:۰۰ تا ۱۲:۰۰)"
                                      timeIcon={<Sun className="w-5 h-5 text-amber-500" />}
                                      data={day.morning}
                                      allEvents={tripPackage.events}
                                      allPlaces={tripPackage.places}
                                      onSelectEvent={onSelectEvent}
                                      onSelectPlace={onSelectPlace}
                                    />
                                    {/* Afternoon Block */}
                                    <ItineraryBlockCard
                                      timeTitle="عصر (۱۲:۰۰ تا ۱۷:۰۰)"
                                      timeIcon={<Sunset className="w-5 h-5 text-orange-500" />}
                                      data={day.afternoon}
                                      allEvents={tripPackage.events}
                                      allPlaces={tripPackage.places}
                                      onSelectEvent={onSelectEvent}
                                      onSelectPlace={onSelectPlace}
                                    />
                                    {/* Evening Block */}
                                    <ItineraryBlockCard
                                      timeTitle="شب (۱۷:۰۰ تا ۲۳:۰۰)"
                                      timeIcon={<Moon className="w-5 h-5 text-indigo-500" />}
                                      data={day.evening}
                                      allEvents={tripPackage.events}
                                      allPlaces={tripPackage.places}
                                      onSelectEvent={onSelectEvent}
                                      onSelectPlace={onSelectPlace}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Included Events Section */}
                {tripPackage.events && tripPackage.events.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-base flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                      رویدادهای پیشنهادی در این پکیج ({toPersianDigits(tripPackage.events.length)})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tripPackage.events.map((evt: Event) => (
                        <div
                          key={evt.id}
                          onClick={() => onSelectEvent && onSelectEvent(evt)}
                          className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:border-teal-500 dark:hover:border-[#d9ff00] p-3.5 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group shadow-sm"
                        >
                          {evt.imageUrl ? (
                            <img src={evt.imageUrl} alt={evt.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-teal-50 dark:bg-white/5 flex items-center justify-center text-teal-600 dark:text-[#d9ff00] shrink-0">
                              <Ticket className="w-7 h-7" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">
                              {evt.title}
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {(evt as any).address || evt.location?.address || 'مکان نامشخص'}
                            </p>
                            <PriceWidget cost={evt.cost} className="mt-1 text-teal-600 dark:text-[#d9ff00] bg-teal-50 dark:bg-[#d9ff00]/10 px-2 py-1 rounded-md" />
                          </div>
                          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Included Places Section */}
                {tripPackage.places && tripPackage.places.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-base flex items-center gap-2">
                      <Store className="w-5 h-5 text-indigo-500" />
                      پاتوق‌ها و کافه‌های کلیدی این سفر ({toPersianDigits(tripPackage.places.length)})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tripPackage.places.map((plc: Place) => (
                        <div
                          key={plc.id}
                          onClick={() => onSelectPlace && onSelectPlace(plc)}
                          className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:border-indigo-500 p-3.5 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group shadow-sm"
                        >
                          {plc.imageUrl ? (
                            <img src={plc.imageUrl} alt={plc.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-white/5 flex items-center justify-center text-indigo-500 shrink-0">
                              <Store className="w-7 h-7" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-indigo-500 transition-colors">
                              {plc.name}
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {(plc as any).address || plc.location?.address || 'مکان مشخص نشده'}
                            </p>
                            <span className="inline-block mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                              ساعت کاری: {plc.workingHours || '۱۰:۰۰ تا ۲۳:۰۰'}
                            </span>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer for Result View */}
                <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => { setTripPackage(null); setViewMode('form'); }}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 dark:from-[#d9ff00] dark:via-lime-400 dark:to-[#d9ff00] text-white dark:text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5" />
                    ویرایش پارامترها و ایجاد سفر جدید
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-all cursor-pointer"
                  >
                    بستن پنجره
                  </button>
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">سفرهای ذخیره شده شما</h3>
                  <button
                    onClick={() => { setTripPackage(null); setViewMode('form'); }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    سفر جدید
                  </button>
                </div>
                {savedPackages.length === 0 ? (
                  <p className="text-sm text-gray-500">هیچ سفری ذخیره نشده است.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedPackages.map(pkg => (
                      <div key={pkg.id} className="border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col gap-3 bg-gray-50 dark:bg-white/5 cursor-pointer hover:border-teal-500 dark:hover:border-[#d9ff00] transition-colors" onClick={() => { setTripPackage(pkg); setViewMode('result'); setIsSaved(true); }}>
                        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
                          <MapPin className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" />
                          {pkg.city}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> {toPersianDigits(new Date(pkg.createdAt).toLocaleDateString('fa-IR'))}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {toPersianDigits(pkg.days?.length || 3)} روز
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedPackages(prev => prev.filter(p => p.id !== pkg.id));
                            if (tripPackage?.id === pkg.id) setTripPackage(null);
                          }}
                          className="mt-auto self-end text-red-500 text-xs p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Destination City Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" />
                    شهر مقصد سفر
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {POPULAR_CITIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCity(c); setCustomCity(''); }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          city === c && !customCity
                            ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold shadow-sm'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="یا نام شهر دیگری را وارد کنید..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#222226] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-teal-600 dark:focus:border-[#d9ff00]"
                  />
                </div>

                {/* Date Selection with Jalali Calendar Table */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-[#d9ff00]" />
                    تاریخ سفر (جدول تقویم شمسی)
                  </label>

                  <JalaliCalendarPicker
                    startDateIso={startDate}
                    endDateIso={endDate}
                    onChangeRange={(startIso, endIso) => {
                      setStartDate(startIso);
                      setEndDate(endIso);
                    }}
                  />
                </div>

                {/* Interests Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    علایق و فعالیت‌های موردعلاقه شما
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {INTEREST_TAGS.map(tag => {
                      const isSelected = selectedInterests.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleInterest(tag.id)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600 dark:border-[#d9ff00] text-teal-700 dark:text-[#d9ff00]'
                              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {tag.icon}
                          {tag.label}
                          {isSelected && <Check className="w-3.5 h-3.5 mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trip Vibe / Style */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    سبک و فضای سفر
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRIP_STYLES.map(style => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setTripStyle(style)}
                        className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                          tripStyle === style
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 dark:from-[#d9ff00] dark:via-lime-400 dark:to-[#d9ff00] text-white dark:text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-lg hover:opacity-95 transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    چیدن پکیج هوشمند سفر در {customCity || city}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ItineraryBlockCard({
  timeTitle,
  timeIcon,
  data,
  allEvents = [],
  allPlaces = [],
  onSelectEvent,
  onSelectPlace
}: {
  timeTitle: string;
  timeIcon: React.ReactNode;
  data: any;
  allEvents: Event[];
  allPlaces: Place[];
  onSelectEvent?: (event: Event) => void;
  onSelectPlace?: (place: Place) => void;
}) {
  if (!data) return null;

  const matchedEvent = data.relatedEventId
    ? allEvents.find(e => e.id === Number(data.relatedEventId))
    : null;

  const matchedPlace = data.relatedPlaceId
    ? allPlaces.find(p => p.id === Number(data.relatedPlaceId))
    : null;

  return (
    <div className="bg-gray-50 dark:bg-[#222226] border border-gray-200 dark:border-white/10 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-white/10">
          {timeIcon}
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{timeTitle}</span>
        </div>

        <h5 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">
          {data.title || 'برنامه این بخش'}
        </h5>

        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {data.description || 'توضیحات برنامه...'}
        </p>
      </div>

      {/* Interactive Badge / Button if connected to DB Place or Event */}
      {matchedEvent && (
        <button
          onClick={() => onSelectEvent && onSelectEvent(matchedEvent)}
          className="w-full mt-2 bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/30 dark:border-[#d9ff00]/30 hover:bg-teal-600/20 dark:hover:bg-[#d9ff00]/20 p-2 rounded-xl text-xs font-bold text-teal-700 dark:text-[#d9ff00] flex items-center justify-between transition-colors"
        >
          <span className="truncate flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            {matchedEvent.title}
          </span>
          <ChevronLeft className="w-4 h-4 shrink-0" />
        </button>
      )}

      {matchedPlace && (
        <button
          onClick={() => onSelectPlace && onSelectPlace(matchedPlace)}
          className="w-full mt-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 p-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between transition-colors"
        >
          <span className="truncate flex items-center gap-1">
            <Store className="w-3.5 h-3.5 shrink-0" />
            {matchedPlace.name}
          </span>
          <ChevronLeft className="w-4 h-4 shrink-0" />
        </button>
      )}
    </div>
  );
}
