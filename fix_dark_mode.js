import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldIcon = "const colorClass = isColored ? 'text-white dark:text-white opacity-100' : 'text-[#FD6F2F] opacity-30 dark:text-gray-200 dark:opacity-20';";
const newIcon = "const colorClass = isColored ? 'text-white opacity-100 dark:text-gray-200 dark:opacity-20' : 'text-[#FD6F2F] opacity-30 dark:text-gray-200 dark:opacity-20';";
content = content.replace(oldIcon, newIcon);

const oldPrice = "bg-white text-[#FD6F2F] dark:bg-white dark:text-[#FD6F2F]";
const newPrice = "bg-white text-[#FD6F2F] dark:bg-[#d9ff00]/10 dark:text-[#d9ff00]";
content = content.replace(oldPrice, newPrice);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed dark mode icon and price tag');
