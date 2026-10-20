import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

const target = `--color-blue-50: #faf5ff;
    --color-blue-100: #f3e8ff;
    --color-blue-500: #a855f7;
    --color-blue-600: #9333ea;
    --color-blue-900: #581c87;`;
    
const replacement = `--color-blue-50: #faf5ff;
    --color-blue-100: #f3e8ff;
    --color-blue-200: #e9d5ff;
    --color-blue-300: #d8b4fe;
    --color-blue-400: #c084fc;
    --color-blue-500: #a855f7;
    --color-blue-600: #9333ea;
    --color-blue-700: #7e22ce;
    --color-blue-800: #6b21a8;
    --color-blue-900: #581c87;`;
    
content = content.replace(target, replacement);
fs.writeFileSync('src/index.css', content);
console.log('Fixed dark mode blue colors');
