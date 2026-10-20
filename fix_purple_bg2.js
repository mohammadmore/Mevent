import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/dark:bg-blue-900\/40/g, 'dark:bg-blue-900/30');
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed opacity in App.tsx');
