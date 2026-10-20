import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

const target = `--color-blue-50: #DCE4B8;
    --color-blue-100: #DCE4B8;
    --color-blue-500: #515739;
    --color-blue-600: #515739;
    --color-blue-900: #515739;`;
    
const replacement = `--color-blue-50: #DCE4B8;
    --color-blue-100: #DCE4B8;
    --color-blue-200: #DCE4B8;
    --color-blue-300: #DCE4B8;
    --color-blue-500: #515739;
    --color-blue-600: #515739;
    --color-blue-700: #515739;
    --color-blue-800: #515739;
    --color-blue-900: #515739;`;
    
content = content.replace(target, replacement);
fs.writeFileSync('src/index.css', content);
console.log('Fixed light mode blue colors');
