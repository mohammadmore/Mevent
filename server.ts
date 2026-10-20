import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';

import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import fs from 'fs';
import * as cheerio from 'cheerio';

// DB & Schemas
import { db, createPool } from './src/db/index';
import { users, events, interactions, tickets, hubs, settings, places, chains, flows, movies, showtimes, vibes } from './src/db/schema';
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

function normalizePersianText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ئ/g, 'ی')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

if (!fs.existsSync('public/uploads')) {
  fs.mkdirSync('public/uploads', { recursive: true });
}

// Initialize Gemini AI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function callGeminiWithFallback(params: any, retries = 2) {
  const modelsToTry = [
    params.model || "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;

  for (const model of uniqueModels) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini call failed for model ${model} (attempt ${attempt + 1}):`, err?.message || err);
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
  }

  throw lastError;
}

// ==========================================
// 1. RATE LIMITING MIDDLEWARE (Anti-Abuse)
// ==========================================
interface RateLimitWindow {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitWindow>();

function createRateLimiter(maxRequests: number, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
    const routeKey = `${req.baseUrl}${req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(routeKey) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    rateLimitMap.set(routeKey, record);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفا چند ثانیه صبر کنید.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };
}

// ==========================================
// 2. METRICS & PERFORMANCE MONITORING
// ==========================================
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  aiRequestsCount: 0,
  totalLatencyMs: 0,
  startTime: Date.now(),
};

function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  metrics.totalRequests++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.totalLatencyMs += duration;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }
  });

  next();
}

// ==========================================
// 3. CIRCUIT BREAKER FOR GEMINI AI
// ==========================================
class CircuitBreaker {
  private failureCount = 0;
  private threshold = 3;
  private state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
  private lastStateChange = Date.now();
  private cooldownMs = 30000;

  async execute<T>(action: () => Promise<T>, fallbackAction: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now - this.lastStateChange > this.cooldownMs) {
        this.state = 'HALF-OPEN';
        this.lastStateChange = now;
      } else {
        console.warn('Circuit breaker OPEN, executing fallback response');
        return fallbackAction();
      }
    }

    try {
      metrics.aiRequestsCount++;
      const result = await action();
      if (this.state === 'HALF-OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      console.error(`AI Call Failure (${this.failureCount}/${this.threshold}):`, err);

      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.lastStateChange = Date.now();
        console.warn('Circuit breaker tripped to OPEN state');
      }

      return fallbackAction();
    }
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failureCount,
      lastChange: new Date(this.lastStateChange).toISOString()
    };
  }
}

const aiCircuitBreaker = new CircuitBreaker();

// ==========================================
// 4. IN-MEMORY TTL CACHE WITH METRICS
// ==========================================
interface CacheItem<T> {
  data: T;
  expiry: number;
}
const cacheStore = new Map<string, CacheItem<any>>();
const cacheStats = { hits: 0, misses: 0, evictions: 0 };

function getFromCache<T>(key: string): T | null {
  const item = cacheStore.get(key);
  if (!item) {
    cacheStats.misses++;
    return null;
  }
  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    cacheStats.evictions++;
    cacheStats.misses++;
    return null;
  }
  cacheStats.hits++;
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

// ==========================================
// 5. ASYNC BACKGROUND JOB QUEUE
// ==========================================
interface BackgroundJob {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
}

const jobStore = new Map<string, BackgroundJob>();

function createJob(type: string): BackgroundJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const job: BackgroundJob = {
    id,
    type,
    status: 'PENDING',
    progress: 0,
    createdAt: new Date().toISOString()
  };
  jobStore.set(id, job);
  return job;
}

// ==========================================
// 6. INPUT SANITIZATION & VALIDATION
// ==========================================
function validateInput(req: Request, res: Response, next: NextFunction) {
  if (req.query.lat) {
    const lat = parseFloat(req.query.lat as string);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: 'مختصات عرض جغرافیایی (lat) نامعتبر است.' });
    }
  }
  if (req.query.lng) {
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'مختصات طول جغرافیایی (lng) نامعتبر است.' });
    }
  }
  next();
}

let cachedEventsContext: { text: string; expiry: number } | null = null;

