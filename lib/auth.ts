import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { timingSafeEqual, createHash } from 'node:crypto';
import { InputError } from './validation';
import { rateLimit } from './db';
export type AdminSession = { admin?: boolean; authenticatedAt?: number; credentialFingerprint?: string };
function fingerprint() { return createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex'); }
export async function session() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32 || !process.env.ADMIN_PASSWORD) throw new InputError('Admin access is not configured. Run npm run setup.', 503);
  return getIronSession<AdminSession>(await cookies(), { password, cookieName: 'higo_admin', ttl: 8 * 3600,
    cookieOptions: { httpOnly: true, sameSite: 'strict', secure: process.env.HIGO_HTTPS === 'true', path: '/' } });
}
export async function isAdmin() {
  try { const s = await session(); return s.admin === true && s.credentialFingerprint === fingerprint() && Date.now() - (s.authenticatedAt || 0) < 8 * 3600 * 1000; } catch { return false; }
}
export async function requireAdmin() { if (!await isAdmin()) throw new InputError('Please sign in to review observations.', 401); }
export async function login(password: string) {
  if (!rateLimit('admin-login', 10, 15 * 60_000)) throw new InputError('Too many sign-in attempts. Try again in 15 minutes.', 429);
  const s = await session();
  if (!timingSafeEqual(createHash('sha256').update(password).digest(), createHash('sha256').update(process.env.ADMIN_PASSWORD!).digest())) throw new InputError('That password was not recognised.', 401);
  s.admin = true; s.authenticatedAt = Date.now(); s.credentialFingerprint = fingerprint(); await s.save();
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Next can normalize request.url to localhost even when the browser used 127.0.0.1.
  // Compare against the incoming Host, never a user-supplied forwarded-host header.
  const host = request.headers.get('host') || new URL(request.url).host;
  const protocol = process.env.HIGO_HTTPS === 'true' ? 'https:' : new URL(request.url).protocol;
  let valid = false;
  try {
    const candidate = new URL(origin || '');
    valid = origin === `${protocol}//${host}` && ['localhost', '127.0.0.1', '[::1]'].includes(candidate.hostname);
  } catch { /* An absent or malformed origin is not a browser form submission. */ }
  if (!valid) throw new InputError('Please submit this form from HiGO.', 403);
}
