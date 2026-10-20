import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Main events map (Discover)
// Find the exact line:
content = content.replace(
  "className={`group break-inside-avoid rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${",
  "className={`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] ${"
);

// We should also replace the border colors inside the condition for main events
content = content.replace(
  "'border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b] hover:shadow-xl hover:-translate-y-1'",
  "'border-gray-900 dark:border-white bg-white dark:bg-[#18181b]'"
);

// RSVP events map
const rsvpTarget = 'className="break-inside-avoid bg-teal-600/5 dark:bg-[#d9ff00]/5 border-teal-600/30 dark:border-[#d9ff00]/30 hover:bg-teal-600/10 dark:bg-[#d9ff00]/10 hover:border-teal-600/50 dark:hover:border-[#d9ff00]/50 rounded-2xl border shadow-teal-600/10 dark:shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-teal-600/20 dark:hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] transition-all duration-300 cursor-pointer overflow-hidden relative"';
const rsvpReplacement = 'className="break-inside-avoid bg-white dark:bg-[#18181b] border-2 border-gray-900 dark:border-white shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative"';
content = content.replace(rsvpTarget, rsvpReplacement);

// Saved events map
const savedTarget = 'className="break-inside-avoid bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-2xl border shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 cursor-pointer overflow-hidden relative"';
const savedReplacement = 'className="break-inside-avoid bg-white dark:bg-[#18181b] border-2 border-gray-900 dark:border-white shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative"';
content = content.replace(savedTarget, savedReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log('Cards updated in App.tsx');
