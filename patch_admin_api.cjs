const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  app.get('/api/admin/events', async (req, res) => {`;

const newRoutes = `
  // Admin routes for places
  app.get('/api/admin/places', async (req, res) => {
    try {
      const allPlaces = await db.select().from(places);
      res.json(allPlaces);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch places' });
    }
  });

  app.put('/api/admin/places/:id', async (req, res) => {
    try {
      const placeId = parseInt(req.params.id, 10);
      const data = req.body;
      const updated = await db.update(places).set(data).where(eq(places.id, placeId)).returning();
      res.json(updated[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update place' });
    }
  });

  // Admin routes for chains
  app.get('/api/admin/chains', async (req, res) => {
    try {
      const allChains = await db.select().from(chains);
      res.json(allChains);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch chains' });
    }
  });

  app.put('/api/admin/chains/:id', async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      const data = req.body;
      const updated = await db.update(chains).set(data).where(eq(chains.id, chainId)).returning();
      res.json(updated[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update chain' });
    }
  });

  // Admin routes for vibes
  app.get('/api/admin/vibes', async (req, res) => {
    try {
      const allVibes = await db.select().from(vibes);
      res.json(allVibes);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch vibes' });
    }
  });

  app.put('/api/admin/vibes/:id', async (req, res) => {
    try {
      const vibeId = parseInt(req.params.id, 10);
      const data = req.body;
      const updated = await db.update(vibes).set(data).where(eq(vibes.id, vibeId)).returning();
      res.json(updated[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update vibe' });
    }
  });

  // Admin routes for flows
  app.get('/api/admin/flows', async (req, res) => {
    try {
      const allFlows = await db.select().from(flows);
      res.json(allFlows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch flows' });
    }
  });

  app.put('/api/admin/flows/:id', async (req, res) => {
    try {
      const flowId = parseInt(req.params.id, 10);
      const data = req.body;
      const updated = await db.update(flows).set(data).where(eq(flows.id, flowId)).returning();
      res.json(updated[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update flow' });
    }
  });

`;

code = code.replace(target, newRoutes + target);
fs.writeFileSync('server.ts', code);
