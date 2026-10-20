import React, { useState, useEffect } from 'react';
import { Sparkles, Map, Network, Film } from 'lucide-react';

export default function DiscoveryHeader({ city, onFlowSelect, onVibeSelect, onChainSelect }: { city?: string; onFlowSelect?: (v: any) => void; onVibeSelect?: (v: any) => void; onChainSelect?: (v: any) => void; }) {
  const [flows, setFlows] = useState<any[]>([]);
  const [vibes, setVibes] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);
  
  useEffect(() => {
    // Collections for the selected city only; a failure just hides this optional section.
    const qs = city ? `?city=${encodeURIComponent(city)}` : '';
    const get = (url: string) => fetch(url).then(r => (r.ok ? r.json() : [])).catch(() => []);
    Promise.all([get(`/api/flows${qs}`), get(`/api/vibes${qs}`), get(`/api/chains${qs}`)])
      .then(([flowsData, vibesData, chainsData]) => {
        setFlows(Array.isArray(flowsData) ? flowsData : []);
        setVibes(Array.isArray(vibesData) ? vibesData : []);
        setChains(Array.isArray(chainsData) ? chainsData : []);
      });
  }, [city]);
  
  if (!flows.length && !vibes.length && !chains.length) {
    return null; // Don't show if nothing to show
  }

  return (
    <div className="space-y-8 mb-8 overflow-hidden">
      {/* Flows Slider */}
      {flows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
            جریان‌های روز
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {flows.map(flow => (
              <div key={flow.id} className="min-w-[280px] h-40 rounded-2xl relative overflow-hidden snap-center cursor-pointer group" onClick={() => onFlowSelect && onFlowSelect(flow)}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                <img src={flow.coverImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000'} alt={flow.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-4 right-4 z-20">
                  <h3 className="text-white font-bold text-lg">{flow.title}</h3>
                  <p className="text-gray-300 text-sm mt-1">{flow.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vibes Slider */}
      {vibes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-500" />
            پیشنهادهای بی‌هزینه / حال و هوای شهر
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {vibes.map(vibe => (
              <div key={vibe.id} className="min-w-[220px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer hover:border-indigo-500 transition-colors" onClick={() => onVibeSelect && onVibeSelect(vibe)}>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{vibe.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{vibe.description}</p>
                <div className="mt-3 inline-block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-1 rounded-lg">
                  {vibe.areaName || 'محدوده مشخص نشده'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chains Slider */}
      {chains.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-orange-500" />
            فستیوال‌ها و دوره‌های در حال برگزاری
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {chains.map(chain => (
              <div key={chain.id} className="min-w-[250px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer flex items-center gap-4 hover:border-orange-500 transition-colors" onClick={() => onChainSelect && onChainSelect(chain)}>
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0">
                  <img src={chain.coverImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300'} alt={chain.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">{chain.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{chain.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
