import type { Express, NextFunction, Request, Response } from 'express';

// Running under a sub-path (BASE_PATH=/mevent, e.g. a cPanel app at https://host/mevent).
//
// Inside the server every route stays root-relative: the prefix is removed from incoming URLs,
// and added again only where a URL leaves the server (redirects, the HTML shell, the cookie path,
// absolute links, upload URLs in JSON). Unset BASE_PATH means the app lives at the domain root and
// nothing here changes anything.

function normalize(raw: string | undefined): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!/^\/[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*$/.test(withSlash)) {
    console.warn(`BASE_PATH "${raw}" is not a plain path like /mevent; it is ignored.`);
    return '';
  }
  return withSlash;
}

export const BASE_PATH = normalize(process.env.BASE_PATH);

/** "/tickets" → "/mevent/tickets" (unchanged without a base path). */
export const withBase = (path: string) => BASE_PATH + path;

/**
 * Hosts differ: some pass the full path ("/mevent/api/health") to the app, others strip the
 * prefix first. Both work: the prefix is removed when present and requests without it are
 * served as they are.
 */
export function installBasePathPrefix(app: Express) {
  if (!BASE_PATH) return;
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const url = req.url;
    if (url === BASE_PATH || url.startsWith(`${BASE_PATH}/`) || url.startsWith(`${BASE_PATH}?`)) {
      const rest = url.slice(BASE_PATH.length);
      req.url = rest.startsWith('/') ? rest : `/${rest}`;
    }
    next();
  });
}

const UPLOADS = '/uploads/';

/**
 * Uploaded files are stored (and referenced in the database) as "/uploads/<name>", which stays
 * valid if the base path ever changes. Responses get the prefix when they leave, and request
 * bodies lose it when it comes back (an edit form sends the image URL it was given).
 */
export function installBasePathPayloads(app: Express) {
  if (!BASE_PATH) return;
  const prefixed = `${BASE_PATH}${UPLOADS}`;

  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.json = (body: unknown) => {
      const text = JSON.stringify(body, (_key, value) => (typeof value === 'string' && value.startsWith(UPLOADS) ? BASE_PATH + value : value));
      if (!res.get('Content-Type')) res.type('application/json');
      return res.send(text);
    };
    next();
  });

  const strip = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 12) return;
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (typeof value === 'string') {
        if (value.startsWith(prefixed)) node[key] = value.slice(BASE_PATH.length);
      } else {
        strip(value, depth + 1);
      }
    }
  };
  app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
    strip(req.body);
    next();
  });
}

/** The built index.html uses relative asset URLs; make them absolute under the base path. */
export function prepareIndexHtml(html: string): string {
  const meta = `<meta name="mevent-base" content="${BASE_PATH}">`;
  return html
    .replace(/(\s(?:src|href))="\.\//g, `$1="${BASE_PATH}/`)
    .replace(/<meta charset="UTF-8"\s*\/?>/i, m => `${m}\n    ${meta}`);
}
