import React, { useState, useEffect } from 'react';
import { ArrowRight, Link as LinkIcon, Calendar } from 'lucide-react';
import { Event } from '../types';

interface ChainDetailProps {
  chain: any;
  onBack: () => void;
  onEventClick: (event: Event) => void;
}

export function ChainDetail({ chain, onBack, onEventClick }: ChainDetailProps) {
  const [chainData, setChainData] = useState<any>(null);
  
  useEffect(() => {
    fetch(`/api/chains/${chain.id}`)
      .then(res => res.json())
      .then(data => setChainData(data.data ? data.data : data))
      .catch(console.error);
  }, [chain.id]);

  const c = {
    ...chain,
    ...(chainData || {})
  };
  c.coverImage = chainData?.coverImage || chain?.coverImage;
  c.events = chainData?.events || chain?.events || [];

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[100] overflow-y-auto animate-in slide-in-from-bottom-full duration-300" dir="rtl">
      {c.imageUrl ? (
        <div className="relative h-48 sm:h-64 bg-teal-50 dark:bg-white/5 flex-shrink-0">
          <img loading="lazy" src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex items-center gap-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-md">
          <button onClick={onBack} className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{c.name}</span>
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        <div>
          <span className="inline-block bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-bold mb-4">
            زنجیره / فستیوال
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{c.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">{c.description}</p>
        </div>

        {c.events && c.events.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای این زنجیره
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.events.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="p-4 bg-gray-50 dark:bg-[#1f1f23] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-teal-200 dark:hover:border-white/10">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{ev.title}</h4>
                  <p className="text-sm text-gray-500">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
