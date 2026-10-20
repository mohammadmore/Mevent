const fs = require('fs');

let code = fs.readFileSync('src/components/PlaceDetail.tsx', 'utf8');

const additionalState = `
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
`;

code = code.replace(/const p = \{/, additionalState + '\n  const p = {');

const additionalEffects = `
    fetch(\`/api/places/\${place.id}/nearby-places\`)
      .then(res => res.json())
      .then(data => setNearbyPlaces(data || []))
      .catch(console.error);
      
    fetch(\`/api/places/\${place.id}/nearby-events\`)
      .then(res => res.json())
      .then(data => setNearbyEvents(data || []))
      .catch(console.error);
`;

code = code.replace(/\.catch\(console\.error\);\n  \}, \[place\.id\]\);/g, '.catch(console.error);\n' + additionalEffects + '\n  }, [place.id]);');

const additionalUI = `
        {nearbyEvents && nearbyEvents.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای نزدیک
            </h3>
            <div className="space-y-3">
              {nearbyEvents.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="p-4 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-teal-500 transition-colors">
                  <h4 className="font-bold text-gray-800 dark:text-gray-100">{ev.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
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
                <div key={np.id} className="min-w-[200px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start">
                  {np.imageUrl ? (
                    <img loading="lazy" src={np.imageUrl} alt={np.name} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <span className="text-gray-400">بدون عکس</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{np.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{np.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

code = code.replace(/      <\/div>\n    <\/div>\n  \);\n\}/, additionalUI);

fs.writeFileSync('src/components/PlaceDetail.tsx', code);
