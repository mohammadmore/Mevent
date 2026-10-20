import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update discover tab
content = content.replace(
  '<div className="w-full h-40 bg-white/5 overflow-hidden relative">',
  '<div className="w-full h-64 bg-white/5 overflow-hidden relative">'
);

// Add to RSVP tab
const rsvpTarget = `onClick={() => setSelectedEvent(event)}>
                      <div className="flex items-center gap-3 mb-3">`;
const rsvpRep = `onClick={() => setSelectedEvent(event)}>
                      {event.imageUrl && (
                        <div className="w-full h-64 bg-white/5 overflow-hidden relative rounded-t-xl mb-4 -mt-4 -mx-4" style={{ width: 'calc(100% + 32px)' }}>
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">`;
content = content.replace(rsvpTarget, rsvpRep);

// Add to Saved tab
const savedTarget = `onClick={() => setSelectedEvent(event)}>
                      <div className="flex items-center gap-3 mb-3">`; // Wait, this will replace the first match which could be RSVP if I don't use global or specify it better. Wait, the first match of rsvpTarget is already replaced. So this will match the Saved tab.

content = content.replace(savedTarget, rsvpRep);

fs.writeFileSync('src/App.tsx', content);
