import { checkOrigin, login } from '@/lib/auth';
import { errorResponse, limitedForm } from '@/lib/http';
import { textField } from '@/lib/validation';
export async function POST(request: Request) {
  try { checkOrigin(request); const form = await limitedForm(request, 4096); await login(textField(form,'password',1024)); return Response.json({ ok: true }); }
  catch(error) { return errorResponse(error); }
}
