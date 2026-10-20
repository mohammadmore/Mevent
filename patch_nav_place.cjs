const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const targetPlaceDiv = `<div 
                  key={place.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group relative"
                >`;

const repPlaceDiv = `<div 
                  key={place.id}
                  className="bg-white dark:bg-[#1f1f23] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group relative cursor-pointer hover:border-teal-500/50 transition-colors"
                  onClick={() => {
                    const customEvent = new CustomEvent('navToPlace', { detail: place });
                    window.dispatchEvent(customEvent);
                  }}
                >`;

code = code.replace(targetPlaceDiv, repPlaceDiv);
fs.writeFileSync('src/components/EventDetail.tsx', code);
