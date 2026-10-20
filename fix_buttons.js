import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(/text-gray-900 dark:text-white hover:bg-black\/30/g, 'text-white hover:bg-black/40');
content = content.replace(/bg-black\/20/g, 'bg-black/40');

fs.writeFileSync('src/components/EventDetail.tsx', content);
