// The app may live under a sub-path (https://host/mevent). The server tells the page its base
// path in <meta name="mevent-base">; everything below works with app-relative paths ("/events/3")
// and adds or removes the prefix at the browser boundary.

const declared = typeof document !== 'undefined'
  ? document.querySelector<HTMLMetaElement>('meta[name="mevent-base"]')?.content.trim() || ''
  : '';

/** "" at the domain root, otherwise e.g. "/mevent". */
export const BASE = /^\/[\w.~-]+(\/[\w.~-]+)*$/.test(declared) ? declared : '';

/** "/events/3" → "/mevent/events/3". Paths that are not app-relative (full URLs) are left alone. */
export function withBase(path: string): string {
  return BASE && path.startsWith('/') && !path.startsWith('//') ? BASE + path : path;
}

/** "/mevent/events/3" → "/events/3". */
export function stripBase(pathname: string): string {
  if (BASE && (pathname === BASE || pathname.startsWith(`${BASE}/`))) return pathname.slice(BASE.length) || '/';
  return pathname;
}

/** The current app-relative path and query, e.g. "/events/3?tab=x". */
export function currentPath(): string {
  return stripBase(window.location.pathname) + window.location.search;
}
