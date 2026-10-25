import { Express } from 'express';
import { AuthRequest } from '../../middleware/auth.ts';
import { asyncRoute } from '../infra.ts';
import { toNumberOrNull } from '../helpers.ts';
import { BUDGET_OPTIONS, BudgetKey, COMPANY, CompanyKey, MOODS, MoodKey, WHEN_OPTIONS, WhenKey } from '../../lib/moods.ts';
import { forYou, freeNow, suggest } from '../recommend.ts';

// "For you" feed, the "I'm bored" picker and the no-cost section. All personal, never shared-cached.

function place(req: AuthRequest) {
  const q = req.query as Record<string, string | undefined>;
  const lat = toNumberOrNull(q.lat), lng = toNumberOrNull(q.lng);
  const valid = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    userId: req.dbUser?.id ?? null,
    city: q.city?.trim().slice(0, 50) || undefined,
    lat: valid ? lat! : undefined,
    lng: valid ? lng! : undefined,
  };
}

const pick = <T extends string>(value: unknown, options: Record<string, unknown>) =>
  (typeof value === 'string' && Object.hasOwn(options, value) ? value as T : undefined);

export function registerRecommendRoutes(app: Express) {
  app.get('/api/for-you', asyncRoute(async (req: AuthRequest, res) => {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await forYou({ ...place(req), limit }));
  }));

  app.get('/api/suggest', asyncRoute(async (req: AuthRequest, res) => {
    const q = req.query as Record<string, string | undefined>;
    // "event:12,place:3": what was already shown, so "something else" gives new picks.
    const exclude = new Set(String(q.exclude || '').split(',').filter(x => /^(event|place|vibe):\d{1,9}$/.test(x)).slice(0, 200));
    const result = await suggest({
      ...place(req),
      mood: pick<MoodKey>(q.mood, MOODS),
      company: pick<CompanyKey>(q.company, COMPANY),
      when: pick<WhenKey>(q.when, WHEN_OPTIONS) || 'now',
      budget: pick<BudgetKey>(q.budget, BUDGET_OPTIONS) || 'any',
      exclude,
      count: Math.min(6, Math.max(1, Number(q.count) || 3)),
    });
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(result);
  }));

  app.get('/api/free', asyncRoute(async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await freeNow(place(req)));
  }));
}
