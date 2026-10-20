import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// For discover tab
content = content.replace(/\{filteredEvents\.map\(\(event, index\) => \(/g, 
  `{filteredEvents.map((event, index) => {\n                  const isGoing = rsvpEvents.some(se => se.id === event.id);\n                  const isSaved = savedEvents.some(se => se.id === event.id);\n                  const isLight = isGoing || isSaved;\n                  return (`);

content = content.replace(/<h3 className="font-bold text-lg text-gray-100 mb-1 group-hover:text-\[\#d9ff00\] transition-colors">\{event\.title\}<\/h3>/g, 
  `<h3 className={\`font-bold text-lg mb-1 transition-colors \${isLight ? 'text-black' : 'text-gray-100 group-hover:text-[#d9ff00]'}\`}>{event.title}</h3>`);

content = content.replace(/<p className="text-gray-400 text-sm leading-relaxed">\{event\.description\}<\/p>/g,
  `<p className={\`text-sm leading-relaxed \${isLight ? 'text-gray-800' : 'text-gray-400'}\`}>{event.description}</p>`);

content = content.replace(/<Calendar className="w-4 h-4 text-gray-400 shrink-0" \/>/g,
  `<Calendar className={\`w-4 h-4 shrink-0 \${isLight ? 'text-gray-700' : 'text-gray-400'}\`} />`);

content = content.replace(/<MapPin className="w-4 h-4 text-gray-400" \/>/g,
  `<MapPin className={\`w-4 h-4 \${isLight ? 'text-gray-700' : 'text-gray-400'}\`} />`);

content = content.replace(/<span className="truncate">\{formatEventDate\(event\.startTime\)\}<\/span>/g,
  `<span className={\`truncate \${isLight ? 'text-gray-800' : ''}\`}>{formatEventDate(event.startTime)}</span>`);

content = content.replace(/<span className="truncate">\{event\.location\.address\}<\/span>/g,
  `<span className={\`truncate \${isLight ? 'text-gray-800' : ''}\`}>{event.location.address}</span>`);

content = content.replace(/<div className="flex items-center gap-1\.5 pl-5 text-\[\#d9ff00\] font-bold">/g,
  `<div className={\`flex items-center gap-1.5 pl-5 font-bold \${isLight ? 'text-black' : 'text-[#d9ff00]'}\`}>`);

content = content.replace(/<Users className="w-4 h-4 text-gray-400" \/>/g,
  `<Users className={\`w-4 h-4 \${isLight ? 'text-gray-700' : 'text-gray-400'}\`} />`);

content = content.replace(/<span className="text-xs text-gray-400 font-medium">\{event\.registeredCount \|\| 0\} نفر می‌روند<\/span>/g,
  `<span className={\`text-xs font-medium \${isLight ? 'text-gray-800' : 'text-gray-400'}\`}>{event.registeredCount || 0} نفر می‌روند</span>`);

// Close the map block for filteredEvents
content = content.replace(/<\/div>\s*\)\)\}/g, `</div>\n                  );\n                })}`);

// Same for RSVP events tab
content = content.replace(/className="bg-green-50\/50 border-green-100/g, 'className="bg-[#d9ff00] border-[#c6eb00]');
content = content.replace(/<h3 className="font-bold text-lg text-gray-100 mb-1">\{event\.title\}<\/h3>/g,
  `<h3 className="font-bold text-lg text-black mb-1">{event.title}</h3>`);
content = content.replace(/<div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">/g,
  `<div className="flex flex-col gap-2 text-xs font-medium text-gray-800 mb-2">`);
content = content.replace(/<Calendar className="w-4 h-4 text-gray-400" \/>/g,
  `<Calendar className="w-4 h-4 text-gray-700" />`);

// Same for Saved events tab
content = content.replace(/className="bg-blue-50\/50 border-blue-100/g, 'className="bg-blue-300 border-blue-400');
// Already handled h3 and the Calendar text color because it replaces globally... Wait, global replace might hit RSVP and Saved if they have the exact string. Let's check.

fs.writeFileSync('src/App.tsx', content);
