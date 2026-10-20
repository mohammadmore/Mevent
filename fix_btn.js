import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                              rsvpEvents.some(se => se.id === event.id)
                                ? 'bg-green-500/20 text-green-500 hover:bg-green-200'
                                : 'bg-green-600 text-white hover:bg-green-700'`;

const rep = `                              rsvpEvents.some(se => se.id === event.id)
                                ? 'bg-[#d9ff00]/20 text-[#d9ff00] hover:bg-[#d9ff00]/30'
                                : 'bg-[#d9ff00] text-black hover:bg-[#c6eb00]'`;

content = content.replace(target, rep);
fs.writeFileSync('src/App.tsx', content);
