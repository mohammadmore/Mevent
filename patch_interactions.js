import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const target = `const interaction = await createInteraction({
        userId: actualUserId,
        eventId: parseInt(eventId, 10),
        type,
        metadata
      });`;

const replacement = `const { db } = await import('./src/db/index.ts');
      const { interactions } = await import('./src/db/schema.ts');
      const { eq, and } = await import('drizzle-orm');
      
      let interaction;
      if (type === 'SAVE') {
        // Toggle save
        const existing = await db.select().from(interactions).where(
          and(
            eq(interactions.userId, actualUserId),
            eq(interactions.eventId, parseInt(eventId, 10)),
            eq(interactions.type, 'SAVE')
          )
        );
        if (existing.length > 0) {
          // Unsave
          await db.delete(interactions).where(eq(interactions.id, existing[0].id));
          return res.json({ success: true, action: 'unsaved' });
        } else {
          interaction = await createInteraction({
            userId: actualUserId,
            eventId: parseInt(eventId, 10),
            type,
            metadata
          });
        }
      } else {
        interaction = await createInteraction({
          userId: actualUserId,
          eventId: parseInt(eventId, 10),
          type,
          metadata
        });
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
