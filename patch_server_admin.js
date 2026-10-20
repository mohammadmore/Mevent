import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const newRoutes = `
  // --- Admin API ---
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { users, events, tickets } = await import('./src/db/schema.ts');
      const { sql } = await import('drizzle-orm');
      
      const usersQuery = await db.select({ count: sql\`count(*)\` }).from(users);
      const eventsQuery = await db.select({ count: sql\`count(*)\` }).from(events);
      const ticketsQuery = await db.select({ count: sql\`count(*)\`, revenue: sql\`sum(amount)\` }).from(tickets);
      
      res.json({
        data: {
          totalUsers: Number(usersQuery[0]?.count || 0),
          totalEvents: Number(eventsQuery[0]?.count || 0),
          totalTickets: Number(ticketsQuery[0]?.count || 0),
          totalRevenue: Number(ticketsQuery[0]?.revenue || 0)
        }
      });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { users } = await import('./src/db/schema.ts');
      
      const allUsers = await db.select().from(users);
      res.json({ data: allUsers });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;
      const { db } = await import('./src/db/index.ts');
      const { users } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      if (!['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      await db.update(users).set({ role }).where(eq(users.id, userId));
      res.json({ success: true, message: 'نقش کاربر با موفقیت تغییر کرد' });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // Organizer API
`;

if (!content.includes('/api/admin/stats')) {
  content = content.replace('  // Organizer API', newRoutes);
  fs.writeFileSync('server.ts', content);
}
