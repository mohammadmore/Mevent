import fs from 'fs';
let content = fs.readFileSync('src/components/GamificationPanel.tsx', 'utf8');
content = content.replace(/from-\[\#d9ff00\](?!\/)/g, 'from-indigo-600 dark:from-[#d9ff00]');
content = content.replace(/from-\[\#d9ff00\]\/20/g, 'from-indigo-600/20 dark:from-[#d9ff00]/20');
content = content.replace(/to-\[\#d9ff00\]\/10/g, 'to-indigo-600/10 dark:to-[#d9ff00]/10');
fs.writeFileSync('src/components/GamificationPanel.tsx', content);
