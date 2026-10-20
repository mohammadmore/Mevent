import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'className="bg-green-500/20 text-green-500 border-green-200 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>',
  'className="bg-[#d9ff00]/20 text-[#d9ff00] border-[#d9ff00]/40 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>'
);

fs.writeFileSync('src/App.tsx', content);
