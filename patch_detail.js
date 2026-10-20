import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

content = content.replace(/bg-white/g, 'bg-[#18181b]');
content = content.replace(/text-gray-900/g, 'text-gray-100');
content = content.replace(/text-gray-800/g, 'text-gray-200');
content = content.replace(/text-gray-500/g, 'text-gray-400');
content = content.replace(/text-gray-600/g, 'text-gray-300');
content = content.replace(/border-gray-100/g, 'border-white/10');
content = content.replace(/border-gray-200/g, 'border-white/20');
content = content.replace(/bg-gray-50/g, 'bg-[#1f1f23]');
content = content.replace(/bg-gray-100/g, 'bg-white/5');

fs.writeFileSync('src/components/EventDetail.tsx', content);
