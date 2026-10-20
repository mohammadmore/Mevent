import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className="absolute inset-0 bg-teal-600 dark:bg-\[#d9ff00\] rounded-full z-\[5\] shadow-sm"/g, 'className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-20 shadow-sm"');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed back to z-20');
