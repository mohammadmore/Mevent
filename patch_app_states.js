import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `  const [savedEvents, setSavedEvents] = useState<Event[]>([]);`;
const replacement1 = `  const [savedEvents, setSavedEvents] = useState<Event[]>([]);\n  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([]);`;
content = content.replace(target1, replacement1);

const target2 = `  function fetchSavedEvents() {
    if (!dbUserId) return;
    fetch(\`/api/users/\${dbUserId}/saved\`)
      .then(res => res.json())
      .then(data => setSavedEvents(data.data));
  };`;

const replacement2 = `  function fetchSavedEvents() {
    if (!dbUserId) return;
    fetch(\`/api/users/\${dbUserId}/saved\`)
      .then(res => res.json())
      .then(data => setSavedEvents(data.data));
  };
  function fetchRsvpEvents() {
    if (!dbUserId) return;
    fetch(\`/api/users/\${dbUserId}/rsvped\`)
      .then(res => res.json())
      .then(data => setRsvpEvents(data.data));
  };`;
content = content.replace(target2, replacement2);

const target3 = `      if (activeTab === 'saved') {
        fetchSavedEvents();
        fetchTickets();
      }`;
const replacement3 = `      if (activeTab === 'saved') {
        fetchSavedEvents();
        fetchRsvpEvents();
        fetchTickets();
      }`;
content = content.replace(target3, replacement3);

const target4 = `    fetchSavedEvents(); // Also fetch saved events globally`;
const replacement4 = `    fetchSavedEvents();\n    fetchRsvpEvents();`;
content = content.replace(target4, replacement4);

const target5 = `  const handleInteraction = (eventId: number, type: string) => {
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
        } else if (isSaved) {
          setSavedEvents(prev => prev.map(e => e.id === eventId ? { ...e, savedInteractionType: 'RSVP' } : e));
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

const replacement5 = `  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    const event = events.find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId) || rsvpEvents.find(e => e.id === eventId);

    if (type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      if (isSaved) {
        setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      } else if (event) {
        setSavedEvents(prev => [...prev, event]);
      }
    } else if (type === 'RSVP') {
      const isRsvp = rsvpEvents.some(e => e.id === eventId);
      if (isRsvp) {
        setRsvpEvents(prev => prev.filter(e => e.id !== eventId));
        alert('ثبت‌نام شما لغو شد.');
      } else if (event) {
        setRsvpEvents(prev => [...prev, event]);
        alert('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }
    }

    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type, userId: dbUserId })
    });
  };`;

content = content.replace(target5, replacement5);

fs.writeFileSync('src/App.tsx', content);
