import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type, userId: dbUserId })
    });
  };`;

const replacement = `  const handleInteraction = (eventId: number, type: string) => {
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

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
