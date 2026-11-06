import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/auth';
import { comparison, dataDir, observation } from '@/lib/db';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; side: string }> }) {
  const { id, side } = await params, pair = comparison(id);
  if (!pair || !['before','after'].includes(side)) return new Response('Not found',{ status:404 });
  const visible = pair.status === 'approved' && observation(pair.before_id)?.status === 'approved' && observation(pair.after_id)?.status === 'approved';
  if (!visible && !await isAdmin()) return new Response('Not found',{ status:404 });
  try { return new Response(await readFile(path.join(dataDir(),'comparisons',id,`${side}.webp`)),{ headers: { 'Content-Type':'image/webp', 'Cache-Control':'private, no-store' } }); }
  catch { return new Response('Not found',{ status:404 }); }
}
