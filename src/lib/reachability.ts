// Whether this browser can reach a service right now: a tiny no-cors request with a short deadline.
// Results are remembered for the session, so the check costs at most one round trip.

const cache = new Map<string, Promise<boolean>>();

export function browserCanReach(url: string, timeoutMs = 2500): Promise<boolean> {
  let p = cache.get(url);
  if (!p) {
    let stored: string | null = null;
    try { stored = sessionStorage.getItem(`reach:${url}`); } catch { /* private mode */ }
    p = stored !== null
      ? Promise.resolve(stored === '1')
      : fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
          .then(() => true, () => false)
          .then(ok => { try { sessionStorage.setItem(`reach:${url}`, ok ? '1' : '0'); } catch { /* ignore */ } return ok; });
    cache.set(url, p);
  }
  return p;
}

/** Google sign-in needs accounts.google.com / gstatic in the browser (often blocked in Iran). */
export const browserReachesGoogle = () =>
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR ? Promise.resolve(true) : browserCanReach('https://www.gstatic.com/generate_204');
