import fs from 'fs';

const files = ['src/App.tsx', 'src/components/EventDetail.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Backgrounds
  content = content.replace(/bg-\[\#18181b\]/g, 'bg-white/90 dark:bg-[#18181b]');
  content = content.replace(/bg-\[\#1f1f23\]/g, 'bg-gray-100 dark:bg-[#1f1f23]');
  
  // Texts
  content = content.replace(/text-gray-100/g, 'text-gray-900 dark:text-gray-100');
  content = content.replace(/text-gray-200/g, 'text-gray-800 dark:text-gray-200');
  content = content.replace(/text-gray-300/g, 'text-gray-700 dark:text-gray-300');
  content = content.replace(/text-gray-400/g, 'text-gray-600 dark:text-gray-400');
  
  // White text (but carefully) - actually there are text-white instances.
  // Instead of simple global replace, we can just replace text-white with dark:text-white and something else...
  // Let's just leave text-white alone in buttons where there's a colorful bg. But for other places we might need it.
  
  // Borders
  content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
  content = content.replace(/border-white\/5/g, 'border-gray-100 dark:border-white/5');
  
  // White bg transparency
  content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
  content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
  
  fs.writeFileSync(file, content);
}
console.log('Done replacing theme colors');
