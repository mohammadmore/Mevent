import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const insertPoint = `  // --- API Routes ---`;
const apisToInsert = `  // --- API Routes ---

  app.get('/api/users/leaderboard', async (req, res) => {
    try {
      const { users } = await import('./src/db/schema.ts');
      const { db } = await import('./src/db/index.ts');
      const { desc } = await import('drizzle-orm');
      const leaderboard = await db.select().from(users).orderBy(desc(users.points)).limit(10);
      res.json({ data: leaderboard });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.post('/api/users/:id/points', async (req, res) => {
    try {
      const { users } = await import('./src/db/schema.ts');
      const { db } = await import('./src/db/index.ts');
      const { eq, sql } = await import('drizzle-orm');
      const firebaseUid = req.params.id;
      const points = req.body.points || 0;
      await db.update(users).set({ points: sql\`\${users.points} + \${points}\` }).where(eq(users.firebaseUid, firebaseUid));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update points' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const userMsg = req.body.message;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: \`تو یک دستیار رویداد یاب به نام Mevent هستی. کاربر می پرسد: \${userMsg}\`,
      });
      res.json({ reply: aiResponse.text });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'AI request failed' });
    }
  });
`;

content = content.replace(insertPoint, apisToInsert);
fs.writeFileSync('server.ts', content);
