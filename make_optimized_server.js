import fs from 'fs';

const optimizedServerCode = `import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import fs from 'fs';
import * as cheerio from 'cheerio';

// DB & Schemas
import { db } from './src/db/index';
import { users, events, interactions, tickets, hubs, settings } from './src/db/schema';
import { eq, gt, and, inArray, desc, sql } from 'drizzle-orm';
import {
  getRecommendedEvents,
  getNearbyEvents,
  createEvent,
  getSavedEvents,
  getRsvpEvents,
  getOrganizerEvents
} from './src/db/events';
import { createInteraction } from './src/db/interactions';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserPreferences
} from './src/db/users';
import {
  createTicket,
  getUserTickets
} from './src/db/tickets';
import {
  getHubs,
  getHub,
  createHub
} from './src/db/hubs';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'useful-scanner-9j4jh',
});

const upload = multer({ dest: 'public/uploads/' });

if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// In-Memory TTL Cache
interface CacheItem<T> {
  data: T;
  expiry: number;
}
const cacheStore = new Map<string, CacheItem<any>>();

function getFromCache<T>(key: string): T | null {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return item.data as T;
}

function setToCache<T>(key: string, data: T, ttlMs: number): void {
  cacheStore.set(key, { data, expiry: Date.now() + ttlMs });
}

function invalidateCachePattern(pattern: string): void {
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
}

let isCrawlerRunning = false;
let cachedEventsContext: { text: string; expiry: number } | null = null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // --- API Routes ---

  // Leaderboard
  app.get('/api/users/leaderboard', async (req, res) => {
    try {
      const cacheKey = 'leaderboard';
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const leaderboard = await db.select().from(users).orderBy(desc(users.points)).limit(10);
      setToCache(cacheKey, leaderboard, 10000);
      res.json({ data: leaderboard });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Award Points
  app.post('/api/users/:id/points', async (req, res) => {
    try {
      const firebaseUid = req.params.id;
      const points = req.body.points || 0;
      await db.update(users).set({ points: sql\`\${users.points} + \${points}\` }).where(eq(users.uid, firebaseUid));
      invalidateCachePattern('leaderboard');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update points' });
    }
  });

  // Simple Chatbot API
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

  // Auth Sync
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);

      const { name, email } = req.body;
      const user = await getOrCreateUser(decodedToken.uid, email, name || decodedToken.name);
      res.json({ data: user });
    } catch (err) {
      console.error('Auth sync error:', err);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Media Upload
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const newFilename = req.file.filename + ext;
    fs.renameSync(req.file.path, req.file.path + ext);

    res.json({ url: \`/uploads/\${newFilename}\` });
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'mevent-api' });
  });

  // Events API: Get recommendations based on time, location, and user habits
  app.get('/api/events/recommendations', async (req, res) => {
    try {
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

      const cacheKey = \`recommendations_\${lat || 0}_\${lng || 0}_\${userId || 0}\`;
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const allUpcomingEvents = await getRecommendedEvents(lat, lng);

      let recommended = allUpcomingEvents;

      if (userId) {
        const user = await getUserProfile(userId);
        if (user && user.preferences) {
          const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
          if (Array.isArray(prefs) && prefs.length > 0) {
            recommended.sort((a, b) => {
              const aTags = Array.isArray(a.tags) ? a.tags : [];
              const bTags = Array.isArray(b.tags) ? b.tags : [];
              const aMatch = aTags.filter(t => prefs.includes(t)).length;
              const bMatch = bTags.filter(t => prefs.includes(t)).length;
              return bMatch - aMatch;
            });
          }
        }
      }

      const formattedEvents = recommended.map(e => ({
        ...e,
        location: {
          address: e.address,
          lat: e.lat,
          lng: e.lng
        }
      }));

      setToCache(cacheKey, formattedEvents, 15000);
      res.json({ data: formattedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  // --- Admin API ---
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const cacheKey = 'admin_stats';
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const usersQuery = await db.select({ count: sql\`count(*)\` }).from(users);
      const eventsQuery = await db.select({ count: sql\`count(*)\` }).from(events);
      const ticketsQuery = await db.select({ count: sql\`count(*)\`, revenue: sql\`sum(amount)\` }).from(tickets);

      const statsData = {
        totalUsers: Number(usersQuery[0]?.count || 0),
        totalEvents: Number(eventsQuery[0]?.count || 0),
        totalTickets: Number(ticketsQuery[0]?.count || 0),
        totalRevenue: Number(ticketsQuery[0]?.revenue || 0)
      };

      setToCache(cacheKey, statsData, 10000);
      res.json({ data: statsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  // --- Admin Settings API ---
  app.get('/api/admin/settings', async (req, res) => {
    try {
      const allSettings = await db.select().from(settings);

      const settingsObj: Record<string, any> = allSettings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, any>);

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

      await db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() }
        });

      invalidateCachePattern('setting');
      res.json({ success: true, message: 'Settings updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const cacheKey = \`setting_\${key}\`;
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const setting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

      let val: any = null;
      if (setting.length > 0) {
        val = setting[0].value;
      } else {
        if (key === 'event_categories') val = ['#ورزشی', '#فرهنگی', '#آموزشی', '#تفریحی'];
      }

      setToCache(cacheKey, val, 60000);
      res.json({ data: val });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

  app.get('/api/admin/events', async (req, res) => {
    try {
      const allEvents = await db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        cost: events.cost,
        status: events.status,
        organizerId: events.organizerId,
        organizerName: users.name,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id));

      res.json({ data: allEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admin events' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json({ data: allUsers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;

      if (!['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      await db.update(users).set({ role }).where(eq(users.id, userId));
      res.json({ success: true, message: 'نقش کاربر با موفقیت تغییر کرد' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // --- Event Management APIs ---
  app.put('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const updatedData = { ...req.body };
      if (updatedData.startTime) updatedData.startTime = new Date(updatedData.startTime);
      if (updatedData.endTime) updatedData.endTime = new Date(updatedData.endTime);

      if (updatedData.location) {
        updatedData.address = updatedData.location.address;
        updatedData.lat = updatedData.location.lat;
        updatedData.lng = updatedData.location.lng;
        delete updatedData.location;
      }

      await db.update(events).set(updatedData).where(eq(events.id, eventId));
      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      cachedEventsContext = null;

      res.json({ success: true, message: 'رویداد با موفقیت ویرایش شد' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);

      await db.delete(interactions).where(eq(interactions.eventId, eventId));
      await db.delete(tickets).where(eq(tickets.eventId, eventId));
      await db.delete(events).where(eq(events.id, eventId));

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      cachedEventsContext = null;

      res.json({ success: true, message: 'رویداد با موفقیت حذف شد' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  app.put('/api/events/:id/status', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { status } = req.body;

      await db.update(events).set({ status }).where(eq(events.id, eventId));
      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      res.json({ success: true, message: 'وضعیت رویداد تغییر کرد' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update event status' });
    }
  });

  // Organizer API
  app.get('/api/organizer/events', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      if (!userId) return res.status(400).json({ error: 'User ID required' });
      const orgEvents = await getOrganizerEvents(userId);

      const formattedEvents = orgEvents.map(e => ({
        ...e,
        location: {
          address: e.address,
          lat: e.lat,
          lng: e.lng
        }
      }));
      res.json({ data: formattedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch organizer events' });
    }
  });

  app.get('/api/organizer/events/:id/stats', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);

      const eventTickets = await db.select().from(tickets).where(eq(tickets.eventId, eventId));
      const viewsQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'VIEW')));
      const savesQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'SAVE')));
      const rsvpsQuery = await db.select({ count: sql\`count(*)\` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));

      const revenue = eventTickets.reduce((acc, t) => acc + (t.amount || 0), 0);

      res.json({
        data: {
          ticketsSold: eventTickets.length,
          revenue: revenue,
          views: Number(viewsQuery[0]?.count || 0),
          saves: Number(savesQuery[0]?.count || 0),
          rsvps: Number(rsvpsQuery[0]?.count || 0)
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Event Creation (UGC - with AI Tagging)
  app.post('/api/events', async (req, res) => {
    try {
      const { title, description, startTime, endTime, location, cost, organizerId, imageUrl, hubId } = req.body;

      let generatedTags = req.body.tags || [];
      const newEvent = await createEvent({
        title,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        cost: cost || 0,
        tags: generatedTags,
        imageUrl,
        hubId,
        organizerId: organizerId || 1
      });

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      invalidateCachePattern('admin_stats');
      cachedEventsContext = null;

      res.status(201).json({ data: newEvent, message: 'رویداد با موفقیت ثبت شد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // Users API: Soft Onboarding
  app.post('/api/users/onboard', async (req, res) => {
    try {
      const { uid, email, name, location, preferences } = req.body;
      const user = await getOrCreateUser(uid, email, name);
      res.json({ message: 'خوش آمدید! پروفایل اولیه شما ساخته شد.', user, location, preferences });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to onboard user' });
    }
  });

  // Interactions: Silent Learning
  app.post('/api/interactions', async (req, res) => {
    try {
      const { userId, eventId, type, metadata } = req.body;
      const actualUserId = userId || 1;

      let interaction;
      if (type === 'SAVE') {
        const existing = await db.select().from(interactions).where(
          and(
            eq(interactions.userId, actualUserId),
            eq(interactions.eventId, parseInt(eventId, 10)),
            eq(interactions.type, 'SAVE')
          )
        );
        if (existing.length > 0) {
          await db.delete(interactions).where(
            and(
              eq(interactions.userId, actualUserId),
              eq(interactions.eventId, parseInt(eventId, 10)),
              eq(interactions.type, 'SAVE')
            )
          );
          return res.json({ success: true, action: 'unsaved' });
        } else {
          interaction = await createInteraction({
            userId: actualUserId,
            eventId: parseInt(eventId, 10),
            type,
            metadata
          });
        }
      } else {
        if (type === 'RSVP') {
          const existing = await db.select().from(interactions).where(
            and(
              eq(interactions.userId, actualUserId),
              eq(interactions.eventId, parseInt(eventId, 10)),
              eq(interactions.type, 'RSVP')
            )
          );
          if (existing.length > 0) {
            await db.delete(interactions).where(
              and(
                eq(interactions.userId, actualUserId),
                eq(interactions.eventId, parseInt(eventId, 10)),
                eq(interactions.type, 'RSVP')
              )
            );
            return res.json({ success: true, action: 'unrsvped' });
          }
        }
        interaction = await createInteraction({
          userId: actualUserId,
          eventId: parseInt(eventId, 10),
          type,
          metadata
        });
      }

      let pointsToAward = 0;
      if (type === 'RSVP') pointsToAward = 50;
      else if (type === 'SAVE') pointsToAward = 10;
      else if (type === 'VIEW') pointsToAward = 1;

      if (pointsToAward > 0) {
        await db.update(users)
          .set({ points: sql\`\${users.points} + \${pointsToAward}\` })
          .where(eq(users.id, actualUserId));
        invalidateCachePattern('leaderboard');
      }

      res.status(201).json({ message: 'تعامل ثبت شد و به موتور هوش مصنوعی ارسال گردید.', data: interaction, pointsAwarded: pointsToAward });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  // Saved Events API
  app.get('/api/users/:id/saved', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const savedEvents = await getSavedEvents(userId);
      res.json({ data: savedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch saved events' });
    }
  });

  // RSVP Events API
  app.get('/api/users/:id/rsvped', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const rsvpEvents = await getRsvpEvents(userId);
      res.json({ data: rsvpEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch rsvp events' });
    }
  });

  // Profile API
  app.get('/api/users/:id/profile', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await getUserProfile(userId);
      res.json({ data: user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // AI Assistant Chat API
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;

      if (!cachedEventsContext || Date.now() > cachedEventsContext.expiry) {
        const allUpcomingEvents = await getRecommendedEvents();
        const textContext = allUpcomingEvents.map(e =>
          \`- \${e.title} (ID: \${e.id}): \${e.description}. Tags: \${e.tags}. Cost: \${e.cost}. Time: \${e.startTime}\`
        ).join('\\n');
        cachedEventsContext = { text: textContext, expiry: Date.now() + 60000 };
      }

      const prompt = \`You are the Mevent AI Assistant, a friendly and helpful event discovery guide for Persian speakers.Respond in Persian.A user is asking: "\${message}"Here are the currently available upcoming events in the system:\${cachedEventsContext.text}Based ONLY on these events, recommend the best ones or answer the user's question. If there are no matching events, politely let them know. Be concise and conversational.\`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });
      res.json({ reply: aiResponse.text });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to chat with AI' });
    }
  });

  // Update Preferences API
  app.put('/api/users/:id/preferences', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { preferences } = req.body;
      const updatedUser = await updateUserPreferences(userId, preferences);
      res.json({ message: 'علایق شما با موفقیت ذخیره شد.', data: updatedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Ticketing & Payments API
  app.post('/api/tickets/buy', async (req, res) => {
    try {
      const { userId, eventId, amount, plusOne } = req.body;
      const paymentId = \`pay_\${Math.random().toString(36).substring(7)}\`;

      const ticket1 = await createTicket({
        userId: parseInt(userId, 10),
        eventId: parseInt(eventId, 10),
        amount: plusOne ? Math.floor(parseInt(amount, 10) / 2) : parseInt(amount, 10),
        paymentStatus: 'PAID',
        paymentId: paymentId + '-1'
      });

      if (plusOne) {
        await createTicket({
          userId: parseInt(userId, 10),
          eventId: parseInt(eventId, 10),
          amount: Math.floor(parseInt(amount, 10) / 2),
          paymentStatus: 'PAID',
          paymentId: paymentId + '-2'
        });
      }

      invalidateCachePattern('admin_stats');
      res.json({ message: plusOne ? 'بلیت‌ها با موفقیت خریداری شدند.' : 'بلیت با موفقیت خریداری شد.', data: ticket1 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to buy ticket' });
    }
  });

  app.get('/api/users/:id/tickets', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const ticketsData = await getUserTickets(userId);
      res.json({ data: ticketsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // Location-based Events API
  app.get('/api/events/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      const userLat = lat ? parseFloat(lat as string) : undefined;
      const userLng = lng ? parseFloat(lng as string) : undefined;
      const rad = radius ? parseFloat(radius as string) : 10;

      const cacheKey = \`nearby_\${userLat || 0}_\${userLng || 0}_\${rad}\`;
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const eventsData = await getNearbyEvents(userLat, userLng, rad);

      setToCache(cacheKey, eventsData, 15000);
      res.json({ data: eventsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch nearby events' });
    }
  });

  // Crawler API with lock
  app.post('/api/crawler/run', async (req, res) => {
    if (isCrawlerRunning) {
      return res.status(429).json({ error: 'فرآیند خزشگر در حال اجرا است، لطفاً کمی صبر کنید.' });
    }

    try {
      isCrawlerRunning = true;
      const { url } = req.body;
      let targetUrl = url || 'https://calendar.iranfair.com/fa';

      if (targetUrl === 'https://iranfair.com' || targetUrl === 'https://www.iranfair.com' || targetUrl === 'https://iranfair.com/') {
        targetUrl = 'https://calendar.iranfair.com/fa';
      }

      const fetchRes = await fetch(targetUrl);
      const html = await fetchRes.text();
      const $ = cheerio.load(html);

      let textContext = $('.container').text();
      if (!textContext || textContext.trim().length < 100) {
        textContext = $('body').text();
      }
      textContext = textContext.replace(/\\s+/g, ' ').substring(0, 15000);

      const prompt = \`Extract upcoming or current events (نمایشگاه ها) from the following text (Tehran International Exhibition Calendar). The current year is 2026 (1405 in Persian calendar). Translate the title and description to Persian if needed. Return a JSON object with an 'events' array containing up to 10 events: title, description (extract the organizer/مجری and dates), startTime (convert Persian dates to approximate ISO string for future dates in 2026/2027 so they are strictly in the future), address (Tehran International Exhibition Center), lat (35.794), lng (51.401), cost (0). \\n\\nText Context: \${textContext}\`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    address: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    cost: { type: Type.NUMBER },
                    ticketUrl: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(aiResponse.text || "{}");
      const fetchedEvents = data.events || [];

      const newEvents = [];
      for (const eventData of fetchedEvents) {
        if (!eventData.title || eventData.title.includes('خبر') || eventData.title.includes('نشست')) continue;
        const newEvent = await createEvent({
          ...eventData,
          ticketUrl: eventData.ticketUrl || targetUrl,
          startTime: new Date(eventData.startTime || new Date()),
          source: 'CRAWLER',
          tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
          organizerId: 1
        });
        newEvents.push(newEvent);
      }

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      invalidateCachePattern('admin_stats');
      cachedEventsContext = null;

      if (newEvents.length === 0) {
        res.json({ message: \`خزشگر در صفحه \${targetUrl} نمایشگاهی پیدا نکرد.\`, data: [] });
      } else {
        res.json({ message: \`خزشگر با موفقیت \${newEvents.length} نمایشگاه را استخراج و اضافه کرد.\`, data: newEvents });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Crawler failed' });
    } finally {
      isCrawlerRunning = false;
    }
  });

  // Hubs API
  app.get('/api/hubs', async (req, res) => {
    try {
      const cacheKey = 'hubs_list';
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const allHubs = await getHubs();
      setToCache(cacheKey, allHubs, 30000);
      res.json({ data: allHubs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch hubs' });
    }
  });

  app.get('/api/hubs/:id', async (req, res) => {
    try {
      const hub = await getHub(parseInt(req.params.id, 10));
      if (!hub) return res.status(404).json({ error: 'Hub not found' });
      res.json({ data: hub });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch hub' });
    }
  });

  app.post('/api/hubs', async (req, res) => {
    try {
      const { name, description, type, ownerId, imageUrl } = req.body;
      const hub = await createHub({ name, description, type, ownerId, imageUrl });
      invalidateCachePattern('hubs_list');
      res.json({ data: hub });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create hub' });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', optimizedServerCode);
console.log('Optimized server.ts created successfully!');