async function startServer() {
  const app = express();
  const PORT = 3000;
  // System Stability & Security Middlewares
  

  app.use(compression());
  app.use(cors());
  app.use(morgan('combined', {
    skip: (req) => req.path.startsWith('/api/health') || req.path.startsWith('/@vite')
  }));




  app.use(metricsMiddleware);
  app.use(express.json({ limit: '5mb' })); 
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // Apply default rate limiting to API routes
  const defaultLimiter = createRateLimiter(120, 60000);
  const strictLimiter = createRateLimiter(20, 60000);
  const chatLimiter = createRateLimiter(15, 60000);

  app.use('/api', defaultLimiter);
  app.use('/api', validateInput);

  // --- HEALTH & METRICS ENDPOINT ---
  app.get('/api/health/metrics', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
      metrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        aiRequestsCount: metrics.aiRequestsCount,
        averageLatencyMs: metrics.totalRequests > 0 ? Math.round(metrics.totalLatencyMs / metrics.totalRequests) : 0
      },
      cache: {
        activeKeys: cacheStore.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRateRatio: cacheStats.hits + cacheStats.misses > 0 ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)).toFixed(2) : 0
      },
      circuitBreaker: aiCircuitBreaker.getStats(),
      memoryUsage: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
      }
    });
  });

  // Leaderboard API
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
      res.status(500).json({ error: 'خطا در دریافت لیست امتیازات' });
    }
  });

  // Award Points API
  app.post('/api/users/:id/points', async (req, res) => {
    try {
      const firebaseUid = req.params.id;
      const points = req.body.points || 0;
      await db.update(users).set({ points: sql`${users.points} + ${points}` }).where(eq(users.uid, firebaseUid));
      invalidateCachePattern('leaderboard');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در به روزرسانی امتیازات' });
    }
  });

  // Auth Sync API
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'اعتبارسنجی نا‌موفق بود' });
      }
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(token);

      const { name, email } = req.body;
      const user = await getOrCreateUser(decodedToken.uid, email, name || decodedToken.name);
      res.json({ data: user });
    } catch (err) {
      console.error('Auth sync error:', err);
      res.status(401).json({ error: 'توکن نامعتبر است' });
    }
  });

  // Media Upload
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'فایلی آپلود نشده است' });
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const newFilename = req.file.filename + ext;
    fs.renameSync(req.file.path, req.file.path + ext);

    res.json({ url: `/uploads/${newFilename}` });
  });

  // Events API: Recommendations with Cache
  app.get('/api/events/recommendations', async (req, res) => {
    try {
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

      const cacheKey = `recommendations_${lat || 0}_${lng || 0}_${userId || 0}`;
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

      const orgIds = [...new Set(recommended.map(e => e.organizerId))];
      const organizers = orgIds.length ? await db.select().from(users).where(inArray(users.id, orgIds)) : [];
      const orgMap = Object.fromEntries(organizers.map(o => [o.id, o]));
      const formattedEvents = recommended.map(e => ({
        ...e,
        location: {
          address: e.address,
          lat: e.lat,
          lng: e.lng
        },
        organizer: orgMap[e.organizerId] || null
      }));
      setToCache(cacheKey, formattedEvents, 15000);
      res.json({ data: formattedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'دریافت پیشنهادها با خطا مواجه شد' });
    }
  });

  // --- ADMIN CACHE MANAGEMENT API ---
  app.get('/api/admin/cache', (req, res) => {
    const keys = Array.from(cacheStore.keys()).map(k => ({
      key: k,
      expiresInSec: Math.max(0, Math.floor((cacheStore.get(k)!.expiry - Date.now()) / 1000))

    }));
    res.json({ data: { stats: cacheStats, activeKeys: keys } });
  });

  app.delete('/api/admin/cache', (req, res) => {
    cacheStore.clear();
    cacheStats.evictions += cacheStore.size;
    res.json({ success: true, message: 'کش سیستم با موفقیت پاکسازی شد.' });
  });

  // Admin Stats
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const cacheKey = 'admin_stats';
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const usersQuery = await db.select({ count: sql`count(*)` }).from(users);
      const eventsQuery = await db.select({ count: sql`count(*)` }).from(events);
      const ticketsQuery = await db.select({ count: sql`count(*)`, revenue: sql`sum(amount)` }).from(tickets);

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
      res.status(500).json({ error: 'خطا در دریافت آمار مدیریت' });
    }
  });

  // Admin Settings API
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
      res.status(500).json({ error: 'خطا در دریافت تنظیمات' });
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
      res.json({ success: true, message: 'تنظیمات با موفقیت به روز شد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در ذخیره تنظیمات' });
    }
  });

  // Admin Events & Users

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
      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.type !== undefined) payload.type = data.type;
      if (data.address !== undefined) payload.address = data.address;
      if (data.lat !== undefined) payload.lat = data.lat;
      if (data.lng !== undefined) payload.lng = data.lng;
      if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl;
      if (data.status !== undefined) payload.status = data.status;
      if (data.galleryUrls !== undefined) payload.galleryUrls = Array.isArray(data.galleryUrls) ? JSON.stringify(data.galleryUrls) : data.galleryUrls;
      
      if (data.advancedDetails) {
        if (data.advancedDetails.regularTimeSlots) payload.workingHours = JSON.stringify(data.advancedDetails.regularTimeSlots);
        if (data.advancedDetails.regularHolidays) payload.holidays = JSON.stringify(data.advancedDetails.regularHolidays);
        if (data.advancedDetails.features) payload.amenities = JSON.stringify(data.advancedDetails.features);
      }
      
      const updated = await db.update(places).set(payload).where(eq(places.id, placeId)).returning();
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update place' });
    }
  });
  
  app.post('/api/admin/places', async (req, res) => {
    try {
      const data = req.body;
      const payload: any = {
        name: data.name || 'پاتوق جدید',
        city: data.city || 'تهران',
        description: data.description || '',
        type: data.type || 'CAFE',
        address: data.address || '',
        lat: data.lat || null,
        lng: data.lng || null,
        imageUrl: data.imageUrl || '',
        status: data.status || 'PUBLISHED',
      };
      
      if (data.advancedDetails) {
        if (data.advancedDetails.regularTimeSlots) payload.workingHours = JSON.stringify(data.advancedDetails.regularTimeSlots);
        if (data.advancedDetails.regularHolidays) payload.holidays = JSON.stringify(data.advancedDetails.regularHolidays);
        if (data.advancedDetails.features) payload.amenities = JSON.stringify(data.advancedDetails.features);
      }
      const inserted = await db.insert(places).values(payload).returning();
      res.json(inserted[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create place' });
    }
  });
  
  app.post('/api/places', async (req, res) => {
    try {
      const data = req.body;
      const payload: any = {
        name: data.name || 'پاتوق جدید',
        description: data.description || '',
        type: data.type || 'CAFE',
        address: data.address || '',
        lat: data.lat || null,
        lng: data.lng || null,
        imageUrl: data.imageUrl || '',
        status: data.status || 'PUBLISHED',
      };
      
      if (data.advancedDetails) {
        if (data.advancedDetails.regularTimeSlots) payload.workingHours = JSON.stringify(data.advancedDetails.regularTimeSlots);
        if (data.advancedDetails.regularHolidays) payload.holidays = JSON.stringify(data.advancedDetails.regularHolidays);
        if (data.advancedDetails.features) payload.amenities = JSON.stringify(data.advancedDetails.features);
      }
      const inserted = await db.insert(places).values(payload).returning();
      res.json(inserted[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create place' });
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
      const payload: any = {};
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
      const payload: any = {};
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
      const payload: any = {};
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
  });

  app.get('/api/admin/events', async (req, res) => {
    try {
      const allEvents = await db.select({ event: events, organizerName: users.name }).from(events).leftJoin(users, eq(events.organizerId, users.id)).orderBy(desc(events.createdAt)).limit(100);
      const formattedEvents = allEvents.map(row => ({ ...row.event, organizerName: row.organizerName }));

      res.json({ data: formattedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت رویدادهای مدیریت' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
      res.json({ data: allUsers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
  });

  app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;
      if (!['USER', 'ORGANIZER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'نقش وارد شده نامعتبر است' });
      }
      await db.update(users).set({ role }).where(eq(users.id, userId));
      res.json({ success: true, message: 'نقش کاربر با موفقیت تغییر کرد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در تغییر نقش کاربر' });
    }
  });

  // Nearby Places for Event
  app.get('/api/events/:id/nearby-places', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const eventData = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
      if (!eventData.length) return res.json({ data: [] });
      const event = eventData[0];
      
      // if (!event.lat || !event.lng) return res.json({ data: [] });
      
      const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));
      
      const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a));
      };

      const nearbyPlaces = allPlaces
        .filter(p => p.city === event.city)
        .filter(p => !event.lat || !event.lng ? true : (p.lat && p.lng))
        .map(p => ({
          ...p,
          distance: (!event.lat || !event.lng || !p.lat || !p.lng) ? 0 : distance(event.lat, event.lng, p.lat, p.lng)
        }))
        .filter(p => p.distance <= 10) // within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);

      res.json({ data: nearbyPlaces });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch nearby places' });
    }
  });

  // Similar Events
  app.get('/api/events/:id/similar', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const allUpcoming = await getRecommendedEvents(); // Gets all upcoming events
      
      const currentEvent = allUpcoming.find(e => e.id === eventId);
      if (!currentEvent) {
        return res.json({ data: [] });
      }

      // Filter out the current event itself and past events
      const now = new Date();
      const candidates = allUpcoming.filter(e => {
        if (e.id === eventId) return false;
        if (!e.startTime) return false;
        if (new Date(e.startTime) < now) return false;
        return true;
      });

      // Calculate similarity
      
      const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a));
      };

      const candidatesInSameCity = candidates.filter(e => e.city === currentEvent.city);

      const scored = candidatesInSameCity.map(e => {
        let score = 0;
        
        // Tags overlap
        const currentTags = (currentEvent.tags as string[]) || [];
        const eTags = (e.tags as string[]) || [];
        const commonTags = currentTags.filter((t: string) => eTags.includes(t));
        score += commonTags.length * 2;
        
        // Same organizer
        if (e.organizerId === currentEvent.organizerId && e.organizerId !== null) score += 3;
        
        // Same hub
        if (e.hubId === currentEvent.hubId && e.hubId !== null) score += 2;

        return { event: e, score };
      });

      // Sort by score descending and take top 4
      scored.sort((a, b) => b.score - a.score);
      
      const similar = scored.slice(0, 4).map(s => s.event);
      res.json({ data: similar });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch similar events' });
    }
  });

  // Event Edit / Delete
  app.put('/api/events/:id', strictLimiter, async (req, res) => {
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

      res.json({ success: true, message: 'رویداد با موفقیت ویرایش شد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ویرایش رویداد با خطا مواجه شد' });
    }
  });

  app.delete('/api/events/:id', strictLimiter, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      await db.delete(interactions).where(eq(interactions.eventId, eventId));
      await db.delete(tickets).where(eq(tickets.eventId, eventId));
      await db.delete(events).where(eq(events.id, eventId));

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      cachedEventsContext = null;

      res.json({ success: true, message: 'رویداد با موفقیت حذف شد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حذف رویداد با خطا مواجه شد' });
    }
  });

  // OPTIMISTIC LOCKING & CAPACITY ENFORCEMENT FOR TICKETS
  app.post('/api/tickets/buy', strictLimiter, async (req, res) => {
    try {
      const { userId, eventId, amount, plusOne } = req.body;
      const parsedEventId = parseInt(eventId, 10);
      const parsedUserId = parseInt(userId, 10);
      const ticketsToBuyCount = plusOne ? 2 : 1;

      // Check event capacity
      const eventData = await db.select().from(events).where(eq(events.id, parsedEventId)).limit(1);
      if (eventData.length === 0) {
        return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
      }

      const event = eventData[0];
      const existingTicketsQuery = await db.select({ count: sql`count(*)` })
        .from(tickets)
        .where(eq(tickets.eventId, parsedEventId));

      const ticketsSold = Number(existingTicketsQuery[0]?.count || 0);

      if (ticketsSold + ticketsToBuyCount > event.capacity) {
        return res.status(400).json({
          error: `ظرفیت این رویداد تکمیلی است. ظرفیت باقی‌مانده: ${Math.max(0, event.capacity - ticketsSold)} بلیت.`
        });
      }

      const paymentId = `pay_${Math.random().toString(36).substring(7)}`;

      const ticket1 = await createTicket({
        userId: parsedUserId,
        eventId: parsedEventId,
        amount: plusOne ? Math.floor(parseInt(amount, 10) / 2) : parseInt(amount, 10),
        paymentStatus: 'PAID',
        paymentId: paymentId + '-1'
      });

      if (plusOne) {
        await createTicket({
          userId: parsedUserId,
          eventId: parsedEventId,
          amount: Math.floor(parseInt(amount, 10) / 2),
          paymentStatus: 'PAID',
          paymentId: paymentId + '-2'
        });
      }

      invalidateCachePattern('admin_stats');
      res.json({
        message: plusOne ? 'بلیت‌ها با موفقیت خریداری شدند.' : 'بلیت با موفقیت خریداری شد.',
        data: ticket1
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خرید بلیت با خطا مواجه شد' });
    }
  });

  app.get('/api/users/:id/tickets', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const ticketsData = await getUserTickets(userId);
      res.json({ data: ticketsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'دریافت بلیت‌ها با خطا مواجه شد' });
    }
  });

  // AI ASSISTANT CHAT WITH CIRCUIT BREAKER & FALLBACK
  app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
      const { message } = req.body;

      const reply = await aiCircuitBreaker.execute(
        async () => {
          if (!cachedEventsContext || Date.now() > cachedEventsContext.expiry) {
            const allUpcomingEvents = await getRecommendedEvents();
            const textContext = allUpcomingEvents.map(e =>
              `- ${e.title} (کد: ${e.id}): ${e.description}. تگ‌ها: ${e.tags}. هزینه: ${e.cost}. زمان: ${e.startTime}`
            ).join('\n');
            cachedEventsContext = { text: textContext, expiry: Date.now() + 60000 };
          }
  

          const prompt = `تو دستیار هوشمند رویداد یاب Mevent هستی. به زبان فارسی پاسخ بده. کاربر می‌گوید: "${message}"\nرویدادهای فعلی در سیستم:\n${cachedEventsContext.text}\nبر اساس این رویدادها، پاسخ دقیق، صمیمی و پیشنهادی ارائه بده.`;

          const aiResponse = await callGeminiWithFallback({
            model: "gemini-3.6-flash",
            contents: prompt,
          });

          return aiResponse.text || "متأسفانه پاسخی دریافت نشد.";
        },
        async () => {
          // Intelligent offline rule-based fallback
          const allUpcomingEvents = await getRecommendedEvents();
          const matches = allUpcomingEvents.slice(0, 3).map(e => `• ${e.title} (زمان: ${new Date(e.startTime).toLocaleDateString('fa-IR')})`).join('\n');
          return `سلام! در حال حاضر پردازش هوش مصنوعی در حال به‌روزرسانی است، اما برترین رویدادهای پیشنهادی سیستم برای شما:\n${matches}`;
        }

      );

      res.json({ reply });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در ارتباط با دستیار هوشمند' });
    }
  });

  // BACKGROUND CRAWLER JOB SYSTEM
  app.post('/api/jobs/crawler', strictLimiter, async (req, res) => {
    const job = createJob('CRAWLER');
    const { url } = req.body;
    let targetUrl = url || 'https://calendar.iranfair.com/fa';

    res.status(202).json({
      message: 'فرآیند خزشگر در پس‌زمینه شروع شد.',
      jobId: job.id,
      statusUrl: `/api/jobs/${job.id}`
    });

    // Execute job asynchronously
    (async () => {
      try {
        job.status = 'RUNNING';
        job.progress = 20;

        const fetchRes = await fetch(targetUrl);
        const html = await fetchRes.text();
        const $ = cheerio.load(html);

        let textContext = $('.container').text();
        if (!textContext || textContext.trim().length < 100) {
          textContext = $('body').text();
        }
        textContext = textContext.replace(/\s+/g, ' ').substring(0, 15000);

        job.progress = 60;

        const prompt = `Extract upcoming events from Tehran International Exhibition Calendar. Year 2026. Translate title and description to Persian if needed. Return JSON { "events": [{ title, description, startTime, address, lat, lng, cost }] }\nText: ${textContext}`;

        const aiResponse = await callGeminiWithFallback({
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
                      capacity: { type: Type.NUMBER },
                      tags: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
          
        
      
    
  
        });

        const data = JSON.parse(aiResponse.text || "{}");
        const fetchedEvents = data.events || [];

        const createdEvents = [];
        for (const eventData of fetchedEvents) {
          if (!eventData.title) continue;
          const newEvent = await createEvent({
            ...eventData,
            ticketUrl: targetUrl,
            startTime: new Date(eventData.startTime || new Date()),
            source: 'CRAWLER',
            tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
            organizerId: 1
          });
          createdEvents.push(newEvent);

        }
        invalidateCachePattern('recommendations');
        invalidateCachePattern('nearby');
        invalidateCachePattern('admin_stats');

        job.status = 'COMPLETED';
        job.progress = 100;
        job.result = { message: `تعداد ${createdEvents.length} نمایشگاه استخراج و ثبت شد.`, eventsCount: createdEvents.length };
      } catch (err: any) {
        console.error('Job error:', err);
        job.status = 'FAILED';
        job.error = err.message || 'خطا در خزش صفحات';
      }
    })();
  });

  app.get('/api/jobs/:id', (req, res) => {
    const job = jobStore.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'کار یافت نشد' });
    }
    res.json({ data: job });
  });

  // Synchronous Crawler API Fallback
  app.post('/api/crawler/run', strictLimiter, async (req, res) => {
    try {
      const { url } = req.body;
      let targetUrl = url || 'https://calendar.iranfair.com/fa';

      const fetchRes = await fetch(targetUrl);
      const html = await fetchRes.text();
      const $ = cheerio.load(html);

      let textContext = $('.container').text() || $('body').text();
      textContext = textContext.replace(/\s+/g, ' ').substring(0, 15000);

      const prompt = `Extract upcoming events from text: ${textContext}. Year 2026. JSON { "events": [{ title, description, startTime, address, lat, lng, cost }] }`;

      const aiResponse = await callGeminiWithFallback({
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
                    capacity: { type: Type.NUMBER },
                    tags: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
          
        
      
    
  

      });

      const data = JSON.parse(aiResponse.text || "{}");
      const fetchedEvents = data.events || [];

      const created = [];
      for (const eventData of fetchedEvents) {
        if (!eventData.title) continue;
        const newEv = await createEvent({
          ...eventData,
          ticketUrl: targetUrl,
          startTime: new Date(eventData.startTime || new Date()),
          source: 'CRAWLER',
          tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
          organizerId: 1
        });
        created.push(newEv);
      }

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');

      res.json({ message: `استخراج با موفقیت انجام شد. ${created.length} رویداد افزوده شد.`, data: created });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خزشگر با خطا مواجه شد' });
    }
  });

  // Nearby Events API
  app.get('/api/events/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 10, tag } = req.query;
      const userLat = lat ? parseFloat(lat as string) : undefined;
      const userLng = lng ? parseFloat(lng as string) : undefined;
      const rad = radius ? parseFloat(radius as string) : 10;

      const cacheKey = `nearby_${userLat || 0}_${userLng || 0}_${rad}`;
      const cached = getFromCache(cacheKey);
      if (cached) return res.json({ data: cached });

      const eventsList = await getNearbyEvents(userLat, userLng, rad);
      const orgIds2 = [...new Set(eventsList.map(e => e.organizerId))];
      const organizers2 = orgIds2.length ? await db.select().from(users).where(inArray(users.id, orgIds2)) : [];
      const orgMap2 = Object.fromEntries(organizers2.map(o => [o.id, o]));
      const eventsData = eventsList.map(e => ({ ...e, organizer: orgMap2[e.organizerId] || null, location: { address: e.address, lat: e.lat, lng: e.lng } }));

      setToCache(cacheKey, eventsData, 15000);
      res.json({ data: eventsData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت رویدادهای اطراف' });
    }
  });

  // Create Event API
  app.post('/api/events', strictLimiter, async (req, res) => {
    try {
      const { title, city, description, startTime, endTime, fuzzyTime, location, cost, currency, capacity, organizerId, coOrganizerIds, imageUrl, hubId, tags, hubIds, galleryUrls, bgIcon, website, instagram, telegram, twitter, advancedDetails } = req.body;

      const newEvent = await createEvent({
        title,
        city: city || 'تهران',
        description: description || null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        fuzzyTime: fuzzyTime || null,
        address: location?.address || null,
        lat: location?.lat || null,
        lng: location?.lng || null,
        cost: cost || 0,
        currency: currency || 'IRT',
        capacity: capacity || 100,
        tags: tags || [],
        imageUrl,
        hubId,
        organizerId: organizerId || 1,
        coOrganizerIds: coOrganizerIds || [],
        hubIds: hubIds || [],
        bgIcon: bgIcon || '',
        galleryUrls: galleryUrls || [],
        website: website || null,
        instagram: instagram || null,
        telegram: telegram || null,
        twitter: twitter || null,
        advancedDetails: advancedDetails || {}
      });

      invalidateCachePattern('recommendations');
      invalidateCachePattern('nearby');
      invalidateCachePattern('admin_stats');

      res.status(201).json({ data: newEvent, message: 'رویداد با موفقیت ثبت شد.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ثبت رویداد با خطا مواجه شد' });
    }
  });

  // Interactions API
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
  

        interaction = await createInteraction({
          userId: actualUserId,
          eventId: parseInt(eventId, 10),
          type,
          metadata
        });
      }
        }
      }
      let pointsToAward = 0;
      if (type === 'RSVP') pointsToAward = 50;
      else if (type === 'SAVE') pointsToAward = 10;
      else if (type === 'VIEW') pointsToAward = 1;

      if (pointsToAward > 0) {
        await db.update(users)
          .set({ points: sql`${users.points} + ${pointsToAward}` })
          .where(eq(users.id, actualUserId));
        invalidateCachePattern('leaderboard');
      }

      res.status(201).json({ message: 'تعامل تعقیب و ذخیره شد.', data: interaction, pointsAwarded: pointsToAward });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ثبت تعامل با خطا مواجه شد' });
    }
  });

  // Saved & RSVP Events
  app.get('/api/users/:id/saved', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const savedEvents = await getSavedEvents(userId);
      res.json({ data: savedEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'دریافت رویدادهای ذخیره شده با خطا مواجه شد' });
    }
  });

  app.get('/api/users/:id/rsvped', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const rsvpEvents = await getRsvpEvents(userId);
      res.json({ data: rsvpEvents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'دریافت رویدادهای ثبت‌نام شده با خطا مواجه شد' });
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
      res.status(500).json({ error: 'دریافت پروفایل کاربر با خطا مواجه شد' });
    }
  });

  app.put('/api/users/:id/profile', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { name, bio, coverImage, organizerType, website, instagram, telegram, twitter, advancedDetails } = req.body;
      const result = await db.update(users)
        .set({ name, bio, coverImage, organizerType, website, instagram, telegram, twitter })
        .where(eq(users.id, userId))
        .returning();
      res.json({ message: 'پروفایل با موفقیت ذخیره شد.', data: result[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ذخیره پروفایل با خطا مواجه شد' });
    }
  });

  app.put('/api/users/:id/preferences', async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { preferences } = req.body;
      const updatedUser = await updateUserPreferences(userId, preferences);
      res.json({ message: 'علایق شما با موفقیت ذخیره شد.', data: updatedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ذخیره ترجیحات با خطا مواجه شد' });
    }
  });

  // Organizer Events & Stats
  app.get('/api/organizers', async (req, res) => {
    try {
      const organizersList = await db.select().from(users).where(eq(users.role, 'ORGANIZER'));
      res.json({ data: organizersList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت لیست برگزارکنندگان' });
    }
  });

  app.get('/api/organizer/events', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      if (!userId) return res.status(400).json({ error: 'شناسه برگزارکننده الزامی است' });
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
      res.status(500).json({ error: 'خطا در دریافت رویدادهای برگزارکننده' });
    }
  });

  app.get('/api/organizer/events/:id/stats', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);

      const eventTickets = await db.select().from(tickets).where(eq(tickets.eventId, eventId));
      const viewsQuery = await db.select({ count: sql`count(*)` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'VIEW')));
      const savesQuery = await db.select({ count: sql`count(*)` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'SAVE')));
      const rsvpsQuery = await db.select({ count: sql`count(*)` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));

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
      res.status(500).json({ error: 'خطا در دریافت آمار رویداد' });
    }
  });

  app.get('/api/hubs', async (req, res) => {
    try {
      const allHubs = await db.select().from(hubs);
      res.json({ data: allHubs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت هاب‌ها' });
    }
  });

  app.get('/api/organizers', async (req, res) => {
    try {
      const allOrgs = await db.select().from(users).where(eq(users.role, 'ORGANIZER'));
      res.json({ data: allOrgs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در دریافت برگزارکنندگان' });
    }
  });


    app.get('/api/places', async (req, res) => {
    try {
      const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));
      res.json(allPlaces);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch places' });
    }
  });
  
  
  app.get('/api/places/:id/nearby-places', async (req, res) => {
    try {
      const placeId = parseInt(req.params.id, 10);
      const targetPlace = await db.select().from(places).where(eq(places.id, placeId));
      if (!targetPlace.length) return res.json([]);
      
      const tp = targetPlace[0];
      const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));
      
      // Calculate distance using simple Pythagorean theorem (sufficient for small areas)
      const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a));
      };

      const dist = (p1: any, p2: any) => {
        if (!p1.lat || !p1.lng || !p2.lat || !p2.lng) return Infinity;
        return distanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
      };

      const sorted = allPlaces
        .filter(p => p.id !== placeId)
        .map(p => ({ ...p, _dist: dist(p, tp) } as any))
        .filter(p => p._dist <= 50)
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 5);
        
      res.json(sorted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/places/:id/nearby-events', async (req, res) => {
    try {
      const placeId = parseInt(req.params.id, 10);
      const targetPlace = await db.select().from(places).where(eq(places.id, placeId));
      if (!targetPlace.length) return res.json([]);
      
      const tp = targetPlace[0];
      const allEvents = await db.select().from(events);
      
      const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const p = 0.017453292519943295;
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a));
      };

      const dist = (p1: any, p2: any) => {
        if (!p1.lat || !p1.lng || !p2.lat || !p2.lng) return Infinity;
        return distanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
      };

      const sorted = allEvents
        .filter(e => e.placeId !== placeId)
        .map(e => ({ ...e, _dist: dist(e, tp) } as any))
        .filter(e => e._dist <= 50)
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 5);
        
      res.json(sorted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/places/:id', async (req, res) => {
    try {
      const placeId = parseInt(req.params.id, 10);
      const placeData = await db.select().from(places).where(eq(places.id, placeId));
      if (placeData.length === 0) return res.status(404).json({ error: 'Place not found' });
      res.json(placeData[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch place' });
    }
  });

  app.get('/api/vibes', async (req, res) => {
    try {
      const allVibes = await db.select().from(vibes);
      res.json(allVibes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch vibes' });
    }
  });

  app.get('/api/vibes/:id', async (req, res) => {
    try {
      const vibeId = parseInt(req.params.id, 10);
      const vibeData = await db.select().from(vibes).where(eq(vibes.id, vibeId));
      if (vibeData.length === 0) return res.status(404).json({ error: 'Vibe not found' });
      res.json(vibeData[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch vibe' });
    }
  });

  app.get('/api/chains', async (req, res) => {
    try {
      const allChains = await db.select().from(chains).where(eq(chains.status, 'PUBLISHED'));
      res.json(allChains);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch chains' });
    }
  });

  app.get('/api/chains/:id', async (req, res) => {
    try {
      const chainId = parseInt(req.params.id, 10);
      const chainData = await db.select().from(chains).where(eq(chains.id, chainId));
      if (chainData.length === 0) return res.status(404).json({ error: 'Chain not found' });
      res.json(chainData[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch chain' });
    }
  });

  app.get('/api/flows', async (req, res) => {
    try {
      const allFlows = await db.select().from(flows).where(eq(flows.status, 'PUBLISHED'));
      res.json(allFlows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch flows' });
    }
  });

  // Trip Planner API Endpoint
  app.post('/api/trip-planner', async (req, res) => {
    try {
      const { city = 'تهران', startDate, endDate, preferences = [], tripStyle = 'دوستانه', userId } = req.body;

      const allEvents = await db.select().from(events).where(eq(events.status, 'PUBLISHED'));
      const allPlaces = await db.select().from(places).where(eq(places.status, 'PUBLISHED'));

      const targetCity = (city || 'تهران').trim();
      const normTarget = normalizePersianText(targetCity);

      // Strict matching for target city
      const matchedEvents = allEvents.filter(e => {
        const addr = normalizePersianText(e.address);
        const title = normalizePersianText(e.title);
        const desc = normalizePersianText(e.description);
        const tagsStr = Array.isArray(e.tags) ? e.tags.map(t => normalizePersianText(String(t))).join(' ') : '';
        return addr.includes(normTarget) || title.includes(normTarget) || desc.includes(normTarget) || tagsStr.includes(normTarget);
      });

      const matchedPlaces = allPlaces.filter(p => {
        const addr = normalizePersianText(p.address);
        const name = normalizePersianText(p.name);
        const desc = normalizePersianText(p.description);
        const amenStr = Array.isArray(p.amenities) ? p.amenities.map(a => normalizePersianText(String(a))).join(' ') : '';
        return addr.includes(normTarget) || name.includes(normTarget) || desc.includes(normTarget) || amenStr.includes(normTarget);
      });

      // STRICT CITY ISOLATION: Do NOT fallback to events/places from other cities!
      const eventsPool = matchedEvents;
      const placesPool = matchedPlaces;

      const eventsSummary = eventsPool.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        address: e.address,
        tags: e.tags,
        cost: e.cost,
        startTime: e.startTime
      })).slice(0, 15);

      const placesSummary = placesPool.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        address: p.address,
        workingHours: p.workingHours,
        amenities: p.amenities
      })).slice(0, 15);

      const prompt = `شما یک مشاور و برنامه‌ریز سفر هوشمند در ایران هستید.
کاربر قصد دارد به شهر "${targetCity}" سفر کند.
تاریخ سفر: از ${startDate || 'امروز'} تا ${endDate || '۳ روز دیگر'}.
علایق کاربر: ${Array.isArray(preferences) ? preferences.join(', ') : preferences}.
سبک سفر: ${tripStyle}.

قانون بسیار مهم و حیاتی مرزبندی شهری:
تمام برنامه‌ها، پیشنهادها، رویدادها و پاتوق‌های ارائه شده باید ۱۰۰٪ و به طور مطلق مربوط به خود شهر "${targetCity}" باشند.
به هیچ عنوان و تحت هیچ شرایطی نباید رویداد، پاتوق یا مکانی مربوط به شهر دیگری (مانند تهران یا سایر شهرها) در این برنامه آورده شود.

رویدادهای ثبت‌شده در سیستم برای شهر ${targetCity}:
${eventsSummary.length > 0 ? JSON.stringify(eventsSummary) : 'هیچ رویدادی در دیتابیس برای این شهر ثبت نشده است. بنابراین relatedEventId را null بگذارید و رویدادها/فعالیت‌های عمومی گردشگری همان شهر ' + targetCity + ' را به صورت متنی پیشنهاد دهید.'}

پاتوق‌های ثبت‌شده در سیستم برای شهر ${targetCity}:
${placesSummary.length > 0 ? JSON.stringify(placesSummary) : 'هیچ پاتوقی در دیتابیس برای این شهر ثبت نشده است. بنابراین relatedPlaceId را null بگذارید و پاتوق‌ها/جاذبه‌های معروف همان شهر ' + targetCity + ' را به صورت متنی پیشنهاد دهید.'}

بر اساس این داده‌ها و علایق کاربر، یک پکیج سفر چندروزه (۲ تا ۳ روز) عالی برای شهر ${targetCity} تنظیم کن.
هر روز شامل ۳ بخش "صبح"، "عصر" و "شب" است.
فقط در صورتی که ID رویداد یا پاتوقی در لیست فوق وجود دارد، relatedEventId یا relatedPlaceId را مقداردهی کن؛ در غیر این صورت حتماً null بگذار.

فرمت پاسخ حتماً JSON کامل به شکل زیر باشد:
{
  "title": "عنوان جذاب پکیج سفر در ${targetCity}",
  "city": "${targetCity}",
  "summary": "خلاصه ۲ خطی جذاب از پکیج سفر ${targetCity}",
  "tips": ["نکته ۱ برای سفر به ${targetCity}", "نکته ۲", "نکته ۳"],
  "days": [
    {
      "dayNumber": 1,
      "dateLabel": "روز اول - گشت در ${targetCity}",
      "morning": {
        "title": "عنوان فعالیت صبح",
        "description": "توضیحات کوتاه",
        "relatedEventId": null,
        "relatedPlaceId": null
      },
      "afternoon": {
        "title": "عنوان فعالیت عصر",
        "description": "توضیحات کوتاه",
        "relatedEventId": null,
        "relatedPlaceId": null
      },
      "evening": {
        "title": "عنوان فعالیت شب",
        "description": "توضیحات کوتاه",
        "relatedEventId": null,
        "relatedPlaceId": null
      }
    }
  ],
  "recommendedEventIds": [],
  "recommendedPlaceIds": []
}`;

      let tripData = null;
      try {
        const aiResponse = await callGeminiWithFallback({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (aiResponse.text) {
          tripData = JSON.parse(aiResponse.text);
        }
      } catch (aiErr) {
        console.error('Gemini Trip Planner Error:', aiErr);
      }

      if (!tripData || !tripData.days || tripData.days.length === 0) {
        tripData = {
          title: `پکیج سفر ${tripStyle} به ${targetCity}`,
          city: targetCity,
          summary: `برنامه ویژه سفر به ${targetCity} شامل بهترین پاتوق‌ها، کافه‌ها و جاذبه‌های پیشنهادی متناسب با علایق شما.`,
          tips: [
            `حتماً ساعات کاری پاتوق‌ها و جاذبه‌های ${targetCity} را پیش از حرکت بررسی کنید.`,
            `برای جابه‌جایی راحت‌تر در ${targetCity} از نقشه و حمل‌ونقل شهری بهره ببرید.`,
            `در صورت نیاز به بلیط، رزرو آنلاین را زودتر انجام دهید.`
          ],
          days: [
            {
              dayNumber: 1,
              dateLabel: `روز اول - گشت و آشنایی با ${targetCity}`,
              morning: {
                title: placesPool[0] ? `صرف صبحانه و آشنایی در ${placesPool[0].name}` : `گشت صبحگاهی و جاذبه‌های اصلی ${targetCity}`,
                description: placesPool[0]?.description || `آغاز روز با گشت و گذار در خیابان‌ها و جاذبه‌های دیدنی ${targetCity}.`,
                relatedPlaceId: placesPool[0]?.id || null,
                relatedEventId: null
              },
              afternoon: {
                title: eventsPool[0] ? `شرکت در رویداد ${eventsPool[0].title}` : `گشت نیمروزی و عکاسی در ${targetCity}`,
                description: eventsPool[0]?.description || `بازدید از مراکز فرهنگی و تاریخی در ${targetCity}.`,
                relatedPlaceId: null,
                relatedEventId: eventsPool[0]?.id || null
              },
              evening: {
                title: placesPool[1] ? `شب‌نشینی و استراحت در ${placesPool[1].name}` : `شام و استراحت در پاتوق‌های محبوب ${targetCity}`,
                description: placesPool[1]?.description || `خاتمه جذاب روز اول با فضای دوست‌داشتنی ${targetCity}.`,
                relatedPlaceId: placesPool[1]?.id || null,
                relatedEventId: null
              }
            },
            {
              dayNumber: 2,
              dateLabel: `روز دوم - هنر، فرهنگ و خاطره‌سازی در ${targetCity}`,
              morning: {
                title: placesPool[2] ? `بازدید از ${placesPool[2].name}` : `شروع پرانرژی روز دوم در ${targetCity}`,
                description: placesPool[2]?.description || `گشت و گذار در فضایی آرامش‌بخش و خاطره‌انگیز.`,
                relatedPlaceId: placesPool[2]?.id || null,
                relatedEventId: null
              },
              afternoon: {
                title: eventsPool[1] ? `حضور در رویداد ${eventsPool[1].title}` : `برنامه ویژه عصرگاهی در ${targetCity}`,
                description: eventsPool[1]?.description || `تجربه تئاتر، نمایشگاه یا بازارچه‌های محلی ${targetCity}.`,
                relatedPlaceId: null,
                relatedEventId: eventsPool[1]?.id || null
              },
              evening: {
                title: placesPool[3] ? `پاتوق‌گردی شبانه در ${placesPool[3].name}` : `پیاده‌روی شبانه و دورهمی در ${targetCity}`,
                description: placesPool[3]?.description || `پایان خاطره‌انگیز سفر به ${targetCity}.`,
                relatedPlaceId: placesPool[3]?.id || null,
                relatedEventId: null
              }
            }
          ],
          recommendedEventIds: eventsPool.slice(0, 4).map(e => e.id),
          recommendedPlaceIds: placesPool.slice(0, 4).map(p => p.id)
        };
      }

      // Filter and clean IDs to strictly match only target city events & places
      const validMatchedEventIds = new Set(matchedEvents.map(e => e.id));
      const validMatchedPlaceIds = new Set(matchedPlaces.map(p => p.id));

      if (tripData && tripData.days) {
        tripData.days.forEach((day: any) => {
          ['morning', 'afternoon', 'evening'].forEach((period: string) => {
            if (day[period]) {
              if (day[period].relatedEventId && !validMatchedEventIds.has(day[period].relatedEventId)) {
                day[period].relatedEventId = null;
              }
              if (day[period].relatedPlaceId && !validMatchedPlaceIds.has(day[period].relatedPlaceId)) {
                day[period].relatedPlaceId = null;
              }
            }
          });
        });
      }

      const recEventIds = (tripData.recommendedEventIds || []).filter((id: number) => validMatchedEventIds.has(id));
      const recPlaceIds = (tripData.recommendedPlaceIds || []).filter((id: number) => validMatchedPlaceIds.has(id));

      const fullEvents = matchedEvents.filter(e => recEventIds.includes(e.id));
      const fullPlaces = matchedPlaces.filter(p => recPlaceIds.includes(p.id));

      res.json({
        success: true,
        data: {
          ...tripData,
          city: targetCity,
          events: fullEvents.length > 0 ? fullEvents : matchedEvents.slice(0, 4),
          places: fullPlaces.length > 0 ? fullPlaces : matchedPlaces.slice(0, 4)
        }
      });
    } catch (err) {
      console.error('Trip Planner Endpoint Error:', err);
      res.status(500).json({ error: 'خطا در برنامه‌ریزی سفر' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
