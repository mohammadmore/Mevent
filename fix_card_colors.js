import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                    className={\`group rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-green-50/50 border-green-100 shadow-sm hover:shadow-md' 
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-50/50 border-blue-100 shadow-sm hover:shadow-md'
                        : 'bg-[#18181b] border-white/10 shadow-sm hover:shadow-md'
                    }\`}
                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}
                  >
                    {getEventBackgroundIcon(event.tags || [])}`;

const rep1 = `                    className={\`group rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer \${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-[#d9ff00] border-[#c6eb00] shadow-sm hover:shadow-md' 
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-blue-300 border-blue-400 shadow-sm hover:shadow-md'
                        : 'bg-[#18181b] border-white/10 shadow-sm hover:shadow-md'
                    }\`}
                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}
                  >
                    {getEventBackgroundIcon(event.tags || [])}`;

// We will map over filteredEvents and inject isGoing and isSaved
// Wait, the map doesn't have isGoing, we have to replace the code inside the map.

content = content.replace(target1, rep1);

fs.writeFileSync('src/App.tsx', content);
