import fs from 'fs';
let content = fs.readFileSync('src/db/events.ts', 'utf8');

const replacement = `export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'SAVE')));
  
  return result.map(r => r.event);
}

export async function getRsvpEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'RSVP')));
  
  return result.map(r => r.event);
}`;

content = content.replace(/export async function getSavedEvents[\s\S]*?return uniqueEvents;\n}/, replacement);
fs.writeFileSync('src/db/events.ts', content);
