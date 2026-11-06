import { checkOrigin, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { errorResponse } from '@/lib/http';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { checkOrigin(request); await requireAdmin(); db().prepare('UPDATE comparisons SET status=\'draft\' WHERE id=?').run((await params).id); return Response.json({ ok: true }); }
  catch(error) { return errorResponse(error); }
}
