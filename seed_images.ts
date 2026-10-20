import 'dotenv/config';
import { db } from './src/db/index.ts';
import { events } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function updateImages() {
  const allEvents = await db.select().from(events);
  
  for (let i = 0; i < allEvents.length; i++) {
    const ev = allEvents[i];
    // Give every even event an image, odd event no image
    if (i % 2 === 0) {
      await db.update(events).set({ imageUrl: `https://picsum.photos/seed/${ev.id}/800/600` }).where(eq(events.id, ev.id));
    } else {
      await db.update(events).set({ imageUrl: null }).where(eq(events.id, ev.id));
    }
  }
  console.log('Updated events images');
  process.exit(0);
}

updateImages().catch(console.error);
