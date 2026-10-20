import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      } else {
        interaction = await createInteraction({
          userId: actualUserId,
          eventId: parseInt(eventId, 10),
          type,
          metadata
        });
      }`;

const replacement = `      } else {
        if (type === 'RSVP') {
          const { inArray } = await import('drizzle-orm');
          const existing = await db.select().from(interactions).where(
            and(
              eq(interactions.userId, actualUserId),
              eq(interactions.eventId, parseInt(eventId, 10)),
              inArray(interactions.type, ['SAVE', 'RSVP'])
            )
          );
          if (existing.length > 0) {
            await db.delete(interactions).where(
              and(
                eq(interactions.userId, actualUserId),
                eq(interactions.eventId, parseInt(eventId, 10)),
                inArray(interactions.type, ['SAVE', 'RSVP'])
              )
            );
          }
        }
        interaction = await createInteraction({
          userId: actualUserId,
          eventId: parseInt(eventId, 10),
          type,
          metadata
        });
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
