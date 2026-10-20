import { auth } from './firebase';

/**
 * Attaches the signed-in user's Firebase ID token to every same-origin `/api` request,
 * so all existing `fetch('/api/...')` calls are authenticated without changing each call site.
 * The server derives the user's identity from this token only.
 */
export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) return originalFetch(input, init);

    const url = new URL(String(input), window.location.origin);
    const isApiCall = url.origin === window.location.origin && url.pathname.startsWith('/api/');
    const currentUser = auth.currentUser;
    if (!isApiCall || !currentUser) return originalFetch(input, init);

    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      try {
        headers.set('Authorization', `Bearer ${await currentUser.getIdToken()}`);
      } catch (err) {
        console.error('Could not get auth token:', err);
      }
    }
    return originalFetch(input, { ...init, headers });
  };
}
