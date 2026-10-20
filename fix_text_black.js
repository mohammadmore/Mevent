import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-[#c6eb00] text-black font-bold',
  'text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-[#c6eb00] font-bold'
);

fs.writeFileSync('src/App.tsx', content);
