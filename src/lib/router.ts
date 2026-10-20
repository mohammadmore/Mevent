import { useSyncExternalStore } from 'react';

// A minimal History-API router: every screen has its own URL, so refresh, the browser's
// back button and shared links all land on the right page.

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', notify);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => window.location.pathname + window.location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === snapshot()) return;
  const depth = (window.history.state?.depth ?? 0) + (opts.replace ? 0 : 1);
  window.history[opts.replace ? 'replaceState' : 'pushState']({ inApp: true, depth }, '', to);
  notify();
}

/** Goes back inside the app; when the page was opened directly (e.g. a shared link), goes to `fallback`. */
export function goBack(fallback = '/') {
  if ((window.history.state?.depth ?? 0) > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

export function useLocation() {
  const full = useSyncExternalStore(subscribe, snapshot, () => '/');
  const [pathname, search = ''] = full.split('?');
  return { pathname, search, query: new URLSearchParams(search) };
}

/** Matches "/events/:id" style patterns; returns the params or null. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = pathname.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function absoluteUrl(path: string) {
  return window.location.origin + path;
}
