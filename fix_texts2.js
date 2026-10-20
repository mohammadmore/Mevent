import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("className={`font-bold text-lg mb-1 transition-colors ${isLight ? 'text-black' : 'text-gray-100 group-hover:text-[#d9ff00]'}`}", 
  'className="font-bold text-lg mb-1 transition-colors text-gray-100 group-hover:text-[#d9ff00]"');

content = content.replace("className={`flex items-center gap-1.5 pl-5 font-bold ${isLight ? 'text-black' : 'text-[#d9ff00]'}`}", 
  'className="flex items-center gap-1.5 pl-5 font-bold text-[#d9ff00]"');

content = content.replace("className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2 ${isLight ? 'bg-black/10 text-black' : 'bg-[#d9ff00]/10 text-[#d9ff00]'}`}",
  'className="bg-[#d9ff00]/10 text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2"');

fs.writeFileSync('src/App.tsx', content);
