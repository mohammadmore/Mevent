const fs = require('fs');

const file = 'src/components/PlaceDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `        {p.events && p.events.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای پیش رو در این مکان
            </h3>
            <div className="space-y-3">
              {p.events.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="p-4 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-teal-500 transition-colors">
                  <h4 className="font-bold text-gray-800 dark:text-gray-100">{ev.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
        )}`;

const replacement = `        {p.events && p.events.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای پیش رو در این مکان
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {p.events.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="min-w-[200px] sm:min-w-[240px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start cursor-pointer group hover:border-teal-500 transition-colors">
                  {ev.imageUrl ? (
                    <img loading="lazy" src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Calendar className="text-gray-300 w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{ev.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyEvents && nearbyEvents.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-[#d9ff00]" /> رویدادهای نزدیک
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {nearbyEvents.map((ev: Event) => (
                <div key={ev.id} onClick={() => onEventClick(ev)} className="min-w-[200px] sm:min-w-[240px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden snap-start cursor-pointer group hover:border-teal-500 transition-colors">
                  {ev.imageUrl ? (
                    <img loading="lazy" src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Calendar className="text-gray-300 w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">{ev.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Successfully patched events layout');
} else {
  console.log('Target block not found');
}
