import React, { useState } from 'react';
import EventForm from './EventForm';
import PlaceForm from './PlaceForm';
import ChainForm from './ChainForm';
import VibeForm from './VibeForm';
import FlowForm from './FlowForm';
import { Calendar, Store, Network, Map, Sparkles } from 'lucide-react';

export default function CreatePanel({ onSuccess }: { onSuccess: () => void }) {
  const [activeForm, setActiveForm] = useState<'event' | 'place' | 'chain' | 'vibe' | 'flow'>('event');

  return (
    <div className="flex flex-col h-full overflow-hidden" dir="rtl">
      <div className="flex overflow-x-auto gap-2 pb-4 mb-4 hide-scrollbar flex-shrink-0">
        <button
          onClick={() => setActiveForm('event')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${activeForm === 'event' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
        >
          <Calendar className="w-4 h-4" />
          رویداد
        </button>
        <button
          onClick={() => setActiveForm('place')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${activeForm === 'place' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
        >
          <Store className="w-4 h-4" />
          پاتوق / مکان
        </button>
        <button
          onClick={() => setActiveForm('chain')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${activeForm === 'chain' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
        >
          <Network className="w-4 h-4" />
          فستیوال / زنجیره
        </button>
        <button
          onClick={() => setActiveForm('vibe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${activeForm === 'vibe' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
        >
          <Map className="w-4 h-4" />
          حال و هوا
        </button>
        <button
          onClick={() => setActiveForm('flow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${activeForm === 'flow' ? 'bg-teal-600 text-white dark:bg-[#d9ff00] dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
        >
          <Sparkles className="w-4 h-4" />
          جریان
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {activeForm === 'event' && <EventForm onSuccess={onSuccess} />}
        {activeForm === 'place' && <PlaceForm onSuccess={onSuccess} />}
        {activeForm === 'chain' && <ChainForm onSuccess={onSuccess} />}
        {activeForm === 'vibe' && <VibeForm onSuccess={onSuccess} />}
        {activeForm === 'flow' && <FlowForm onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
