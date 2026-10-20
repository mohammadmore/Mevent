const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`app.post('/api/chains', async (req, res) => {
  try {
    const [newChain] = await db.insert(chains).values(req.body).returning();
    res.json(newChain);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});`, `app.post('/api/chains', async (req, res) => {
  try {
    const { eventIds, ...chainData } = req.body;
    const [newChain] = await db.insert(chains).values(chainData).returning();
    
    if (eventIds && eventIds.length > 0) {
      for (const eid of eventIds) {
        await db.update(events).set({ chainId: newChain.id }).where(eq(events.id, eid));
      }
    }
    
    res.json(newChain);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});`);

fs.writeFileSync('server.ts', code);
