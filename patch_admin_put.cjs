const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const chainsRegex = /app\.put\('\/api\/admin\/chains\/:id', async \(req, res\) => \{[\s\S]*?\}\);/g;
const chainsNew = `app.put('/api/admin/chains/:id', async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      const data = req.body;
      const payload = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.coverImage !== undefined) payload.coverImage = data.coverImage;
      if (data.status !== undefined) payload.status = data.status;
      if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags;
      
      const updated = await db.update(chains).set(payload).where(eq(chains.id, chainId)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update chain' });
    }
  });`;
code = code.replace(chainsRegex, chainsNew);

const vibesRegex = /app\.put\('\/api\/admin\/vibes\/:id', async \(req, res\) => \{[\s\S]*?\}\);/g;
const vibesNew = `app.put('/api/admin/vibes/:id', async (req, res) => {
    try {
      const vibeId = parseInt(req.params.id, 10);
      const data = req.body;
      const payload = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.areaName !== undefined) payload.areaName = data.areaName;
      if (data.bestTimeToExperience !== undefined) payload.bestTimeToExperience = data.bestTimeToExperience;
      if (data.imageUrls !== undefined) payload.imageUrls = Array.isArray(data.imageUrls) ? JSON.stringify(data.imageUrls) : data.imageUrls;
      if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags;
      
      const updated = await db.update(vibes).set(payload).where(eq(vibes.id, vibeId)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update vibe' });
    }
  });`;
code = code.replace(vibesRegex, vibesNew);

const flowsRegex = /app\.put\('\/api\/admin\/flows\/:id', async \(req, res\) => \{[\s\S]*?\}\);/g;
const flowsNew = `app.put('/api/admin/flows/:id', async (req, res) => {
    try {
      const flowId = parseInt(req.params.id, 10);
      const data = req.body;
      const payload = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.coverImage !== undefined) payload.coverImage = data.coverImage;
      if (data.status !== undefined) payload.status = data.status;
      if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags;
      
      const updated = await db.update(flows).set(payload).where(eq(flows.id, flowId)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update flow' });
    }
  });`;
code = code.replace(flowsRegex, flowsNew);

fs.writeFileSync('server.ts', code);
console.log('Admin PUT routes patched');
