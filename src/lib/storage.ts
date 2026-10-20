import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { getStorage } from 'firebase-admin/storage';
import './firebase-admin.ts';

// Uploaded images are stored in a Cloud Storage bucket when UPLOAD_BUCKET is set
// (container disks on Cloud Run are wiped on every restart/deploy), and on the local
// disk otherwise (development). Either way they are served from /uploads/<name>.

// Kept outside public/ so user uploads are never copied into the client build.
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
// Files uploaded by earlier versions live here and are still served.
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');
const BUCKET_NAME = process.env.UPLOAD_BUCKET || '';
const PREFIX = 'uploads/';
const SAFE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;

export const storageMode = BUCKET_NAME ? 'bucket' : 'local';

if (storageMode === 'local' && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (storageMode === 'local' && process.env.NODE_ENV === 'production') {
  console.warn('UPLOAD_BUCKET is not set: uploads are stored on the local disk and will be lost when the container restarts.');
}

function bucket() {
  return getStorage().bucket(BUCKET_NAME);
}

export async function saveUpload(name: string, buffer: Buffer, contentType: string): Promise<void> {
  if (storageMode === 'bucket') {
    await bucket().file(PREFIX + name).save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    return;
  }
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer);
}

const CONTENT_TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function sendUpload(name: string, res: Response): Promise<void> {
  if (!SAFE_NAME.test(name)) {
    res.status(404).end();
    return;
  }
  const ext = name.split('.').pop()!;
  res.setHeader('Content-Type', CONTENT_TYPES[ext]);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");

  for (const dir of [UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
    const localPath = path.join(dir, name);
    if (fs.existsSync(localPath)) {
      fs.createReadStream(localPath).pipe(res);
      return;
    }
  }
  if (storageMode !== 'bucket') {
    res.status(404).end();
    return;
  }
  const file = bucket().file(PREFIX + name);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).end();
    return;
  }
  file.createReadStream()
    .on('error', () => { if (!res.headersSent) res.status(500).end(); else res.end(); })
    .pipe(res);
}
