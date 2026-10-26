import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { events, places } from '../db/schema.ts';
import { normalizeSearchText, upcomingCondition } from '../db/events.ts';
import { getFromCache, setToCache } from '../lib/sharedStore.ts';

// "Did you mean": typo-tolerant search without an external service. Words of the query that do
// not exist in any event title, tag or place name are replaced with the closest word that does.

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const words = (text: string) => normalizeSearchText(text.replace(/[#_،,.:؛!?«»()"'\-]/g, ' ')).split(' ').filter(w => w.length >= 2);

/** Words people can find (upcoming events and published places), counted by how often they appear. */
async function vocabulary(): Promise<Map<string, number>> {
  const cached = await getFromCache('search_vocabulary');
  if (cached) return new Map(cached as [string, number][]);
  const vocab = new Map<string, number>();
  const add = (text: unknown) => { for (const w of words(String(text ?? ''))) vocab.set(w, (vocab.get(w) || 0) + 1); };
  const evs = await db.select({ title: events.title, tags: events.tags, city: events.city }).from(events).where(upcomingCondition()).limit(3000);
  for (const e of evs) { add(e.title); add(Array.isArray(e.tags) ? e.tags.join(' ') : ''); add(e.city); }
  const pls = await db.select({ name: places.name, city: places.city }).from(places).where(and(eq(places.status, 'PUBLISHED'))).limit(3000);
  for (const p of pls) { add(p.name); add(p.city); }
  await setToCache('search_vocabulary', [...vocab.entries()], 10 * 60_000);
  return vocab;
}

/** The query with misspelled words fixed, or null when nothing needed (or could be) fixed. */
export async function correctQuery(q: string): Promise<string | null> {
  const terms = words(q).slice(0, 6);
  if (!terms.length) return null;
  const vocab = await vocabulary();
  let changed = false;
  const fixed = terms.map(term => {
    if (vocab.has(term) || term.length < 3) return term;
    const max = term.length >= 6 ? 2 : 1;
    let best: string | null = null, bestD = max + 1, bestN = 0;
    for (const [w, n] of vocab) {
      // A word that starts with the term is what people meant while typing ("کنس" → "کنسرت").
      const d = w.startsWith(term) ? 0.5 : editDistance(term, w, max);
      if (d < bestD || (d === bestD && n > bestN)) { best = w; bestD = d; bestN = n; }
    }
    if (best && bestD <= max) { changed = true; return best; }
    return term;
  });
  return changed ? fixed.join(' ') : null;
}
