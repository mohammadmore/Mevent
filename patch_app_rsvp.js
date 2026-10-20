import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          <EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}
            onToggleSave={() => {`;

const replacement = `          <EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
            onRsvp={(e, event) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}
            onToggleSave={() => {`;
            
content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
