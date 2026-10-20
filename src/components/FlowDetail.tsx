import React, { useState, useEffect } from 'react';
import { ArrowRight, ListFilter, Play } from 'lucide-react';
import { Event } from '../types';

interface FlowDetailProps {
  flow: any;
  onBack: () => void;
  onEventClick: (event: Event) => void;
}

export function FlowDetail({ flow, onBack, onEventClick }: FlowDetailProps) {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    // Flow filters events by its tags. We simulate fetching events matching flow.tag.
    fetch(`/api/events/nearby?tag=${flow.tag}`)
      .then(res => res.json())
      .then(data => setEvents(data.data || []))
      .catch(console.error);
  }, [flow.tag]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[100] overflow-y-auto animate-in slide-in-from-bottom-full duration-300" dir="rtl">
      {flow.imageUrl ? (
        <div className="relative h-64 sm:h-80 bg-teal-50 dark:bg-white/5 flex-shrink-0">
          <img loading="lazy" src={flow.imageUrl} alt={flow.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
            <h1 className="text-4xl font-bold text-white mb-2">{flow.name}</h1>
            <p className="text-white/80">{flow.description}</p>
          </div>
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex flex-col justify-end h-40 bg-gradient-to-br from-teal-500 to-cyan-600 relative">
           <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <button onClick={onBack} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">{flow.name}</h1>
          <p className="text-white/80 text-sm">{flow.description}</p>
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <ListFilter className="text-teal-600 dark:text-[#d9ff00] w-5 h-5" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">پیشنهادات این جریان</h3>
        </div>
        
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((ev: Event) => (
              <div key={ev.id} onClick={() => onEventClick(ev)} className="flex gap-4 p-4 bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/5 cursor-pointer shadow-sm hover:shadow-md transition-all">
                {ev.imageUrl && (
                  <img loading="lazy" src={ev.imageUrl} alt={ev.title} className="w-24 h-24 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{ev.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ev.description}</p>
                  <p className="text-xs font-medium text-teal-600 dark:text-[#d9ff00] mt-2">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 dark:bg-white/5 rounded-2xl">
             <p className="text-gray-500 dark:text-gray-400">در حال حاضر پیشنهادی در این جریان نیست.</p>
          </div>
        )}
      </div>
    </div>
  );
}
