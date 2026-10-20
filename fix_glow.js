import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `bg-[#DCE4B8] dark:bg-blue-900/30 border-[#515739] dark:border-white/20`;
const replace1 = `bg-[#DCE4B8] dark:bg-blue-500/10 border-[#515739] dark:border-blue-500/50 dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]`;

const target2 = `bg-[#DCE4B8] dark:bg-blue-900/30 border-2 border-[#515739] dark:border-white/20`;
const replace2 = `bg-[#DCE4B8] dark:bg-blue-500/10 border-2 border-[#515739] dark:border-blue-500/50 dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]`;

const target3 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#515739] dark:border-[#d9ff00]/50`;
const replace3 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#515739] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]`;

const target4 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#515739] dark:border-[#d9ff00]/50`;
const replace4 = `bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#515739] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);
content = content.replace(target3, replace3);
content = content.replace(target4, replace4);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed styles');
