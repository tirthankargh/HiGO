import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
async function main() {
  let env = existsSync('.env.local') ? await readFile('.env.local', 'utf8') : '';
  for (const key of ['ADMIN_PASSWORD', 'SESSION_SECRET']) {
    if (!new RegExp(`^${key}=.+$`, 'm').test(env)) {
      env = env.replace(new RegExp(`^${key}=.*$`, 'm'), '');
      env += `\n${key}=${randomBytes(key === 'SESSION_SECRET' ? 48 : 18).toString('base64url')}\n`;
    }
  }
  await writeFile('.env.local', env, { mode: 0o600 });
  process.loadEnvFile('.env.local');
  const { seed } = await import('../lib/seed');
  await seed();
  const { importAtlas } = await import('./import-atlas');
  await importAtlas();
  console.log('HiGO is ready. Six seed photos imported without changing their originals.');
  console.log('Your admin password is in .env.local (ADMIN_PASSWORD). Keep this file private.');
  console.log('Start the app with npm run dev, then visit /admin.');
}
main().catch(error => { console.error('Setup failed:', error.message); process.exitCode = 1; });
