import React from 'react';
import { Calendar, MapPin, Bookmark, Heart, ExternalLink, CheckCircle, Users, Wallet, Sparkles, X } from 'lucide-react';
import { Event } from '../types';
import { getEventBackgroundIcon } from '../lib/icons';
import { VibeChips } from './VibeChips';
import { useAppData } from '../lib/appData';
import { eventTimeLabel, formatDistance, haversineKm, pNum, softPrice } from '../lib/format';
import { GeneratedAvatar } from './Avatar';

interface EventCardProps {
  event: Event;
  userLocation?: { lat: number; lng: number } | null;
  /** Shows a "not for me" button (the "for you" feed learns from it). */
  onDismiss?: (event: Event) => void;
}

export function EventCard({ event, userLocation, onDismiss }: EventCardProps) {
  const { isSaved, isGoing, toggleSave, attend, openEvent, recordView } = useAppData();
  const saved = isSaved(event.id);
  const going = isGoing(event.id);
  const lat = event.location?.lat ?? (event as any).lat;
  const lng = event.location?.lng ?? (event as any).lng;
  const distance = event.distance ?? (userLocation && lat != null && lng != null ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : null);
  const tags = Array.isArray(event.tags) ? event.tags : [];

  const open = () => { recordView(event); openEvent(event); };

  return (
    <article
      className={`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer mb-4 ${
        going
          ? 'bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#FD6F2F] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]'
          : saved
          ? 'bg-[#DCE4B8] dark:bg-blue-500/10 border-[#747E4D] dark:border-blue-500/50'
          : 'bg-white dark:bg-[#18181b] border-gray-300 dark:border-white/20'
      }`}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      tabIndex={0}
      aria-label={event.title}
    >
      {getEventBackgroundIcon(event.bgIcon, tags, going || saved)}
      {event.imageUrl && (
        <div className="w-full h-64 overflow-hidden relative z-0">
          <img loading="lazy" src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
        </div>
      )}
      <div className="p-4 relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 min-w-0">
            <GeneratedAvatar seed={event.organizerId || event.title} className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
            <div className="min-w-0">
              <h3 className="font-bold text-lg mb-1 transition-colors text-[#515739] dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00]">{event.title}</h3>
              {event.organizer?.name && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{event.organizer.name}</p>}
              {event.description && <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">{event.description}</p>}
            </div>
          </div>
          {onDismiss && (
            <button onClick={(e) => { e.stopPropagation(); onDismiss(event); }} aria-label="علاقه ندارم" title="علاقه ندارم"
              className="p-1.5 -mt-1 -ml-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-gray-200 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {event.reason && (
          <p className="text-xs font-medium text-teal-700 dark:text-[#d9ff00] mb-3 flex items-start gap-1.5"><Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {event.reason}</p>
        )}
        <VibeChips vibes={event.vibes} className="mb-3" />

        <div className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">{eventTimeLabel(event as any)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            <span dir="auto" className="truncate text-right">{event.location?.address || (event as any).address || event.city || 'مکان نامشخص'}</span>
            {formatDistance(distance) && <span className="font-bold text-teal-600 dark:text-[#d9ff00] shrink-0">• {formatDistance(distance)}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500 font-normal">
            <Wallet className="w-4 h-4 shrink-0" />
            <span>{softPrice(event.cost)}</span>
          </div>
          {typeof event.seatsLeft === 'number' && event.seatsLeft <= 10 && (
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
              <Users className="w-4 h-4" />
              {event.seatsLeft === 0 ? 'ظرفیت تکمیل' : `فقط ${pNum(event.seatsLeft)} جای خالی`}
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-200 dark:border-white/10">{tag}</span>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSave(event); }}
            aria-pressed={saved}
            className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
              saved
                ? 'bg-[#747E4D] dark:bg-[#18181b] text-white dark:text-gray-300 border-[#747E4D] dark:border-white/10'
                : 'bg-white dark:bg-[#18181b] text-[#747E4D] dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1f1f23]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-white dark:fill-blue-500 dark:text-blue-500' : ''}`} /> {saved ? 'ذخیره شده' : 'ذخیره'}
          </button>
          {event.cost > 0 || event.ticketUrl ? (
            <button
              onClick={(e) => { e.stopPropagation(); attend(event); }}
              className="flex items-center gap-2 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-sm"
            >
              {event.ticketUrl ? <ExternalLink className="w-4 h-4" /> : going ? <CheckCircle className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              {event.ticketUrl ? 'سایت رسمی' : going ? 'بلیت دارم' : 'می‌خوام برم'}
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); attend(event); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                going ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00]' : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black hover:bg-teal-700 dark:hover:bg-[#c6eb00]'
              }`}
            >
              <CheckCircle className="w-4 h-4" /> {going ? 'میام ✓' : 'منم میام'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
