import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Change z-20 back to z-[5]
content = content.replace(/z-20/g, 'z-[5]');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed icon z-index to z-[5]');
