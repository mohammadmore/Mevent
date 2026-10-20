const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  // Event Edit / Delete`;

const replacement = `  // Similar Events
  app.get('/api/events/:id/similar', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const allUpcoming = await getRecommendedEvents(); // Gets all upcoming events
      
      const currentEvent = allUpcoming.find(e => e.id === eventId);
      if (!currentEvent) {
        return res.json({ data: [] });
      }

      // Filter out the current event itself and past events
      const now = new Date();
      const candidates = allUpcoming.filter(e => {
        if (e.id === eventId) return false;
        if (!e.startTime) return false;
        if (new Date(e.startTime) < now) return false;
        return true;
      });

      // Calculate similarity
      const scored = candidates.map(e => {
        let score = 0;
        
        // Tags overlap
        const currentTags = currentEvent.tags || [];
        const eTags = e.tags || [];
        const commonTags = currentTags.filter((t: string) => eTags.includes(t));
        score += commonTags.length * 2;
        
        // Same organizer
        if (e.organizerId === currentEvent.organizerId && e.organizerId !== null) score += 3;
        
        // Same hub
        if (e.hubId === currentEvent.hubId && e.hubId !== null) score += 2;
        
        // Same category
        if (e.category === currentEvent.category && e.category !== null) score += 3;

        return { event: e, score };
      });

      // Sort by score descending and take top 4
      scored.sort((a, b) => b.score - a.score);
      
      const similar = scored.slice(0, 4).map(s => s.event);
      res.json({ data: similar });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch similar events' });
    }
  });

  // Event Edit / Delete`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
