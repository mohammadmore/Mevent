import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      if (type === 'SAVE') {
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
      }`;

const replacement = `      if (type === 'SAVE') {
        const { inArray } = await import('drizzle-orm');
        // Toggle save: check if ANY save/rsvp exists
        const existing = await db.select().from(interactions).where(
          and(
            eq(interactions.userId, actualUserId),
            eq(interactions.eventId, parseInt(eventId, 10)),
            inArray(interactions.type, ['SAVE', 'RSVP'])
          )
        );
        if (existing.length > 0) {
          // Unsave by deleting all SAVE/RSVP interactions for this event
          await db.delete(interactions).where(
            and(
              eq(interactions.userId, actualUserId),
              eq(interactions.eventId, parseInt(eventId, 10)),
              inArray(interactions.type, ['SAVE', 'RSVP'])
            )
          );
          return res.json({ success: true, action: 'unsaved' });
        } else {
          interaction = await createInteraction({
            userId: actualUserId,
            eventId: parseInt(eventId, 10),
            type,
            metadata
          });
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
