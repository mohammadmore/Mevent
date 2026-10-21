// Sends uncaught browser errors to the server's error list (at most a few per page load).

const MAX_REPORTS = 5;
const IGNORE = /ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:|Load failed|NetworkError|Failed to fetch/i;

let sent = 0;
const seen = new Set<string>();

function report(message: string, stack?: string) {
  if (!message || IGNORE.test(message) || IGNORE.test(stack || '') || sent >= MAX_REPORTS || seen.has(message)) return;
  seen.add(message);
  sent++;
  const body = JSON.stringify({ message: message.slice(0, 1000), stack: stack?.slice(0, 4000), url: location.pathname });
  // keepalive lets the report leave even if the page is closing.
  fetch('/api/client-errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

export function installErrorReporting() {
  window.addEventListener('error', (e) => report(e.message, e.error?.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r: any = e.reason;
    report(r?.message || String(r), r?.stack);
  });
}
