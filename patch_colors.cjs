const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `<span className={\`text-xs font-bold px-2.5 py-1.5 rounded-full text-white shadow-lg backdrop-blur-sm border border-white/20 \${place.timingTag === 'بعدش بریم' ? 'bg-orange-500/90 dark:bg-[#d9ff00]/90 dark:text-[#18181b]' : 'bg-teal-500/90 dark:bg-teal-400/90 dark:text-[#18181b]'}\`}>`;

const rep = `<span className={\`text-xs font-bold px-2.5 py-1.5 rounded-full text-white shadow-lg backdrop-blur-sm border border-white/20 \${place.timingTag === 'بعدش بریم' ? 'bg-orange-500/90 dark:bg-[#d9ff00]/90 dark:text-[#18181b]' : 'bg-teal-500/90 dark:bg-[#a855f7]/90 dark:text-white'}\`}>`;

code = code.replace(target, rep);
fs.writeFileSync('src/components/EventDetail.tsx', code);
