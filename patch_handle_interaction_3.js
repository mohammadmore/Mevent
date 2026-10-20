import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    if (type === 'RSVP' || type === 'SAVE') {
      const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId);
      if (event && !savedEvents.some(e => e.id === eventId)) {
        setSavedEvents(prev => [...prev, event]);
      }
      if (type === 'RSVP') {
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }
    }

    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type, userId: dbUserId })
    });
  };`;

const replacement1 = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    if (type === 'RSVP' || type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId);
      
      if (type === 'SAVE') {
        if (isSaved) {
          setSavedEvents(prev => prev.filter(e => e.id !== eventId));
        } else if (event) {
          setSavedEvents(prev => [...prev, event]);
        }
      } else if (type === 'RSVP') {
        if (!isSaved && event) {
          setSavedEvents(prev => [...prev, event]);
        }
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }
    }

    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type, userId: dbUserId })
    });
  };`;

content = content.replace(target1, replacement1);

const target2 = `            onToggleSave={() => {
              handleInteraction(selectedEvent.id, 'SAVE');
              // Optimistically update savedEvents
              if (savedEvents.some(e => e.id === selectedEvent.id)) {
                setSavedEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
              } else {
                setSavedEvents(prev => [...prev, selectedEvent]);
              }
            }}`;
const replacement2 = `            onToggleSave={() => {
              handleInteraction(selectedEvent.id, 'SAVE');
            }}`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
