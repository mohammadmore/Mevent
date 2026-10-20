import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const handleInteraction = (eventId: number, type: string) => {
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
    }`;

const replacement1 = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    if (type === 'RSVP' || type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId);
      
      if (type === 'SAVE') {
        if (isSaved) {
          setSavedEvents(prev => prev.filter(e => e.id !== eventId));
        } else if (event) {
          setSavedEvents(prev => [...prev, { ...event, savedInteractionType: 'SAVE' }]);
        }
      } else if (type === 'RSVP') {
        if (!isSaved && event) {
          setSavedEvents(prev => [...prev, { ...event, savedInteractionType: 'RSVP' }]);
        }
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }
    }`;

content = content.replace(target1, replacement1);

const target2 = `                  {savedEvents.map((event, index) => (
                    <div key={\`\${event.id}-\${index}\`} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>`;

const replacement2 = `                  {savedEvents.map((event: any, index) => (
                    <div key={\`\${event.id}-\${index}\`} className={\`\${event.savedInteractionType === 'RSVP' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'} rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer\`} onClick={() => setSelectedEvent(event)}>`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
