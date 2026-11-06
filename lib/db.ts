import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Comparison, Glacier, Observation, PublicObservation, Viewpoint } from './types';

export function dataDir() { return path.resolve(process.env.HIGO_DATA_DIR || path.join(process.cwd(), 'data')); }
let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  mkdirSync(dataDir(), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(path.join(dataDir(), 'higo.sqlite'));
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS glaciers (id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL, introduction TEXT NOT NULL, hero_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS viewpoints (id TEXT PRIMARY KEY, glacier_id TEXT NOT NULL REFERENCES glaciers(id), name TEXT NOT NULL, UNIQUE(glacier_id, name));
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY, glacier_id TEXT REFERENCES glaciers(id), viewpoint_id TEXT REFERENCES viewpoints(id), filename TEXT NOT NULL,
      original_path TEXT NOT NULL, display_path TEXT NOT NULL, thumb_path TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
      capture_date TEXT, date_precision TEXT NOT NULL DEFAULT 'unknown' CHECK(date_precision IN ('unknown','year','month','day')),
      approximate INTEGER NOT NULL DEFAULT 0, metadata_source TEXT NOT NULL, latitude REAL, longitude REAL,
      location_description TEXT NOT NULL DEFAULT '', credit TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', caption TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '', permission TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
      receipt_token TEXT UNIQUE, created_at TEXT NOT NULL, extracted_metadata TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS observation_glacier_status ON observations(glacier_id, status);
    CREATE TABLE IF NOT EXISTS comparisons (
      id TEXT PRIMARY KEY, glacier_id TEXT NOT NULL REFERENCES glaciers(id), before_id TEXT NOT NULL REFERENCES observations(id),
      after_id TEXT NOT NULL REFERENCES observations(id), before_crop TEXT NOT NULL, after_crop TEXT NOT NULL,
      caption TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','approved')), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    PRAGMA user_version=1;`);
  if (!(database.prepare('PRAGMA table_info(observations)').all() as {name:string}[]).some(c=>c.name==='rgi_id')) {
    database.exec('ALTER TABLE observations ADD COLUMN rgi_id TEXT; CREATE INDEX observation_rgi_status ON observations(rgi_id,status);');
  }
  // Correct the original seed name without overwriting any other curator edit.
  database.prepare("UPDATE glaciers SET name='Drang Drung' WHERE id='drang-drang' AND name='Drang Drang'").run();
  database.exec('PRAGMA user_version=2;');
  return database;
}
// node:sqlite returns null-prototype rows; React server/client boundaries require plain objects.
export function glaciers(): Glacier[] { return db().prepare('SELECT * FROM glaciers ORDER BY id').all().map(row=>({...row})) as Glacier[]; }
export function glacier(id: string): Glacier | undefined { const row=db().prepare('SELECT * FROM glaciers WHERE id=?').get(id); return row ? {...row} as Glacier : undefined; }
export function observation(id: string): Observation | undefined { const row=db().prepare('SELECT * FROM observations WHERE id=?').get(id); return row ? {...row} as Observation : undefined; }
export function observations(glacierId?: string): Observation[] {
  return (glacierId ? db().prepare('SELECT * FROM observations WHERE glacier_id=? ORDER BY capture_date DESC, created_at DESC').all(glacierId) : db().prepare('SELECT * FROM observations ORDER BY created_at DESC').all()).map(row=>({...row})) as Observation[];
}
export function publicObservation(o: Observation): PublicObservation {
  const { id, glacier_id, viewpoint_id, width, height, capture_date, date_precision, approximate, metadata_source, location_description, credit, source, caption } = o;
  return { id, glacier_id, viewpoint_id, width, height, capture_date, date_precision, approximate, metadata_source, location_description, credit, source, caption };
}
export function published(glacierId: string) { return observations(glacierId).filter(o => o.status === 'approved').map(publicObservation); }
export function viewpoints(glacierId: string) { return db().prepare('SELECT * FROM viewpoints WHERE glacier_id=? ORDER BY name').all(glacierId).map(row=>({...row})) as Viewpoint[]; }
export function comparison(id: string) { const row=db().prepare('SELECT * FROM comparisons WHERE id=?').get(id); return row ? {...row} as Comparison : undefined; }
export function comparisons(glacierId: string, approvedOnly = true) {
  const rows = db().prepare('SELECT * FROM comparisons WHERE glacier_id=? ORDER BY created_at DESC').all(glacierId).map(row=>({...row})) as Comparison[];
  return approvedOnly ? rows.filter(p => p.status === 'approved' && observation(p.before_id)?.status === 'approved' && observation(p.after_id)?.status === 'approved') : rows;
}
export function insertObservation(o: Observation) {
  const keys = Object.keys(o) as (keyof Observation)[];
  db().prepare(`INSERT INTO observations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => o[k] ?? null));
}
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  db().prepare('DELETE FROM rate_limits WHERE expires < ?').run(now);
  db().prepare('INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now + windowMs);
  const result = db().prepare('SELECT count FROM rate_limits WHERE key=?').get(key) as { count: number };
  return result.count <= limit;
}
