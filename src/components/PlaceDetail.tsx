import React, { useState, useEffect } from 'react';
import { ArrowRight, MapPin, Map, Clock, Calendar, CheckCircle, X, Navigation, Compass, Camera } from 'lucide-react';
import { Event } from '../types';

interface PlaceDetailProps {
  place: any;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onPlaceClick?: (place: any) => void;
}

export function PlaceDetail({ place, onBack, onEventClick, onPlaceClick }: PlaceDetailProps) {
  const [placeData, setPlaceData] = useState<any>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);
  
  useEffect(() => {
    fetch(`/api/places/${place.id}`)
      .then(res => res.json())
      .then(data => setPlaceData(data.data ? data.data : data))
      .catch(console.error);

    fetch(`/api/places/${place.id}/nearby-places`)
      .then(res => res.json())
      .then(data => setNearbyPlaces(data || []))
      .catch(console.error);
      
    fetch(`/api/places/${place.id}/nearby-events`)
      .then(res => res.json())
      .then(data => setNearbyEvents(data || []))
      .catch(console.error);

  }, [place.id]);

  const p = {
    ...place,
    ...(placeData || {})
  };
  p.imageUrl = placeData?.imageUrl || place?.imageUrl;
  p.events = placeData?.events || place?.events || [];

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[100] overflow-y-auto animate-in slide-in-from-bottom-full duration-300" dir="rtl">
      {p.imageUrl ? (
        <div className="relative h-72 sm:h-96 flex-shrink-0 bg-white dark:bg-[#18181b] overflow-hidden">
          <img 
            onClick={() => { setActiveModalImage(p.imageUrl || null); setIsImageModalOpen(true); }}
            loading="lazy" 
            src={p.imageUrl} 
            alt={p.name} 
            className="w-full h-full object-cover cursor-pointer" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0) 100%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0) 100%)' 
            }} 
          />
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 via-black/20 to-transparent z-10">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          {/* Bottom fade gradient */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#18181b] dark:via-[#18181b]/80 dark:to-transparent pointer-events-none z-10" />
        </div>
      ) : (
        <div className="p-4 flex items-center gap-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-md">
          <button onClick={onBack} className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{p.name}</span>
        </div>
      )}

      <div className={`p-6 max-w-3xl mx-auto space-y-8 relative z-20 ${p.imageUrl ? '-mt-20 pt-2' : ''}`}>
        <div>
          <span className="inline-block bg-teal-100 text-teal-800 dark:bg-[#d9ff00]/20 dark:text-[#d9ff00] px-3 py-1 rounded-full text-xs font-bold mb-4">{p.type}</span>
                    {p.city && (
            <div className="flex items-center gap-1 mb-2 text-teal-600 dark:text-[#d9ff00] font-bold text-sm bg-teal-50 dark:bg-[#d9ff00]/10 w-fit px-3 py-1 rounded-full border border-teal-200 dark:border-[#d9ff00]/20">
              <MapPin className="w-4 h-4" />
              {p.city}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{p.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{p.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setIsMapModalOpen(true)}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/5 cursor-pointer hover:border-teal-500/50 dark:hover:border-[#d9ff00]/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <MapPin className="text-teal-600 dark:text-[#d9ff00] w-6 h-6 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs text-gray-500 mb-1">آدرس پاتوق</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{p.address || 'ثبت نشده'}</p>
              </div>
            </div>
            <button 
              type="button"
              className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-[#d9ff00]/10 text-teal-700 dark:text-[#d9ff00] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 hover:bg-teal-100 dark:hover:bg-[#d9ff00]/20 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              روی نقشه
            </button>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/5">
            <Clock className="text-teal-600 dark:text-[#d9ff00] w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">ساعات کاری</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{p.workingHours || 'ثبت نشده'}</p>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        {p.galleryUrls && p.galleryUrls.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="text-teal-600 dark:text-[#d9ff00]" /> گالری تصاویر
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {p.galleryUrls.map((url: string, i: number) => (
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

        {p.events && p.events.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای پیش رو در این مکان
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {p.events.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="min-w-[200px] sm:min-w-[240px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start cursor-pointer group hover:border-teal-500 transition-colors">
                  {ev.imageUrl ? (
                    <img loading="lazy" src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Calendar className="text-gray-300 w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{ev.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyEvents && nearbyEvents.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای نزدیک
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {nearbyEvents.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="min-w-[200px] sm:min-w-[240px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start cursor-pointer group hover:border-teal-500 transition-colors">
                  {ev.imageUrl ? (
                    <img loading="lazy" src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Calendar className="text-gray-300 w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{ev.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyPlaces && nearbyPlaces.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="text-teal-600 dark:text-[#d9ff00]" /> پاتوق‌های نزدیک
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {nearbyPlaces.map((np: any) => (
                <div 
                  key={np.id} 
                  onClick={() => onPlaceClick?.(np)}
                  className="min-w-[200px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start cursor-pointer group hover:border-teal-500 dark:hover:border-[#d9ff00] transition-colors"
                >
                  {np.imageUrl ? (
                    <img loading="lazy" src={np.imageUrl} alt={np.name} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <span className="text-gray-400 text-xs font-medium">بدون عکس</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate group-hover:text-teal-600 dark:group-hover:text-[#d9ff00] transition-colors">{np.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{np.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Modal for Place */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{p.name} - نقشه و مسیریابی</h3>
              </div>
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-gray-100 dark:bg-[#1f1f23] min-h-[320px] relative">
              {(p.lat && p.lng) ? (
                <iframe
                  title="place-map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, minHeight: '320px' }}
                  src={`https://maps.google.com/maps?q=${p.lat},${p.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                />
              ) : (
                <iframe
                  title="place-map-address"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, minHeight: '320px' }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(p.address || p.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                />
              )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-[#1f1f23] border-t border-gray-100 dark:border-white/10 space-y-2">
              <p className="text-xs text-gray-500 text-center mb-1">مسیریابی مستقیم در نقشه خوان‌ها:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a 
                  href={p.lat && p.lng ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address || p.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold py-2.5 rounded-xl text-xs text-center shadow hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Map className="w-4 h-4" />
                  گوگل مپ
                </a>
                <a 
                  href={p.lat && p.lng ? `https://neshan.org/maps/@${p.lat},${p.lng},16z` : `https://neshan.org/maps/search/${encodeURIComponent(p.address || p.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs text-center shadow hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-4 h-4" />
                  نشان
                </a>
                <a 
                  href={p.lat && p.lng ? `https://balad.ir/location?lat=${p.lat}&lng=${p.lng}` : `https://balad.ir/search?q=${encodeURIComponent(p.address || p.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs text-center shadow hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  بلد
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isImageModalOpen && (activeModalImage || p.imageUrl) && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setIsImageModalOpen(false)}>
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center flex-1 justify-center max-h-[calc(100vh-120px)] w-full">
            <img 
              src={activeModalImage || p.imageUrl} 
              alt={p.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white mt-4 text-lg font-bold text-center shrink-0" onClick={(e) => e.stopPropagation()}>
              {p.name}
            </p>
          </div>

          {/* Thumbnails */}
          <div className="h-20 w-full mt-4 flex justify-center gap-2 overflow-x-auto shrink-0 pb-2" onClick={(e) => e.stopPropagation()}>
            {[p.imageUrl, ...(p.galleryUrls || [])].filter(Boolean).map((url, idx) => (
              <img 
                key={idx}
                src={url}
                alt={`thumbnail ${idx}`}
                onClick={() => setActiveModalImage(url)}
                className={`h-full w-auto aspect-square object-cover rounded-md cursor-pointer border-2 transition-all ${
                  (activeModalImage || p.imageUrl) === url ? 'border-teal-500 scale-105 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


