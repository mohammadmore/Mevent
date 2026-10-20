import fs from 'fs';
let content = fs.readFileSync('src/components/DockMenu.tsx', 'utf8');

// Change -top-5 to -top-8
content = content.replace(/-top-5 pointer-events-none/g, '-top-8 pointer-events-none');

// Change z-0 to z-10 for the circle
content = content.replace(/z-0 absolute/g, 'z-10 absolute');

// Change z-10 to z-20 for the icon and y: -20 to y: -32
content = content.replace(/className={\`z-10 flex items-center/g, 'className={`z-20 flex items-center');
content = content.replace(/y: isActive \? -20 : 0/g, 'y: isActive ? -32 : 0');

fs.writeFileSync('src/components/DockMenu.tsx', content);
console.log('DockMenu fixed.');
