import fs from 'fs';

function replaceSafely(content, search, replacement) {
  if (content.includes(search)) {
    return content.replace(search, replacement);
  }
  return content;
}

let content = fs.readFileSync('server.ts', 'utf8');

const getRecommendedEventsImport = `import { getRecommendedEvents, createEvent, getSavedEvents } from './src/db/events.ts';`;
const newGetRecommendedEventsImport = `import { getRecommendedEvents, createEvent, getSavedEvents, getOrganizerEvents } from './src/db/events.ts';`;
content = replaceSafely(content, getRecommendedEventsImport, newGetRecommendedEventsImport);


const appPostEvents = `  // Event Creation (UGC - with AI Tagging)`;
const newRoutes = `
  // Organizer API
  app.get('/api/organizer/events', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
      if (!userId) return res.status(400).json({ error: 'User ID required' });
      const orgEvents = await getOrganizerEvents(userId);
      
      const formattedEvents = orgEvents.map(e => ({
        ...e,
        location: {
          address: e.address,
          lat: e.lat,
          lng: e.lng
        }
      }));
      res.json({ data: formattedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch organizer events' });
    }
  });

  app.get('/api/organizer/events/:id/stats', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { db } = await import('./src/db/index.ts');
      const { tickets, interactions } = await import('./src/db/schema.ts');
      const { eq, and, sql } = await import('drizzle-orm');
      
      const eventTickets = await db.select().from(tickets).where(eq(tickets.eventId, eventId));
      
      const viewsQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'VIEW')));
      const savesQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'SAVE')));
      const rsvpsQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));
      
      const revenue = eventTickets.reduce((acc, t) => acc + (t.amount || 0), 0);
      
      res.json({
        data: {
          ticketsSold: eventTickets.length,
          revenue: revenue,
          views: Number(viewsQuery[0]?.count || 0),
          saves: Number(savesQuery[0]?.count || 0),
          rsvps: Number(rsvpsQuery[0]?.count || 0)
        }
      });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Event Creation (UGC - with AI Tagging)`;

content = replaceSafely(content, appPostEvents, newRoutes);
fs.writeFileSync('server.ts', content);
