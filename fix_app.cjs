const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `            {isSearching && (
              <div className="mt-4 relative animate-in fade-in slide-in-from-top-2">`,
  `            {isSearching && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <div className="relative">`
);

code = code.replace(
  `              </div>
                {searchQuery && (`,
  `              </div>
                {searchQuery && (`
);

// Wait, the previous block was:
//               </div>
//                 {searchQuery && (
//                   <div className="flex gap-2 mt-2"> ... </div>
//                 )}
//             )}

// Let's replace the whole block exactly:
code = code.replace(
  `                )}
              </div>
                {searchQuery && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSearchType('all')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>همه نتایج</button>
                    <button onClick={() => setSearchType('events')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'events' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>رویدادها</button>
                    <button onClick={() => setSearchType('places')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'places' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>پاتوق‌ها</button>
                  </div>
                )}
            )}`,
  `                )}
              </div>
                {searchQuery && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSearchType('all')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>همه نتایج</button>
                    <button onClick={() => setSearchType('events')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'events' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>رویدادها</button>
                    <button onClick={() => setSearchType('places')} className={\`px-3 py-1 rounded-full text-xs \${searchType === 'places' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}\`}>پاتوق‌ها</button>
                  </div>
                )}
              </div>
            )}`
);

fs.writeFileSync('src/App.tsx', code);
