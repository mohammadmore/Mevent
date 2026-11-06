/**
 * Sign-in sessions travel in an httpOnly cookie, which the browser sends with every same-origin
 * request on its own. This wrapper only adds the app's base path (see basePath.ts) to
 * app-relative URLs, so no `fetch('/api/...')` call site has to care about it.
 */

import { withBase } from './basePath';

export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    originalFetch(typeof input === 'string' ? withBase(input) : input, init);
}
