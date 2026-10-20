import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<h3 className="font-bold text-lg mb-1 transition-colors text-gray-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-\[#d9ff00\]">\{event\.title\}<\/h3>/g, 
'<h3 className="font-bold text-lg mb-1 transition-colors text-[#515739] dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00]">{event.title}</h3>');

content = content.replace(/<h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">\{event\.title\}<\/h3>/g,
'<h3 className="font-bold text-lg text-[#515739] dark:text-gray-100">{event.title}</h3>');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed titles');
