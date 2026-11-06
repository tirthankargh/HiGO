import { checkOrigin, session } from '@/lib/auth';
import { errorResponse } from '@/lib/http';
export async function POST(request: Request) {
  try { checkOrigin(request); (await session()).destroy(); return Response.json({ ok: true }); }
  catch(error) { return errorResponse(error); }
}
