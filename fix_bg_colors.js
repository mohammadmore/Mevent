import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/'bg-\[\#d9ff00\] border-\[\#c6eb00\] shadow-sm hover:shadow-md'/g, "'bg-green-50/50 border-green-100 shadow-sm hover:shadow-md'");
content = content.replace(/'bg-blue-300 border-blue-400 shadow-sm hover:shadow-md'/g, "'bg-blue-50/50 border-blue-100 shadow-sm hover:shadow-md'");

content = content.replace(/className="bg-\[\#d9ff00\] border-\[\#c6eb00\] rounded-2xl/g, 'className="bg-green-50/50 border-green-100 rounded-2xl');
content = content.replace(/className="bg-blue-300 border-blue-400 rounded-2xl/g, 'className="bg-blue-50/50 border-blue-100 rounded-2xl');

fs.writeFileSync('src/App.tsx', content);
