import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}`;
const replacement = `            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}\n            isRsvp={rsvpEvents.some(e => e.id === selectedEvent.id)}`;
content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
