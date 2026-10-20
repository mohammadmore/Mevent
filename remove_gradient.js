import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'bg-gradient-to-br from-teal-50/50 via-white to-cyan-50/50 dark:from-[#0f0f11] dark:via-[#0f0f11] dark:to-[#0f0f11]',
  'bg-white dark:bg-[#0f0f11]'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Removed gradient background');
