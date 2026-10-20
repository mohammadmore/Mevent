import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(/bg-white\/90 dark:bg-\[\#18181b\]\/5/g, 'bg-black/5 dark:bg-[#18181b]/5');
content = content.replace(/bg-white\/90 dark:bg-\[\#18181b\]\/20/g, 'bg-black/20 dark:bg-[#18181b]/20');
content = content.replace(/bg-white\/90 dark:bg-\[\#18181b\]\/30/g, 'bg-black/30 dark:bg-[#18181b]/30');
content = content.replace(/text-white/g, 'text-gray-900 dark:text-white');

// For buttons with bg-[#d9ff00], we want the text to remain black or whatever it was
content = content.replace(/text-gray-900 dark:text-white font-bold py-4/g, 'text-black font-bold py-4');

// And in the top toast
content = content.replace(/text-gray-900 dark:text-white px-4 py-2/g, 'text-gray-900 dark:text-white px-4 py-2');

// We also need to fix `bg-white/90 dark:bg-[#18181b]`.
// Let's make it `bg-white dark:bg-[#18181b]`.
content = content.replace(/bg-white\/90 dark:bg-\[\#18181b\]/g, 'bg-white dark:bg-[#18181b]');

// Wait, the main wrapper for EventDetail:
// <div className="fixed inset-0 bg-white/90 dark:bg-[#18181b] ...
content = content.replace('bg-white dark:bg-[#18181b] z-[100]', 'bg-white dark:bg-[#18181b] z-[100]'); 
// Wait, I already replaced it. Let's just make it bg-gradient-to-br in light mode as well.
content = content.replace(
  'fixed inset-0 bg-white dark:bg-[#18181b]',
  'fixed inset-0 bg-gradient-to-br from-blue-50/95 via-white to-purple-50/95 dark:from-[#18181b] dark:via-[#18181b] dark:to-[#18181b]'
);

// We need to make sure the back button / share button on images are visible in light mode.
// They had `text-white`, which got replaced with `text-gray-900 dark:text-white`. That's good for light mode.

fs.writeFileSync('src/components/EventDetail.tsx', content);
