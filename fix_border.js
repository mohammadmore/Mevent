import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/border-gray-900 dark:border-white/g, 'border-teal-600 dark:border-white/20');
content = content.replace(/border-teal-900 dark:border-white/g, 'border-teal-600 dark:border-[#d9ff00]/50');
content = content.replace(/border-blue-900 dark:border-white/g, 'border-blue-500 dark:border-white/20');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed borders');
