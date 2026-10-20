import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Discover Tab
content = content.replace(
  `                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg mb-1 transition-colors text-gray-100 group-hover:text-[#d9ff00]">{event.title}</h3>
                          <p className="text-sm leading-relaxed text-gray-400">{event.description}</p>
                        </div>
                        <span className="bg-[#d9ff00]/10 text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2">`,
  `                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                          <img src={\`https://api.dicebear.com/7.x/notionists/svg?seed=\${event.organizerId || event.title}&backgroundColor=transparent\`} alt="Organizer" className="w-10 h-10 rounded-full border border-white/10 shrink-0 bg-[#1f1f23]/50" />
                          <div>
                            <h3 className="font-bold text-lg mb-1 transition-colors text-gray-100 group-hover:text-[#d9ff00]">{event.title}</h3>
                            <p className="text-sm leading-relaxed text-gray-400">{event.description}</p>
                          </div>
                        </div>
                        <span className="bg-[#d9ff00]/10 text-[#d9ff00] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mr-2">`
);

// RSVP Tab
content = content.replace(
  `                      <h3 className="font-bold text-lg text-gray-100 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">`,
  `                      <div className="flex items-center gap-3 mb-3">
                        <img src={\`https://api.dicebear.com/7.x/notionists/svg?seed=\${event.organizerId || event.title}&backgroundColor=transparent\`} alt="Organizer" className="w-10 h-10 rounded-full border border-white/10 shrink-0 bg-[#1f1f23]/50" />
                        <h3 className="font-bold text-lg text-gray-100">{event.title}</h3>
                      </div>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">`
);

// Saved Tab
content = content.replace(
  `                      <h3 className="font-bold text-lg text-gray-100 mb-1">{event.title}</h3>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">`,
  `                      <div className="flex items-center gap-3 mb-3">
                        <img src={\`https://api.dicebear.com/7.x/notionists/svg?seed=\${event.organizerId || event.title}&backgroundColor=transparent\`} alt="Organizer" className="w-10 h-10 rounded-full border border-white/10 shrink-0 bg-[#1f1f23]/50" />
                        <h3 className="font-bold text-lg text-gray-100">{event.title}</h3>
                      </div>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-400 mb-2">`
);

fs.writeFileSync('src/App.tsx', content);
