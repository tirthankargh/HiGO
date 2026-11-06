import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const { db, dataDir } = await import('../lib/db');
  const { backup } = await import('node:sqlite');
  const destination = path.resolve('backups', new Date().toISOString().replaceAll(':','-'));
  await mkdir(destination, { recursive: true, mode: 0o700 });
  await backup(db(), path.join(destination, 'higo.sqlite'));
  const { atlasPath } = await import('../lib/atlas');
  if(existsSync(atlasPath())) await cp(atlasPath(),path.join(destination,'atlas.sqlite'));
  if (existsSync(path.join(dataDir(), 'photos'))) await cp(path.join(dataDir(), 'photos'), path.join(destination, 'photos'), { recursive: true });
  if (existsSync(path.join(dataDir(), 'comparisons'))) await cp(path.join(dataDir(), 'comparisons'), path.join(destination, 'comparisons'), { recursive: true });
  console.log(`Backup saved to ${destination}. Stop the app before backing up to keep files and database in sync.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
