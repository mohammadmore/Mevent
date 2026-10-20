import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const adminEventsApi = "app.get('/api/admin/events', async (req, res) => {";

const newSettingsApi = `
  // --- Admin Settings API ---
  app.get('/api/admin/settings', async (req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { settings } = await import('./src/db/schema.ts');
      
      const allSettings = await db.select().from(settings);
      
      // Default structure if empty
      const settingsObj = allSettings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      
      if (!settingsObj.event_categories) {
         settingsObj.event_categories = ['#ورزشی', '#فرهنگی', '#آموزشی', '#تفریحی'];
      }
      
      res.json({ data: settingsObj });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/admin/settings', async (req, res) => {
    try {
      const { key, value } = req.body;
      const { db } = await import('./src/db/index.ts');
      const { settings } = await import('./src/db/schema.ts');
      
      await db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() }
        });
        
      res.json({ success: true, message: 'Settings updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { db } = await import('./src/db/index.ts');
      const { settings } = await import('./src/db/schema.ts');
      const { eq } = await import('drizzle-orm');
      
      const setting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      
      if (setting.length > 0) {
        res.json({ data: setting[0].value });
      } else {
        // defaults
        if (key === 'event_categories') res.json({ data: ['#ورزشی', '#فرهنگی', '#آموزشی', '#تفریحی'] });
        else res.json({ data: null });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

`;

if (!content.includes('/api/admin/settings')) {
    content = content.replace(adminEventsApi, newSettingsApi + adminEventsApi);
    fs.writeFileSync('server.ts', content);
    console.log('Settings API added');
}

