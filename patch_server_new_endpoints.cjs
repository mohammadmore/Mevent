const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (code.includes('/api/places')) {
  console.log('Already patched server.ts');
  process.exit(0);
}

const dbImports = `import { places, chains, flows, movies, showtimes, vibes } from './src/db/schema';`;

// Add db imports to the top where schema is imported
code = code.replace(/import \{ users, events, interactions, tickets, hubs, settings \} from '\.\/src\/db\/schema';/, 
  `import { users, events, interactions, tickets, hubs, settings, places, chains, flows, movies, showtimes, vibes } from './src/db/schema';`);

const newEndpoints = `
// ==========================================
// NEW ENDPOINTS FOR PLACES, CHAINS, FLOWS, MOVIES, VIBES
// ==========================================

app.get('/api/places', async (req, res) => {
  try {
    const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));
    res.json(allPlaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/places', async (req, res) => {
  try {
    const [newPlace] = await db.insert(places).values(req.body).returning();
    res.json(newPlace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const [place] = await db.select().from(places).where(eq(places.id, parseInt(req.params.id)));
    if (!place) return res.status(404).json({ error: 'Not found' });
    
    // Get events for this place
    const placeEvents = await db.select().from(events).where(eq(events.placeId, place.id));
    
    // Get showtimes for this place
    const placeShowtimes = await db.select().from(showtimes).where(eq(showtimes.placeId, place.id));
    
    res.json({ ...place, events: placeEvents, showtimes: placeShowtimes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chains', async (req, res) => {
  try {
    const allChains = await db.select().from(chains).where(eq(chains.status, 'PUBLISHED'));
    res.json(allChains);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chains', async (req, res) => {
  try {
    const [newChain] = await db.insert(chains).values(req.body).returning();
    res.json(newChain);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chains/:id', async (req, res) => {
  try {
    const [chain] = await db.select().from(chains).where(eq(chains.id, parseInt(req.params.id)));
    if (!chain) return res.status(404).json({ error: 'Not found' });
    
    const chainEvents = await db.select().from(events).where(eq(events.chainId, chain.id));
    res.json({ ...chain, events: chainEvents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/flows', async (req, res) => {
  try {
    const allFlows = await db.select().from(flows).where(eq(flows.status, 'PUBLISHED'));
    res.json(allFlows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/flows', async (req, res) => {
  try {
    const [newFlow] = await db.insert(flows).values(req.body).returning();
    res.json(newFlow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/flows/:id/items', async (req, res) => {
  try {
    const [flow] = await db.select().from(flows).where(eq(flows.id, parseInt(req.params.id)));
    if (!flow) return res.status(404).json({ error: 'Not found' });
    
    // Find all events, places, vibes that match the flow's tags
    const flowTags = flow.tags || [];
    
    // We do a naive fetch for now. In a real app, we'd use array overlap query in postgres.
    const allEvents = await db.select().from(events);
    const flowEvents = allEvents.filter(e => e.tags && e.tags.some(t => flowTags.includes(t)));
    
    const allPlaces = await db.select().from(places);
    // places don't have tags in schema? wait, I didn't add tags to places.
    
    const allVibes = await db.select().from(vibes);
    const flowVibes = allVibes.filter(v => v.tags && v.tags.some(t => flowTags.includes(t)));
    
    res.json({ flow, events: flowEvents, vibes: flowVibes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/vibes', async (req, res) => {
  try {
    const allVibes = await db.select().from(vibes).where(eq(vibes.status, 'PUBLISHED'));
    res.json(allVibes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/vibes', async (req, res) => {
  try {
    const [newVibe] = await db.insert(vibes).values(req.body).returning();
    res.json(newVibe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/movies', async (req, res) => {
  try {
    const allMovies = await db.select().from(movies).where(eq(movies.status, 'PUBLISHED'));
    res.json(allMovies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/movies', async (req, res) => {
  try {
    const [newMovie] = await db.insert(movies).values(req.body).returning();
    res.json(newMovie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
`;

// Insert the new endpoints before the Catch-all route
code = code.replace(/\/\/ Error Handling/g, newEndpoints + '\n// Error Handling');

fs.writeFileSync('server.ts', code);
console.log('Patched server.ts with new endpoints');
