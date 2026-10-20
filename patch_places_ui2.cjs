const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `{nearbyPlaces.length > 0 && (
          <div className="mt-8 mb-8 bg-orange-50 dark:bg-orange-500/5 p-6 rounded-3xl border border-orange-100 dark:border-orange-500/10">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              پاتوق‌های نزدیک (پیشنهادی)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyPlaces.map(place => (
                <div 
                  key={place.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group relative"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <span className={\`text-[10px] font-bold px-2 py-1 rounded-full text-white \${place.timingTag === 'بعدش بریم' ? 'bg-orange-500' : 'bg-teal-500'}\`}>
                      {place.timingTag}
                    </span>
                  </div>
                  <div className="h-32 relative">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{place.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{place.type} • {place.address}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{place.workingHours || 'ساعت کاری نامشخص'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-orange-500">
                        <span>{Math.round(place.distance * 10) / 10} کیلومتر</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}`;

const rep = `{nearbyPlaces.length > 0 && (
          <div className="mt-8 mb-8 bg-orange-50 dark:bg-white/5 p-6 rounded-3xl border border-orange-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500 dark:text-[#d9ff00]" />
              پاتوق‌های نزدیک (پیشنهادی)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyPlaces.map(place => (
                <div 
                  key={place.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group relative"
                >
                  <div className="absolute top-3 left-3 z-10">
                    <span className={\`text-xs font-bold px-2.5 py-1.5 rounded-full text-white shadow-lg backdrop-blur-sm border border-white/20 \${place.timingTag === 'بعدش بریم' ? 'bg-orange-500/90 dark:bg-[#d9ff00]/90 dark:text-[#18181b]' : 'bg-teal-500/90 dark:bg-teal-400/90 dark:text-[#18181b]'}\`}>
                      {place.timingTag}
                    </span>
                  </div>
                  <div className="h-32 relative">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover brightness-95" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{place.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{place.type} • {place.address}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{place.workingHours || 'ساعت کاری نامشخص'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-orange-500 dark:text-[#d9ff00]">
                        <span>{Math.round(place.distance * 10) / 10} کیلومتر</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}`;

code = code.replace(target, rep);
fs.writeFileSync('src/components/EventDetail.tsx', code);
