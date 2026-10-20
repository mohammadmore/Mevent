import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "bg-teal-50 dark:bg-[#d9ff00]/10 border-teal-600 dark:border-[#d9ff00]/50",
  "bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#515739] dark:border-[#d9ff00]/50"
);

content = content.replace(
  "bg-blue-50 dark:bg-blue-900/40 border-blue-500 dark:border-white/20",
  "bg-[#DCE4B8] dark:bg-blue-900/40 border-[#515739] dark:border-white/20"
);

content = content.replace(
  "'bg-white dark:bg-[#18181b] border-teal-600 dark:border-white/20'",
  "'bg-white dark:bg-[#18181b] border-[#515739] dark:border-white/20'"
);

// RSVP cards
const rsvpTarget = 'className="break-inside-avoid bg-white dark:bg-[#18181b] border-2 border-teal-600 dark:border-white/20 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative"';
const rsvpReplacement = 'className="break-inside-avoid bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#515739] dark:border-[#d9ff00]/50 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative"';
content = content.replace(rsvpTarget, rsvpReplacement);

// Saved cards (the first replacement was for RSVP, so the second one should be for Saved)
const savedReplacement = 'className="break-inside-avoid bg-[#DCE4B8] dark:bg-blue-900/40 border-2 border-[#515739] dark:border-white/20 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative"';
content = content.replace(rsvpTarget, savedReplacement); // This will replace the remaining one

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed colors');
