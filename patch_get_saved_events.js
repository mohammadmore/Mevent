import fs from 'fs';
let content = fs.readFileSync('src/db/events.ts', 'utf8');

const target = `export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), inArray(interactions.type, ['SAVE', 'RSVP'])));

  const uniqueEvents = [];
  const seenIds = new Set();
  for (const row of result) {
    if (!seenIds.has(row.event.id)) {
      seenIds.add(row.event.id);
      uniqueEvents.push(row.event);
    }
  }

  return uniqueEvents;
}`;

const replacement = `export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events,
    interactionType: interactions.type
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), inArray(interactions.type, ['SAVE', 'RSVP'])));

  const uniqueEvents = [];
  const seenIds = new Set();
  for (const row of result) {
    if (!seenIds.has(row.event.id)) {
      seenIds.add(row.event.id);
      uniqueEvents.push({ ...row.event, savedInteractionType: row.interactionType });
    }
  }

  return uniqueEvents;
}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/db/events.ts', content);
