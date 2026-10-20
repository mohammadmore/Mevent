import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace SVG classes
const oldSvgClass = 'className="absolute left-[-20px] bottom-[-20px] w-48 h-48 text-gray-200 opacity-30 -rotate-12 pointer-events-none"';
const newSvgClass = 'className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 text-gray-200 opacity-20 -rotate-12 pointer-events-none z-0"';

content = content.replace(new RegExp(oldSvgClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newSvgClass);

// Make .p-4 relative and z-10
const oldP4 = '<div className="p-4">';
const newP4 = '<div className="p-4 relative z-10">';

content = content.replace(new RegExp(oldP4.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newP4);

fs.writeFileSync('src/App.tsx', content);
