import React, { useEffect, useState } from 'react';
import { ArrowRight, SearchX } from 'lucide-react';
import { api } from '../lib/apiClient';
import { useAppData } from '../lib/appData';
import { goBack, navigate } from '../lib/router';
import { EventDetail } from '../components/EventDetail';
import { PlaceDetail } from '../components/PlaceDetail';
import { VibeDetail } from '../components/VibeDetail';
import { ChainDetail } from '../components/ChainDetail';
import { FlowDetail } from '../components/FlowDetail';
import { OrganizerPublicProfile } from '../components/OrganizerPublicProfile';
import { Event } from '../types';

// Detail pages addressed by URL (/events/12, /places/3, ...). They render instantly from data the
// list already had, then load (or refresh) the item by id, so shared links and refreshes work.

// Objects handed over when navigating from a list, keyed by "kind:id".
const handoff = new Map<string, any>();
export function rememberEntity(kind: string, item: any) {
  if (item?.id != null) handoff.set(`${kind}:${item.id}`, item);
}

function useEntity<T>(kind: string, id: string, url: string, unwrap: (json: any) => T) {
  const [item, setItem] = useState<T | null>(() => handoff.get(`${kind}:${id}`) || null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    setItem(handoff.get(`${kind}:${id}`) || null);
    api<any>(url, { silent: true })
      .then(json => { if (!cancelled) setItem(unwrap(json)); })
      .catch(() => { if (!cancelled && !handoff.get(`${kind}:${id}`)) setMissing(true); });
    return () => { cancelled = true; };
  }, [kind, id, url]);
  return { item, missing };
}

function NotFound({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#18181b] flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
      <SearchX className="w-16 h-16 text-gray-300" />
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{text}</h2>
      <p className="text-sm text-gray-500">ممکن است حذف شده یا هنوز منتشر نشده باشد.</p>
      <button onClick={() => goBack('/')} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold text-sm flex items-center gap-2"><ArrowRight className="w-4 h-4" /> بازگشت</button>
    </div>
  );
}

function Loading() {
  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#18181b] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-[#d9ff00]" />
    </div>
  );
}

export function EventRoute({ id }: { id: string }) {
  const app = useAppData();
  const cached = app.getCachedEvent(Number(id));
  if (cached) handoff.set(`event:${id}`, cached);
  const { item: event, missing } = useEntity<Event>('event', id, `/api/events/${id}`, j => j.data);

  useEffect(() => {
    if (event) { app.cacheEvent(event); app.recordView(event); }
  }, [event?.id]);

  if (missing) return <NotFound text="رویداد پیدا نشد" />;
  if (!event) return <Loading />;
  return (
    <EventDetail
      event={event}
      onBack={() => goBack('/')}
      onBuyTicket={(e) => { e.stopPropagation(); app.attend(event); }}
      onRsvp={(e) => { e.stopPropagation(); app.attend(event); }}
      isSaved={app.isSaved(event.id)}
      isRsvp={app.isGoing(event.id)}
      onToggleSave={() => app.toggleSave(event)}
      onOrganizerClick={(organizerId) => navigate(`/organizers/${organizerId}`)}
    />
  );
}

export function PlaceRoute({ id }: { id: string }) {
  const { item, missing } = useEntity<any>('place', id, `/api/places/${id}`, j => j);
  const { openEvent } = useAppData();
  if (missing) return <NotFound text="پاتوق پیدا نشد" />;
  if (!item) return <Loading />;
  return <PlaceDetail place={item} onBack={() => goBack('/')} onEventClick={openEvent} onPlaceClick={(p) => { rememberEntity('place', p); navigate(`/places/${p.id}`); }} />;
}

export function VibeRoute({ id }: { id: string }) {
  const { item, missing } = useEntity<any>('vibe', id, `/api/vibes/${id}`, j => j);
  if (missing) return <NotFound text="حال و هوا پیدا نشد" />;
  if (!item) return <Loading />;
  return <VibeDetail vibe={item} onBack={() => goBack('/')} />;
}

export function ChainRoute({ id }: { id: string }) {
  const { item, missing } = useEntity<any>('chain', id, `/api/chains/${id}`, j => j);
  const { openEvent } = useAppData();
  if (missing) return <NotFound text="زنجیره پیدا نشد" />;
  if (!item) return <Loading />;
  return <ChainDetail chain={item} onBack={() => goBack('/')} onEventClick={openEvent} />;
}

export function FlowRoute({ id }: { id: string }) {
  const { item, missing } = useEntity<any>('flow', id, `/api/flows/${id}`, j => j);
  const { openEvent } = useAppData();
  if (missing) return <NotFound text="جریان پیدا نشد" />;
  if (!item) return <Loading />;
  return <FlowDetail flow={item} onBack={() => goBack('/')} onEventClick={openEvent} />;
}

export function OrganizerRoute({ id }: { id: string }) {
  const { openEvent } = useAppData();
  return <OrganizerPublicProfile organizerId={Number(id)} onBack={() => goBack('/')} onEventClick={openEvent} />;
}
