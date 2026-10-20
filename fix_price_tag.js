import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<span className="bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2">`;
const replacement = `<span className={\`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2 \${isGoing || isSaved ? 'bg-white text-[#FD6F2F] dark:bg-white dark:text-[#FD6F2F]' : 'bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]'}\`}>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed price tag successfully.');
} else {
  console.log('Target not found.');
}
