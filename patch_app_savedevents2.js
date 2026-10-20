import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-green-200">نشان شده</span>`;

const replacement = `                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={\`\${event.savedInteractionType === 'RSVP' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'} px-2.5 py-1 rounded-lg text-xs font-bold border\`}>{event.savedInteractionType === 'RSVP' ? 'منم میرم' : 'نشان شده'}</span>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
