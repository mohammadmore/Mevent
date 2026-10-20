import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// fix price filter
content = content.replace(
  `priceFilter === t ? 'bg-gray-100 dark:bg-[#1f1f23] text-white'`,
  `priceFilter === t ? 'bg-gray-800 dark:bg-[#1f1f23] text-white'`
);

// fix date filter
content = content.replace(
  `dateFilter === t ? 'bg-gray-100 dark:bg-[#1f1f23] text-white'`,
  `dateFilter === t ? 'bg-gray-800 dark:bg-[#1f1f23] text-white'`
);

// fix active category hover
content = content.replace(/group-hover:text-white/g, 'group-hover:text-gray-900 dark:group-hover:text-white');

// fix text-white in modal headers or specific spots
content = content.replace(/text-lg font-bold text-white mb-1/g, 'text-lg font-bold text-gray-900 dark:text-white mb-1');
content = content.replace(/text-white py-3 rounded-xl/g, 'text-gray-900 dark:text-white py-3 rounded-xl');
content = content.replace(/text-white text-sm mb-1/g, 'text-gray-900 dark:text-white text-sm mb-1');
content = content.replace(/font-bold text-white flex items-center/g, 'font-bold text-gray-900 dark:text-white flex items-center');

// For toast:
content = content.replace(`'bg-white/90 dark:bg-[#18181b] text-white'`, `'bg-white dark:bg-[#18181b] text-gray-900 dark:text-white'`);

fs.writeFileSync('src/App.tsx', content);
