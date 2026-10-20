import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<h1([^>]*)text-gray-900([^>]*)>/g, '<h1$1text-[#515739]$2>');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed H1 colors');
