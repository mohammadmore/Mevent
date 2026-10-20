import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = / shadow-\[4px_4px_0px_#111827\] dark:shadow-\[4px_4px_0px_#ffffff\] hover:-translate-y-1 hover:shadow-\[6px_6px_0px_#111827\] dark:hover:shadow-\[6px_6px_0px_#ffffff\]/g;

content = content.replace(regex, '');

fs.writeFileSync('src/App.tsx', content);
console.log('Removed shadows');
