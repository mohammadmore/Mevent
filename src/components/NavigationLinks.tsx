import React from 'react';
import { Navigation, Compass, Map } from 'lucide-react';

// "Get directions" in the map apps people use in Iran first (Neshan, Balad), Google Maps last.

export function NavigationLinks({ lat, lng, query }: { lat?: number | null; lng?: number | null; query?: string | null }) {
  const has = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
  const q = encodeURIComponent(query || '');
  if (!has && !q) return null;
  const links = [
    { label: 'نشان', icon: Navigation, cls: 'bg-emerald-600 text-white', href: has ? `https://neshan.org/maps/@${lat},${lng},16z` : `https://neshan.org/maps/search/${q}` },
    { label: 'بلد', icon: Compass, cls: 'bg-blue-600 text-white', href: has ? `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=16` : `https://balad.ir/search?query=${q}` },
    { label: 'گوگل‌مپ', icon: Map, cls: 'bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200', href: has ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${q}` },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 text-center">مسیریابی با:</p>
      <div className="grid grid-cols-3 gap-2">
        {links.map(({ label, icon: Icon, cls, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className={`${cls} font-bold py-2.5 rounded-xl text-xs text-center hover:opacity-90 flex items-center justify-center gap-1.5`}>
            <Icon className="w-4 h-4" /> {label}
          </a>
        ))}
      </div>
    </div>
  );
}
