import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const newRoutes = `
  // --- Event Management APIs ---
  app.put('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { db } = await import('./src/db/index.ts');
      const { events } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      const updatedData = req.body;
      if (updatedData.startTime) updatedData.startTime = new Date(updatedData.startTime);
      if (updatedData.endTime) updatedData.endTime = new Date(updatedData.endTime);
      
      await db.update(events).set(updatedData).where(eq(events.id, eventId));
      res.json({ success: true, message: 'رویداد با موفقیت ویرایش شد' });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { db } = await import('./src/db/index.ts');
      const { events, interactions, tickets } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      // Delete interactions and tickets first due to foreign keys
      await db.delete(interactions).where(eq(interactions.eventId, eventId));
      await db.delete(tickets).where(eq(tickets.eventId, eventId));
      
      await db.delete(events).where(eq(events.id, eventId));
      res.json({ success: true, message: 'رویداد با موفقیت حذف شد' });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  app.put('/api/events/:id/status', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { status } = req.body;
      const { db } = await import('./src/db/index.ts');
      const { events } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      await db.update(events).set({ status }).where(eq(events.id, eventId));
      res.json({ success: true, message: 'وضعیت رویداد تغییر کرد' });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update event status' });
    }
  });

  // Organizer API
`;

if (!content.includes('/api/events/:id/status')) {
  content = content.replace('  // Organizer API', newRoutes);
  fs.writeFileSync('server.ts', content);
}
