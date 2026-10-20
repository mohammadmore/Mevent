import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `className={\`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-teal-600/5 dark:bg-[#d9ff00]/5 border-teal-600/30 dark:border-[#d9ff00]/30 shadow-teal-600/10 dark:shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-teal-600/20 dark:hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] hover:bg-teal-600/10 dark:bg-[#d9ff00]/10 hover:border-teal-600/50 dark:hover:border-[#d9ff00]/50'
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-500/5 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] hover:bg-blue-500/10 hover:border-blue-500/50'
                        : 'bg-white/90 dark:bg-[#18181b] border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md'
                    }\`}`;

const replacementStr = `className={\`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[4px_4px_0px_#111827] dark:shadow-[4px_4px_0px_#ffffff] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#111827] dark:hover:shadow-[6px_6px_0px_#ffffff] \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-teal-100 dark:bg-[#d9ff00]/20 border-teal-900 dark:border-white'
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-900 dark:border-white'
                        : 'bg-white dark:bg-[#18181b] border-gray-900 dark:border-white'
                    }\`}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed discover cards classes');
} else {
  console.log('Target string not found!');
}
