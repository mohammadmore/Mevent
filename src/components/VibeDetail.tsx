import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { ArrowRight, Sparkles, Map } from 'lucide-react';

interface VibeDetailProps {
  vibe: any;
  onBack: () => void;
}

export function VibeDetail({ vibe, onBack }: VibeDetailProps) {
  const [vibeData, setVibeData] = useState<any>(null);
  
  useEffect(() => {
    api(`/api/vibes/${vibe.id}`, { silent: true })
      .then(data => setVibeData(data.data ? data.data : data))
      .catch(console.error);
  }, [vibe.id]);

  const v = {
    ...vibe,
    ...(vibeData || {})
  };
  v.imageUrl = vibeData?.imageUrl || vibe?.imageUrl || (vibeData?.imageUrls && vibeData.imageUrls[0]) || (vibe?.imageUrls && vibe.imageUrls[0]);
  v.imageUrls = vibeData?.imageUrls || vibe?.imageUrls || [];
  v.places = vibeData?.places || vibe?.places || [];

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18181b] z-[100] overflow-y-auto animate-in slide-in-from-bottom-full duration-300" dir="rtl">
      {v.imageUrl ? (
        <div className="relative h-64 sm:h-96 bg-teal-50 dark:bg-white/5 flex-shrink-0">
          <img loading="lazy" src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
            <h1 className="text-4xl font-bold text-white mb-2">{v.name}</h1>
          </div>
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} aria-label="بازگشت" className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex items-center gap-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-md">
          <button onClick={onBack} aria-label="بازگشت" className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{v.name}</span>
        </div>
      )}

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        <div>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{v.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {v.bestTime && (
            <div className="p-4 bg-gray-50 dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">بهترین زمان تجربه</p>
              <p className="font-bold text-gray-900 dark:text-gray-100">{v.bestTime}</p>
            </div>
          )}
          {v.areaName && (
            <div className="p-4 bg-gray-50 dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-2">
              <Map className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">محله / منطقه</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">{v.areaName}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Placeholder for map area polygon if we had one */}
      </div>
    </div>
  );
}
