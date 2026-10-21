import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { Response } from 'express';
import { AwsClient } from 'aws4fetch';
import { registerDependency, httpProbe, isUp, reportFailure, reportSuccess } from './dependencies.ts';

// Uploaded images. Served from /uploads/<name> whatever the backend:
//
//   S3_ENDPOINT + S3_BUCKET + S3_ACCESS_KEY + S3_SECRET_KEY
//       any S3-compatible object storage (ArvanCloud, MinIO, ...). Recommended in production.
//   UPLOAD_BUCKET
//       Google Cloud Storage bucket (older deployments).
//   neither
//       the local disk (development, or a single server with a persistent volume).
//
// Plan B: when the object storage cannot be reached, the file is kept on the local disk and
// queued; a background job copies queued files to the bucket once it is reachable again.

// Kept outside public/ so user uploads are never copied into the client build.
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PENDING_DIR = path.join(UPLOAD_DIR, '.pending');
// Files uploaded by earlier versions live here and are still served.
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');
const PREFIX = 'uploads/';
const SAFE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;
const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const DEP = 'storage';

interface RemoteStore {
  put(name: string, body: Buffer, contentType: string): Promise<void>;
  /** A readable stream, or null when the object does not exist. */
  get(name: string): Promise<Readable | null>;
}

function s3Store(): RemoteStore {
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, '');
  const bucketName = process.env.S3_BUCKET!;
  const client = new AwsClient({
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
    service: 's3',
    region: process.env.S3_REGION || 'us-east-1',
  });
  // Path-style (https://host/bucket/key) works with every S3-compatible service.
  const url = (name: string) => `${endpoint}/${encodeURIComponent(bucketName)}/${PREFIX}${encodeURIComponent(name)}`;
  return {
    async put(name, body, contentType) {
      const res = await client.fetch(url(name), {
        method: 'PUT',
        body,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`S3 PUT ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    },
    async get(name) {
      const res = await client.fetch(url(name), { signal: AbortSignal.timeout(10000) });
      if (res.status === 404 || res.status === 403) { await res.body?.cancel(); return null; }
      if (!res.ok || !res.body) throw new Error(`S3 GET ${res.status}`);
      return Readable.fromWeb(res.body as any);
    },
  };
}

async function gcsStore(): Promise<RemoteStore> {
  const { getStorage } = await import('firebase-admin/storage');
  await import('./firebase-admin.ts');
  const bucket = getStorage().bucket(process.env.UPLOAD_BUCKET!);
  return {
    async put(name, body, contentType) {
      await bucket.file(PREFIX + name).save(body, { contentType, resumable: false, metadata: { cacheControl: 'public, max-age=31536000, immutable' } });
    },
    async get(name) {
      const file = bucket.file(PREFIX + name);
      const [exists] = await file.exists();
      return exists ? file.createReadStream() : null;
    },
  };
}

const hasS3 = Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
export const storageMode: 's3' | 'bucket' | 'local' = hasS3 ? 's3' : process.env.UPLOAD_BUCKET ? 'bucket' : 'local';

let remotePromise: Promise<RemoteStore> | null = null;
function remote() {
  remotePromise ??= storageMode === 's3' ? Promise.resolve(s3Store()) : gcsStore();
  return remotePromise;
}

fs.mkdirSync(PENDING_DIR, { recursive: true });

if (storageMode === 's3') {
  registerDependency(DEP, 'فضای ذخیره‌سازی فایل (S3)', httpProbe(`${process.env.S3_ENDPOINT!.replace(/\/$/, '')}/${encodeURIComponent(process.env.S3_BUCKET!)}`), { onRecover: () => { setTimeout(() => syncPendingUploads().catch(() => {}), 0); } });
} else if (storageMode === 'bucket') {
  registerDependency(DEP, 'فضای ذخیره‌سازی فایل (Google Cloud)', httpProbe('https://storage.googleapis.com/'), { onRecover: () => { setTimeout(() => syncPendingUploads().catch(() => {}), 0); } });
} else if (process.env.NODE_ENV === 'production') {
  console.warn('No object storage configured (S3_* or UPLOAD_BUCKET): uploads stay on this server\'s disk.');
}

async function keepLocally(name: string, buffer: Buffer, queue: boolean) {
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer);
  if (queue) await fs.promises.writeFile(path.join(PENDING_DIR, name), '');
}

export async function saveUpload(name: string, buffer: Buffer, contentType: string): Promise<void> {
  if (storageMode === 'local') return keepLocally(name, buffer, false);
  if (isUp(DEP)) {
    const started = Date.now();
    try {
      await (await remote()).put(name, buffer, contentType);
      reportSuccess(DEP, Date.now() - started);
      return;
    } catch (err) {
      reportFailure(DEP, err);
      console.warn('Upload to object storage failed; keeping the file locally until it can be copied:', (err as Error)?.message);
    }
  }
  await keepLocally(name, buffer, true);
}

/** Copies files saved locally during an outage to the object storage. Runs as a background job. */
export async function syncPendingUploads() {
  if (storageMode === 'local' || !isUp(DEP)) return;
  const names = (await fs.promises.readdir(PENDING_DIR).catch(() => [] as string[])).filter(n => SAFE_NAME.test(n));
  for (const name of names) {
    try {
      const buffer = await fs.promises.readFile(path.join(UPLOAD_DIR, name));
      await (await remote()).put(name, buffer, CONTENT_TYPES[name.split('.').pop()!]);
      reportSuccess(DEP);
      await fs.promises.unlink(path.join(PENDING_DIR, name));
    } catch (err: any) {
      if (err?.code === 'ENOENT') { await fs.promises.unlink(path.join(PENDING_DIR, name)).catch(() => {}); continue; }
      reportFailure(DEP, err);
      return;
    }
  }
}

export async function sendUpload(name: string, res: Response): Promise<void> {
  if (!SAFE_NAME.test(name)) {
    res.status(404).end();
    return;
  }
  const ext = name.split('.').pop()!;
  const setHeaders = () => {
    res.setHeader('Content-Type', CONTENT_TYPES[ext]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  };

  for (const dir of [UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
    const localPath = path.join(dir, name);
    if (fs.existsSync(localPath)) {
      setHeaders();
      fs.createReadStream(localPath).pipe(res);
      return;
    }
  }
  if (storageMode === 'local') {
    res.status(404).end();
    return;
  }
  // Storage unreachable: answer at once (not cacheable) instead of making the browser wait.
  if (!isUp(DEP)) {
    res.setHeader('Retry-After', '60');
    res.status(503).end();
    return;
  }
  let stream: Readable | null;
  try {
    stream = await (await remote()).get(name);
    reportSuccess(DEP);
  } catch (err) {
    reportFailure(DEP, err);
    res.status(503).end();
    return;
  }
  if (!stream) {
    res.status(404).end();
    return;
  }
  setHeaders();
  stream.on('error', () => { if (!res.headersSent) res.status(500).end(); else res.end(); }).pipe(res);
}
