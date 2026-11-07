import React, { useState } from 'react';
import { Choice, SlideGroup } from './Slide';
import ScrollRow from './ScrollRow';
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
      <SlideGroup><ScrollRow className="flex overflow-x-auto gap-2 pb-4 mb-4 hide-scrollbar flex-shrink-0">
        <Choice
          onClick={() => setActiveForm('event')}
          selected={activeForm === 'event'} pill="rounded-full bg-teal-600 dark:bg-[#7C3AED]" className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${activeForm === 'event' ? 'text-white' : 'glass-soft text-gray-600 dark:text-gray-300'}`}
        >
          <Calendar className="w-4 h-4" />
          رویداد
        </Choice>
        <Choice
          onClick={() => setActiveForm('place')}
          selected={activeForm === 'place'} pill="rounded-full bg-teal-600 dark:bg-[#7C3AED]" className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${activeForm === 'place' ? 'text-white' : 'glass-soft text-gray-600 dark:text-gray-300'}`}
        >
          <Store className="w-4 h-4" />
          پاتوق / مکان
        </Choice>
        <Choice
          onClick={() => setActiveForm('chain')}
          selected={activeForm === 'chain'} pill="rounded-full bg-teal-600 dark:bg-[#7C3AED]" className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${activeForm === 'chain' ? 'text-white' : 'glass-soft text-gray-600 dark:text-gray-300'}`}
        >
          <Network className="w-4 h-4" />
          فستیوال / زنجیره
        </Choice>
        <Choice
          onClick={() => setActiveForm('vibe')}
          selected={activeForm === 'vibe'} pill="rounded-full bg-teal-600 dark:bg-[#7C3AED]" className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${activeForm === 'vibe' ? 'text-white' : 'glass-soft text-gray-600 dark:text-gray-300'}`}
        >
          <Map className="w-4 h-4" />
          حال و هوا
        </Choice>
        <Choice
          onClick={() => setActiveForm('flow')}
          selected={activeForm === 'flow'} pill="rounded-full bg-teal-600 dark:bg-[#7C3AED]" className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${activeForm === 'flow' ? 'text-white' : 'glass-soft text-gray-600 dark:text-gray-300'}`}
        >
          <Sparkles className="w-4 h-4" />
          جریان
        </Choice>
      </ScrollRow></SlideGroup>

      <div key={activeForm} className="flex-1 overflow-y-auto pr-1 custom-scrollbar screen-fade">
        {activeForm === 'event' && <EventForm onSuccess={onSuccess} />}
        {activeForm === 'place' && <PlaceForm onSuccess={onSuccess} />}
        {activeForm === 'chain' && <ChainForm onSuccess={onSuccess} />}
        {activeForm === 'vibe' && <VibeForm onSuccess={onSuccess} />}
        {activeForm === 'flow' && <FlowForm onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
