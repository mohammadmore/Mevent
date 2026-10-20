import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

// Replace all <DatePicker with <DatePicker containerClassName="w-full"
content = content.replace(/<DatePicker/g, '<DatePicker\n                containerClassName="w-full"');

fs.writeFileSync('src/components/EventForm.tsx', content);
console.log('Fixed DatePicker widths');
