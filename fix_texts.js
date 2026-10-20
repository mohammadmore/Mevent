import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove isLight logic and revert class names
content = content.replace(/const isLight = isGoing \|\| isSaved;/g, '');

content = content.replace(/className=\{\`font-bold text-lg mb-1 transition-colors \$\{isLight \? 'text-black' : 'text-gray-100 group-hover:text-\\[#d9ff00\\]'\}\`\}/g, 
  'className="font-bold text-lg mb-1 transition-colors text-gray-100 group-hover:text-[#d9ff00]"');

content = content.replace(/className=\{\`text-sm leading-relaxed \$\{isLight \? 'text-gray-800' : 'text-gray-400'\}\`\}/g, 
  'className="text-sm leading-relaxed text-gray-400"');

content = content.replace(/className=\{\`w-4 h-4 shrink-0 \$\{isLight \? 'text-gray-700' : 'text-gray-400'\}\`\}/g, 
  'className="w-4 h-4 shrink-0 text-gray-400"');

content = content.replace(/className=\{\`truncate \$\{isLight \? 'text-gray-800' : ''\}\`\}/g, 
  'className="truncate"');

content = content.replace(/className=\{\`w-4 h-4 \$\{isLight \? 'text-gray-700' : 'text-gray-400'\}\`\}/g, 
  'className="w-4 h-4 text-gray-400"');

content = content.replace(/className=\{\`flex items-center gap-1.5 pl-5 font-bold \$\{isLight \? 'text-black' : 'text-\\[#d9ff00\\]'\}\`\}/g, 
  'className="flex items-center gap-1.5 pl-5 font-bold text-[#d9ff00]"');

content = content.replace(/className=\{\`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2 \$\{isLight \? 'bg-black\/10 text-black' : 'bg-\\[#d9ff00\\]\/10 text-\\[#d9ff00\\]'\}\`\}/g,
  'className="bg-[#d9ff00]/10 text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2"');

content = content.replace(/\{getEventBackgroundIcon\(event.tags \|\| \[\], isLight\)\}/g, 
  '{getEventBackgroundIcon(event.tags || [])}');

const targetIcon = `const getEventBackgroundIcon = (tags: string[], isLight: boolean = false) => {
  const colorClass = isLight ? 'text-black/5' : 'text-gray-200 opacity-20';`;
const repIcon = `const getEventBackgroundIcon = (tags: string[]) => {
  const colorClass = 'text-gray-200 opacity-20';`;
content = content.replace(targetIcon, repIcon);


// 2. Change background classes to dark transparent versions

// In discover tab
content = content.replace(/'bg-green-50\/50 border-green-100 shadow-sm hover:shadow-md'/g, 
  "'bg-[#d9ff00]/5 border-[#d9ff00]/30 shadow-sm hover:shadow-md hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50'");
content = content.replace(/'bg-blue-50\/50 border-blue-100 shadow-sm hover:shadow-md'/g, 
  "'bg-blue-500/5 border-blue-500/30 shadow-sm hover:shadow-md hover:bg-blue-500/10 hover:border-blue-500/50'");

// In RSVP tab
content = content.replace(/className="bg-green-50\/50 border-green-100 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"/g, 
  'className="bg-[#d9ff00]/5 border-[#d9ff00]/30 hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"');
// Fix texts in RSVP tab (which were set to text-black and text-gray-800 earlier)
content = content.replace(/<h3 className="font-bold text-lg text-black mb-1">\{event.title\}<\/h3>/g, 
  '<h3 className="font-bold text-lg text-gray-100 mb-1">{event.title}</h3>');
content = content.replace(/<div className="flex flex-col gap-2 text-xs font-medium text-gray-800 mb-2">/g, 
  '<div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">');
content = content.replace(/<Calendar className="w-4 h-4 text-gray-700" \/>/g, 
  '<Calendar className="w-4 h-4 text-gray-400" />');

// In Saved tab
content = content.replace(/className="bg-blue-50\/50 border-blue-100 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"/g, 
  'className="bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"');
content = content.replace(/<h3 className="font-bold text-lg text-black mb-1">\{event.title\}<\/h3>/g, 
  '<h3 className="font-bold text-lg text-gray-100 mb-1">{event.title}</h3>');
content = content.replace(/<div className="flex flex-col gap-2 text-xs font-medium text-gray-800 mb-2">/g, 
  '<div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">');
content = content.replace(/<Calendar className="w-4 h-4 text-gray-700" \/>/g, 
  '<Calendar className="w-4 h-4 text-gray-400" />');


fs.writeFileSync('src/App.tsx', content);
