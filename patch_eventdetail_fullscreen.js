import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(
  '<div className="absolute inset-0 bg-white z-40 overflow-y-auto pb-24 flex flex-col">',
  '<div className="fixed inset-0 bg-white z-[100] overflow-y-auto flex flex-col" dir="rtl">'
);

fs.writeFileSync('src/components/EventDetail.tsx', content);
