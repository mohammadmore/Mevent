import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className=\{\`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-\[4px_4px_0px_#111827\] dark:shadow-\[4px_4px_0px_#ffffff\] hover:-translate-y-1 hover:shadow-\[6px_6px_0px_#111827\] dark:hover:shadow-\[6px_6px_0px_#ffffff\] \$\{[\s\S]*?\}\`\}/;

const replacementStr = `className={\`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-teal-50 dark:bg-[#d9ff00]/10 border-teal-900 dark:border-white'
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-900 dark:border-white'
                        : 'bg-white dark:bg-[#18181b] border-gray-900 dark:border-white'
                    }\`}`;

if (regex.test(content)) {
  content = content.replace(regex, replacementStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed discover cards classes');
} else {
  console.log('Target regex not found!');
}
