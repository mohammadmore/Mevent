import { db } from './src/db/index.ts';
import { events } from './src/db/schema.ts';
import { isNull, eq } from 'drizzle-orm';

async function main() {
  await db.update(events).set({ ticketUrl: 'https://calendar.iranfair.com/fa' }).where(eq(events.source, 'CRAWLER'));
  console.log('Fixed DB');
  process.exit(0);
}
main();
