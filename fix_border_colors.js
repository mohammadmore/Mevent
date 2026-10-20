import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/border-gray-200 dark:border-white\/20/g, 'border-gray-300 dark:border-white/20');
content = content.replace(/border-\[#515739\]/g, 'border-[#747E4D]');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed border colors');
