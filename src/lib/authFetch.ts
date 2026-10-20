/**
 * Phone-login sessions travel in an httpOnly cookie, which the browser sends with every
 * same-origin request on its own. For Google sign-in, the Firebase ID token is attached to
 * same-origin `/api` requests here, so existing `fetch('/api/...')` calls need no changes.
 */

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

/** Registered by the auth layer while a Google user is signed in; null otherwise. */
export function setAuthTokenGetter(getter: TokenGetter | null) {
  getToken = getter;
}

export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request || !getToken) return originalFetch(input, init);

    const url = new URL(String(input), window.location.origin);
    const isApiCall = url.origin === window.location.origin && url.pathname.startsWith('/api/');
    if (!isApiCall) return originalFetch(input, init);

    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      try {
        const token = await getToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
      } catch (err) {
        console.error('Could not get auth token:', err);
      }
    }
    return originalFetch(input, { ...init, headers });
  };
}
