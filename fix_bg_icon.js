import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `const colorClass = isColored ? 'text-white dark:text-white opacity-100' : 'text-gray-800 dark:text-gray-200 opacity-20';`;
const replacement = `const colorClass = isColored ? 'text-white dark:text-white opacity-100' : 'text-[#FD6F2F] opacity-30 dark:text-gray-200 dark:opacity-20';`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed background icon color successfully.');
} else {
  console.log('Target not found.');
}
