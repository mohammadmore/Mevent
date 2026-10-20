import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

const darkBluePattern = /--color-blue-50: #eff6ff;\s+--color-blue-100: #dbeafe;\s+--color-blue-500: #3b82f6;\s+--color-blue-600: #2563eb;\s+--color-blue-900: #1e3a8a;/g;

const purpleReplacement = `--color-blue-50: #faf5ff;
    --color-blue-100: #f3e8ff;
    --color-blue-500: #a855f7;
    --color-blue-600: #9333ea;
    --color-blue-900: #581c87;`;

content = content.replace(darkBluePattern, purpleReplacement);
fs.writeFileSync('src/index.css', content);
console.log('Fixed index.css');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/dark:bg-blue-900\/40/g, 'dark:bg-blue-900/40'); // Wait, if I change the CSS variable, Tailwind's bg-blue-900 will automatically use #581c87
appContent = appContent.replace(/dark:fill-\[#d9ff00\] text-\[#FD6F2F\] dark:text-\[#d9ff00\]/g, 'dark:fill-blue-500 text-[#FD6F2F] dark:text-blue-500');
fs.writeFileSync('src/App.tsx', appContent);
console.log('Fixed App.tsx');
