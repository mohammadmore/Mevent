import fs from 'fs';
let content = fs.readFileSync('src/components/DockMenu.tsx', 'utf8');

content = content.replace(
  'const rect = button.getBoundingClientRect();',
  'const rect = (button as HTMLElement).getBoundingClientRect();'
);
content = content.replace(
  "const tabId = button.getAttribute('data-id');",
  "const tabId = (button as HTMLElement).getAttribute('data-id');"
);

fs.writeFileSync('src/components/DockMenu.tsx', content);
console.log('DockMenu fixed');
