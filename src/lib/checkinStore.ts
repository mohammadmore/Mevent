// Local (IndexedDB) state for door check-in, so scanning keeps working without internet:
// the event's ticket list (hashes only) and the scans waiting to be uploaded.

export interface ManifestTicket { h: string; id: number; status: 'ACTIVE' | 'USED' | 'CANCELLED'; holder: string; label: string | null; usedAt: string | null }
export interface Scan { code: string; scannedAt: string; synced: boolean; result?: 'OK' | 'ALREADY' | 'DUPLICATE' | 'INVALID' }
export interface CheckinState { eventId: number; generatedAt: string | null; tickets: ManifestTicket[]; scans: Scan[] }

const DB = 'mevent-checkin';
const STORE = 'events';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCheckin(eventId: number): Promise<CheckinState> {
  try {
    const db = await open();
    const value = await new Promise<CheckinState | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(eventId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return value || { eventId, generatedAt: null, tickets: [], scans: [] };
  } catch {
    return { eventId, generatedAt: null, tickets: [], scans: [] };
  }
}

export async function saveCheckin(state: CheckinState) {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, state.eventId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* private mode: works for this session only */ }
}

export const normalizeTicketCode = (raw: string) => raw.trim().toUpperCase().replace(/^MEVENT:/, '');

/** Same hash as the server: SHA-256 of "<eventId>:<code>" in hex. Null where WebCrypto is unavailable. */
export async function ticketHash(eventId: number, code: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${eventId}:${code}`));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
