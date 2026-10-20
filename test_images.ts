import 'dotenv/config';
import { db } from './src/db/index.ts';
import { events } from './src/db/schema.ts';

async function verifyImages() {
  const allEvents = await db.select().from(events);
  let withImg = 0;
  let withoutImg = 0;
  for (const ev of allEvents) {
    if (ev.imageUrl) withImg++;
    else withoutImg++;
  }
  console.log(`With image: ${withImg}, Without: ${withoutImg}`);
  process.exit(0);
}
verifyImages().catch(console.error);
