import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

import { dbReady } from './src/db/index';
import { authenticate } from './src/middleware/auth';
import { metricsMiddleware, validateInput, limiters, asyncRoute } from './src/server/infra';
import { sendUpload } from './src/lib/storage';
import { startBackgroundJobs } from './src/lib/notifications';
import { pruneSharedStore } from './src/lib/sharedStore';
import { injectPageMeta } from './src/server/seo';
import { registerAuthRoutes, pruneOtpCodes } from './src/server/routes/auth';
import { registerUserRoutes } from './src/server/routes/users';
import { pruneExpiredSessions } from './src/server/session';
import { registerDiscoveryRoutes } from './src/server/routes/discovery';
import { registerContentRoutes } from './src/server/routes/content';
import { registerCommerceRoutes, expireStaleOrders } from './src/server/routes/commerce';
import { registerSocialRoutes } from './src/server/routes/social';
import { registerAdminRoutes } from './src/server/routes/admin';
import { registerAiRoutes } from './src/server/routes/ai';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Behind a reverse proxy (Cloud Run, nginx, ...) req.ip must come from X-Forwarded-For,
  // otherwise every client shares the proxy's IP and therefore one rate-limit bucket.
  const trustProxy = process.env.TRUST_PROXY ?? '1';
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? parseInt(trustProxy, 10) : trustProxy === 'true' ? true : trustProxy);

  app.use(helmet({
    // The SPA loads map tiles, remote images and Firebase scripts from many origins.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Google sign-in uses a popup that must be able to talk back to this window.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // The app is embedded in an iframe by AI Studio.
    frameguard: false,
    // Map tile servers (OpenStreetMap) require a Referer header.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(compression());
  // Same-origin by default; set CORS_ORIGINS (comma separated) to allow other front-ends.
  const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  if (corsOrigins.length > 0) app.use(cors({ origin: corsOrigins }));
  app.use(morgan('combined', { skip: (req) => req.path.startsWith('/api/health') || req.path.startsWith('/@vite') }));
  app.use(metricsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // Uploaded images (local disk in development, Cloud Storage when UPLOAD_BUCKET is set).
  app.get('/uploads/:name', asyncRoute(async (req, res) => sendUpload(req.params.name, res)));

  // API responses depend on the session cookie; a CDN or shared proxy must never cache them.
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-cache'); res.setHeader('Vary', 'Cookie, Authorization'); next(); });
  app.use('/api', limiters.default);
  app.use('/api', validateInput);
  app.use('/api', authenticate);

  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerDiscoveryRoutes(app);
  registerContentRoutes(app);
  registerCommerceRoutes(app);
  registerSocialRoutes(app);
  registerAdminRoutes(app);
  registerAiRoutes(app);

  // Unknown API routes must not fall through to the SPA's index.html.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'مسیر API یافت نشد' });
  });

  // Malformed JSON bodies and other unexpected errors return JSON instead of an HTML stack trace.
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'بدنه درخواست JSON معتبر نیست' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'حجم درخواست بیش از حد مجاز است' });
    console.error('Unhandled API error:', err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  // The SPA: every non-API path (e.g. /events/12) serves index.html with per-page <meta> tags,
  // so deep links work on refresh and shared links get a proper preview.
  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', asyncRoute(async (req, res) => {
      const template = await vite.transformIndexHtml(req.originalUrl, fs.readFileSync(path.resolve('index.html'), 'utf-8'));
      const html = await injectPageMeta(template, req.originalUrl.split('?')[0], `${req.protocol}://${req.get('host')}`);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    }));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Hashed assets never change; the service worker and HTML must always be revalidated.
    app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('.webmanifest')) res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    const template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
    app.get('*', asyncRoute(async (req, res) => {
      const origin = process.env.APP_URL?.startsWith('http') ? process.env.APP_URL.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`;
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(await injectPageMeta(template, req.path, origin));
    }));
  }

  await dbReady;
  startBackgroundJobs([expireStaleOrders, pruneSharedStore, pruneExpiredSessions, pruneOtpCodes]);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
