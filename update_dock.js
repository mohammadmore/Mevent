import fs from 'fs';
let content = fs.readFileSync('src/components/DockMenu.tsx', 'utf8');
content = content.replace(
  "const buttons = Array.from(containerRef.current.querySelectorAll('button[data-id]'));",
  "const buttons = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button[data-id]'));"
);
fs.writeFileSync('src/components/DockMenu.tsx', content);
console.log('DockMenu updated');
