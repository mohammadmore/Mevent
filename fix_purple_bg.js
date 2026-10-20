import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

const target = `--color-blue-900: #581c87;`;
const replacement = `--color-blue-900: #3b0764;`;

content = content.replace(target, replacement);
fs.writeFileSync('src/index.css', content);
console.log('Fixed background purple color in CSS');
