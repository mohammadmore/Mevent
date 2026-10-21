// Health of the external services the server talks to, so requests never wait on one that is down.
//
// - Each service is probed in the background (at start-up and every PROBE_INTERVAL) with a short
//   timeout; the result is kept in memory.
// - Request handlers ask `isUp(name)` (a synchronous lookup) and go straight to their plan B when
//   the answer is no; `guarded()` also runs the call with a deadline.
// - A failure seen during a real call opens the circuit: the service is skipped for a cool-down
//   (30s, doubling up to 10 min) until a probe or a trial call succeeds again.

const PROBE_TIMEOUT_MS = Number(process.env.DEP_PROBE_TIMEOUT_MS) || 1500;
const PROBE_INTERVAL_MS = Number(process.env.DEP_PROBE_INTERVAL_MS) || 2 * 60_000;
const BASE_COOLDOWN_MS = Number(process.env.DEP_COOLDOWN_MS) || 30_000;
const MAX_COOLDOWN_MS = 10 * 60_000;

type State = 'up' | 'down' | 'unknown';

interface Dependency {
  name: string;
  label: string;
  /** Throws when the service cannot be reached. */
  probe?: () => Promise<void>;
  state: State;
  failures: number;
  openUntil: number;
  lastCheck: number | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  /** Called when the service comes back after being down (e.g. to flush queued work). */
  onRecover?: () => void;
}

const registry = new Map<string, Dependency>();

export function registerDependency(name: string, label: string, probe?: () => Promise<void>, opts: { onRecover?: () => void } = {}) {
  const existing = registry.get(name);
  if (existing) {
    existing.label = label;
    if (probe) existing.probe = probe;
    if (opts.onRecover) existing.onRecover = opts.onRecover;
    return;
  }
  registry.set(name, { name, label, probe, onRecover: opts.onRecover, state: 'unknown', failures: 0, openUntil: 0, lastCheck: null, lastError: null, lastLatencyMs: null });
}

/** A probe that succeeds when the host answers at all (any HTTP status). */
export function httpProbe(url: string, init: RequestInit = { method: 'HEAD' }) {
  return async () => {
    const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    await res.body?.cancel().catch(() => {});
  };
}

/**
 * True unless the service is known to be down. Never waits: once a down service's cool-down is
 * over, the first caller starts a background probe (and still gets false); services without a
 * probe let that caller's own request be the trial.
 */
export function isUp(name: string): boolean {
  const dep = registry.get(name);
  if (!dep || dep.state !== 'down') return true;
  if (dep.openUntil > Date.now()) return false;
  if (!dep.probe) return true;
  probeOne(dep);
  return false;
}

export function reportSuccess(name: string, latencyMs?: number) {
  const dep = registry.get(name);
  if (!dep) return;
  const recovered = dep.state === 'down';
  dep.state = 'up';
  dep.failures = 0;
  dep.openUntil = 0;
  dep.lastError = null;
  dep.lastCheck = Date.now();
  if (latencyMs !== undefined) dep.lastLatencyMs = latencyMs;
  if (recovered) {
    console.warn(`[deps] ${name} is reachable again`);
    try { dep.onRecover?.(); } catch { /* the hook handles its own errors */ }
  }
}

type AlertHandler = (name: string, label: string, error: string) => void;
let alertHandler: AlertHandler | null = null;
/** Called when a service that was up is found down (monitoring notifies the admins). */
export function setDependencyAlertHandler(fn: AlertHandler) { alertHandler = fn; }

export function reportFailure(name: string, err: unknown) {
  const dep = registry.get(name);
  if (!dep) return;
  const wasUp = dep.state !== 'down';
  dep.state = 'down';
  dep.failures++;
  dep.openUntil = Date.now() + Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * 2 ** (dep.failures - 1));
  dep.lastError = errorText(err);
  dep.lastCheck = Date.now();
  if (wasUp) {
    console.warn(`[deps] ${name} is unreachable (${dep.lastError}); using fallback`);
    // Push services come and go per browser vendor; only alert for the server's own services.
    if (!name.startsWith('push:')) alertHandler?.(name, dep.label, dep.lastError || '');
  }
}

function errorText(err: unknown) {
  const e = err as any;
  const cause = e?.cause?.code || e?.cause?.message;
  return String(e?.name === 'TimeoutError' ? 'timeout' : (cause || e?.message || e)).slice(0, 200);
}

/**
 * Runs `action` against the service with a deadline. While the service is down (or the action
 * fails / runs out of time) `fallback` produces the result instead. `usedFallback` says which ran.
 */
export async function guarded<T>(name: string, action: (signal: AbortSignal) => Promise<T>, fallback: (reason: string) => Promise<T> | T, timeoutMs = 4000): Promise<{ value: T; usedFallback: boolean }> {
  if (!isUp(name)) return { value: await fallback('down'), usedFallback: true };
  const started = Date.now();
  try {
    const value = await action(AbortSignal.timeout(timeoutMs));
    reportSuccess(name, Date.now() - started);
    return { value, usedFallback: false };
  } catch (err) {
    reportFailure(name, err);
    return { value: await fallback(errorText(err)), usedFallback: true };
  }
}

const probing = new Set<string>();
async function probeOne(dep: Dependency) {
  if (!dep.probe || probing.has(dep.name)) return;
  probing.add(dep.name);
  const started = Date.now();
  try {
    await dep.probe();
    reportSuccess(dep.name, Date.now() - started);
  } catch (err) {
    reportFailure(dep.name, err);
  } finally {
    probing.delete(dep.name);
  }
}

export async function probeAll() {
  await Promise.all([...registry.values()].map(probeOne));
}

let timer: NodeJS.Timeout | null = null;
export function startDependencyProbes() {
  if (timer || process.env.DEP_PROBES === 'false') return;
  probeAll().catch(() => {});
  timer = setInterval(() => probeAll().catch(() => {}), PROBE_INTERVAL_MS);
  timer.unref();
}

export function dependencySnapshot() {
  return [...registry.values()].map(d => ({
    name: d.name,
    label: d.label,
    state: d.openUntil > Date.now() ? 'down' : d.state,
    retryAt: d.openUntil > Date.now() ? new Date(d.openUntil).toISOString() : null,
    lastCheck: d.lastCheck ? new Date(d.lastCheck).toISOString() : null,
    latencyMs: d.lastLatencyMs,
    error: d.lastError,
  }));
}
