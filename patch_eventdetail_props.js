import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
          />`;

const replacement = `<EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}
            onToggleSave={() => {
              handleInteraction(selectedEvent.id, 'SAVE');
              // Optimistically update savedEvents
              if (savedEvents.some(e => e.id === selectedEvent.id)) {
                setSavedEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
              } else {
                setSavedEvents(prev => [...prev, selectedEvent]);
              }
            }}
          />`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
