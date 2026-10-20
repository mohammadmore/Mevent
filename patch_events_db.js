import fs from 'fs';
let content = fs.readFileSync('src/db/events.ts', 'utf8');

const additions = `
export async function getOrganizerEvents(organizerId: number) {
  return await db.select().from(events).where(eq(events.organizerId, organizerId));
}
`;
if (!content.includes('getOrganizerEvents')) {
  fs.appendFileSync('src/db/events.ts', additions);
}
