const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  // Similar Events`;

const replacement = `  // Nearby Places for Event
  app.get('/api/events/:id/nearby-places', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const eventData = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
      if (!eventData.length) return res.json({ data: [] });
      const event = eventData[0];
      
      if (!event.lat || !event.lng) return res.json({ data: [] });
      
      const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));
      
      const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a));
      };

      const nearbyPlaces = allPlaces
        .filter(p => p.lat && p.lng)
        .map(p => ({
          ...p,
          distance: distance(event.lat!, event.lng!, p.lat!, p.lng!)
        }))
        .filter(p => p.distance <= 10) // within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);

      res.json({ data: nearbyPlaces });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
  });

  // Similar Events`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
