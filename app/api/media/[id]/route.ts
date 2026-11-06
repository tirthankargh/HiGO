import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/auth';
import { dataDir, observation } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const o = observation((await params).id), variant = new URL(request.url).searchParams.get('variant') || 'display';
  if (!o || !['display','thumb','original'].includes(variant)) return new Response('Not found',{ status: 404 });
  if ((o.status !== 'approved' || variant === 'original') && !await isAdmin()) return new Response('Not found',{ status: 404 });
  try {
    const bytes = await readFile(path.join(dataDir(), variant === 'original' ? o.original_path : variant === 'thumb' ? o.thumb_path : o.display_path));
    return new Response(bytes,{ headers: { 'Content-Type': variant === 'original' ? 'application/octet-stream' : 'image/webp', 'Cache-Control': 'private, no-store', ...(variant === 'original' ? { 'Content-Disposition': `attachment; filename="${o.id}-original"` } : {}) } });
  } catch { return new Response('Not found',{ status:404 }); }
}
