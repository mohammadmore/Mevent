import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      } else if (type === 'RSVP') {
        if (!isSaved && event) {
          setSavedEvents(prev => [...prev, { ...event, savedInteractionType: 'RSVP' }]);
        }
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }`;

const replacement = `      } else if (type === 'RSVP') {
        if (!isSaved && event) {
          setSavedEvents(prev => [...prev, { ...event, savedInteractionType: 'RSVP' }]);
        } else if (isSaved) {
          setSavedEvents(prev => prev.map(e => e.id === eventId ? { ...e, savedInteractionType: 'RSVP' } : e));
        }
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
