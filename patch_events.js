import fs from 'fs';
let content = fs.readFileSync('src/db/events.ts', 'utf8');

const oldGetSaved = `export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'SAVE')));
  
  return result.map(r => r.event);
}`;

const newGetSaved = `export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'SAVE')));
  
  const uniqueEvents = new Map();
  result.forEach(r => {
    uniqueEvents.set(r.event.id, r.event);
  });
  return Array.from(uniqueEvents.values());
}`;

content = content.replace(oldGetSaved, newGetSaved);

const oldGetRsvp = `export async function getRsvpEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'RSVP')));
  
  return result.map(r => r.event);
}`;

const newGetRsvp = `export async function getRsvpEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'RSVP')));
  
  const uniqueEvents = new Map();
  result.forEach(r => {
    uniqueEvents.set(r.event.id, r.event);
  });
  return Array.from(uniqueEvents.values());
}`;

content = content.replace(oldGetRsvp, newGetRsvp);

fs.writeFileSync('src/db/events.ts', content);
