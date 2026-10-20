import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `'bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#515739] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]'`;
const replace1 = `'bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#FD6F2F] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]'`;

const target2 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#515739] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]`;
const replace2 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#FD6F2F] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed styles for RSVP borders');
