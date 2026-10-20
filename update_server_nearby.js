import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// Update import
content = content.replace(
  "import { getRecommendedEvents, createEvent, getSavedEvents, getOrganizerEvents } from './src/db/events.ts';",
  "import { getRecommendedEvents, getNearbyEvents, createEvent, getSavedEvents, getOrganizerEvents } from './src/db/events.ts';"
);

// Replace nearby endpoint implementation
const oldNearby = `  // Location-based Events API
  app.get('/api/events/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      const allEvents = await getRecommendedEvents(); // Fetch all for now and filter
      
      if (!lat || !lng) {
        return res.json({ data: allEvents });
      }

      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);

      // Very simple distance calculation (Haversine formula approximation)
      const filtered = allEvents.filter(e => {
        if (!e.lat || !e.lng) return true; // Show online/undefined location events
        const dLat = (e.lat - userLat) * (Math.PI / 180);
        const dLng = (e.lng - userLng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * (Math.PI / 180)) * Math.cos(e.lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c; // Distance in km
        return distance <= parseFloat(radius as string);
      });
      res.json({ data: filtered });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch nearby events' });
    }
  });`;

const newNearby = `  // Location-based Events API (delegated to PostgreSQL Spatial SQL)
  app.get('/api/events/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      const userLat = lat ? parseFloat(lat as string) : undefined;
      const userLng = lng ? parseFloat(lng as string) : undefined;
      const rad = radius ? parseFloat(radius as string) : 10;

      const eventsData = await getNearbyEvents(userLat, userLng, rad);
      res.json({ data: eventsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch nearby events' });
    }
  });`;

if (content.includes(oldNearby)) {
  content = content.replace(oldNearby, newNearby);
  fs.writeFileSync('server.ts', content);
  console.log('Successfully updated server.ts nearby endpoint');
} else {
  console.log('Old nearby block not matched exactly, checking regex replacement');
  // Fallback regex replacement
  const regex = /\/\/\s*Location-based Events API[\s\S]*?app\.get\('\/api\/events\/nearby'[\s\S]*?\n  \}\);/;
  if (regex.test(content)) {
    content = content.replace(regex, newNearby);
    fs.writeFileSync('server.ts', content);
    console.log('Successfully updated server.ts via regex');
  } else {
    console.error('Failed to find nearby block in server.ts');
  }
}
