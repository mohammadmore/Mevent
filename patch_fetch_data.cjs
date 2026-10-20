const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const target = `      const [statsRes, usersRes, eventsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/events'),
        fetch('/api/admin/settings')
      ]);`;

const rep = `      const [statsRes, usersRes, eventsRes, settingsRes, placesRes, chainsRes, vibesRes, flowsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/events'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/places'),
        fetch('/api/admin/chains'),
        fetch('/api/admin/vibes'),
        fetch('/api/admin/flows')
      ]);`;

code = code.replace(target, rep);

const target2 = `      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data);
      }`;

const rep2 = `      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data);
      }
      if (placesRes.ok) {
        const placesData = await placesRes.json();
        setPlaces(placesData);
      }
      if (chainsRes.ok) {
        const chainsData = await chainsRes.json();
        setChains(chainsData);
      }
      if (vibesRes.ok) {
        const vibesData = await vibesRes.json();
        setVibes(vibesData);
      }
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json();
        setFlows(flowsData);
      }`;

code = code.replace(target2, rep2);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
