import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Response } from 'express';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { backups } from '../db/schema.ts';
import { putSystemObject, getSystemObject, deleteSystemObject, storageMode } from './storage.ts';
import { tehranParts } from './time.ts';

// Daily database backups with pg_dump (custom format, compressed). The dump is kept on this
// server and, when object storage is configured, copied there too (off the server, so a lost
// disk does not lose the backups). Old backups are removed after BACKUP_KEEP_DAYS.
// Restore: pg_restore --clean --no-owner -d <database> mevent-<time>.dump

export const backupsEnabled = process.env.BACKUP_ENABLED !== 'false';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const KEEP_DAYS = Math.max(1, Number(process.env.BACKUP_KEEP_DAYS) || 14);
/** Tehran hour after which the day's backup runs (default 3 a.m.). */
const BACKUP_HOUR = Math.min(23, Math.max(0, Number(process.env.BACKUP_HOUR ?? 3)));
const FILE_NAME = /^mevent-[0-9T-]+\.dump$/;

function pgDump(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PG_DUMP_PATH || 'pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file], {
      env: {
        ...process.env,
        PGHOST: process.env.SQL_HOST || process.env.PGHOST || '',
        PGPORT: process.env.PGPORT || '5432',
        PGUSER: process.env.SQL_ADMIN_USER || process.env.SQL_USER || '',
        PGPASSWORD: process.env.SQL_ADMIN_USER ? process.env.SQL_ADMIN_PASSWORD || '' : process.env.SQL_PASSWORD || '',
        PGDATABASE: process.env.SQL_DB_NAME || '',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', err => reject(new Error((err as any).code === 'ENOENT' ? 'pg_dump پیدا نشد؛ بسته postgresql-client را روی سرور نصب کنید.' : err.message)));
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(stderr.trim().slice(0, 500) || `pg_dump exited with ${code}`))));
  });
}

/**
 * Takes a backup now. A scheduled backup runs at most once per Tehran day across all instances
 * (the day column is unique); returns null when another instance already took it.
 */
export async function runBackup(kind: 'SCHEDULED' | 'MANUAL') {
  const p = tehranParts(new Date());
  const day = kind === 'SCHEDULED' ? `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : null;
  const [row] = await db.insert(backups).values({ kind, day }).onConflictDoNothing().returning();
  if (!row) return null;

  const fileName = `mevent-${new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '')}.dump`;
  const file = path.join(BACKUP_DIR, fileName);
  try {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    await pgDump(file);
    const { size } = await fs.promises.stat(file);
    const offsite = await putSystemObject(`backups/${fileName}`, await fs.promises.readFile(file));
    const [done] = await db.update(backups).set({
      status: 'DONE', fileName, sizeBytes: size, finishedAt: new Date(),
      location: offsite ? storageMode : 'local',
      error: !offsite && storageMode !== 'local' ? 'فضای ذخیره‌سازی در دسترس نبود؛ فقط نسخه روی سرور موجود است.' : null,
    }).where(eq(backups.id, row.id)).returning();
    await pruneBackups();
    return done;
  } catch (err: any) {
    await fs.promises.unlink(file).catch(() => {});
    const [failed] = await db.update(backups).set({ status: 'FAILED', error: String(err?.message || err).slice(0, 500), finishedAt: new Date() })
      .where(eq(backups.id, row.id)).returning();
    throw Object.assign(new Error(`backup failed: ${failed.error}`), { backup: failed });
  }
}

/** Background job: the day's backup once the configured hour has passed. */
export async function scheduledBackup() {
  if (!backupsEnabled || tehranParts(new Date()).hour < BACKUP_HOUR) return;
  await runBackup('SCHEDULED');
}

async function pruneBackups() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000);
  const old = await db.select().from(backups).where(and(lt(backups.startedAt, cutoff), eq(backups.status, 'DONE')));
  for (const b of old) {
    if (!b.fileName) continue;
    await fs.promises.unlink(path.join(BACKUP_DIR, b.fileName)).catch(() => {});
    if (b.location !== 'local') await deleteSystemObject(`backups/${b.fileName}`).catch(() => {});
    await db.update(backups).set({ status: 'EXPIRED' }).where(eq(backups.id, b.id));
  }
}

/** Streams a backup file to an admin (local copy first, then object storage). */
export async function sendBackup(id: number, res: Response) {
  const [b] = await db.select().from(backups).where(eq(backups.id, id));
  if (!b || b.status !== 'DONE' || !b.fileName || !FILE_NAME.test(b.fileName)) { res.status(404).json({ error: 'نسخه پشتیبان یافت نشد' }); return; }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${b.fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  const local = path.join(BACKUP_DIR, b.fileName);
  if (fs.existsSync(local)) { fs.createReadStream(local).pipe(res); return; }
  const stream = b.location !== 'local' ? await getSystemObject(`backups/${b.fileName}`).catch(() => null) : null;
  if (!stream) { res.removeHeader('Content-Disposition'); res.status(404).json({ error: 'فایل این نسخه در دسترس نیست' }); return; }
  stream.pipe(res);
}
