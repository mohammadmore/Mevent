import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/z-0/g, 'z-20');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed icon z-index');
