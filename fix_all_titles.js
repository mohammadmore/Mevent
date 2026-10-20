import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace all H2 and H3 that have text-gray-900 with text-[#515739]
content = content.replace(/<h2([^>]*)text-gray-900([^>]*)>/g, '<h2$1text-[#515739]$2>');
content = content.replace(/<h3([^>]*)text-gray-900([^>]*)>/g, '<h3$1text-[#515739]$2>');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed all H2 and H3 colors');
