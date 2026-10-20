import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/'bg-white dark:bg-\[#18181b\] border-\[#515739\] dark:border-white\/20'/g, "'bg-white dark:bg-[#18181b] border-gray-200 dark:border-white/20'");

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed normal card border');
