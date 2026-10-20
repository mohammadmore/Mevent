import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the grid container for all 4 instances
content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"/g, 'className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6"');
content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"/g, 'className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"');

// 1. main events map
content = content.replace(/className={\`group rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer \$\{/g, 'className={`group break-inside-avoid rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${');

// 2. RSVP events map
content = content.replace(/className="bg-teal-600\/5 dark:bg-\[#d9ff00\]\/5 border-teal-600\/30 dark:border-\[#d9ff00\]\/30/g, 'className="break-inside-avoid bg-teal-600/5 dark:bg-[#d9ff00]/5 border-teal-600/30 dark:border-[#d9ff00]/30');

// 3. Saved events map
content = content.replace(/className="bg-blue-500\/5 border-blue-500\/30 hover:bg-blue-500\/10 hover:border-blue-500\/50/g, 'className="break-inside-avoid bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50');

// 4. skeleton loader
content = content.replace(/className="rounded-2xl border border-gray-200 dark:border-white\/10 bg-white\/90 dark:bg-\[#18181b\] overflow-hidden animate-pulse"/g, 'className="break-inside-avoid rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b] overflow-hidden animate-pulse"');

// 5. myTickets - line 727
// wait, tickets are simpler, they don't have images and are all same height usually, but let's add break-inside-avoid to them too
content = content.replace(/className="bg-teal-600\/10 dark:bg-\[#d9ff00\]\/10 rounded-2xl border border-teal-600\/20 dark:border-\[#d9ff00\]\/20 p-4 shadow-sm flex items-start gap-4"/g, 'className="break-inside-avoid bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-2xl border border-teal-600/20 dark:border-[#d9ff00]/20 p-4 shadow-sm flex items-start gap-4"');

fs.writeFileSync('src/App.tsx', content);
console.log('Grid replaced');
