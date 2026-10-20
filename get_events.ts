import { db } from './src/db/index.ts';
import { events } from './src/db/schema.ts';

async function main() {
  const allEvents = await db.select().from(events);
  console.log(JSON.stringify(allEvents.map(e => ({ id: e.id, title: e.title, source: e.source, ticketUrl: e.ticketUrl })), null, 2));
  process.exit(0);
}
main();
