import { InputError, MAX_BYTES } from './validation';
export function errorResponse(error: unknown) {
  if (error instanceof InputError) return Response.json({ error: error.message }, { status: error.status });
  console.error('HiGO operation failed:', error instanceof Error ? error.message : 'Unknown failure');
  return Response.json({ error: 'We could not save this change. Please try again.' }, { status: 500 });
}
export async function limitedForm(request: Request, limit = MAX_BYTES + 128 * 1024) {
  if (Number(request.headers.get('content-length')) > limit) throw new InputError('This upload is too large. The limit is 20 MB per photo.', 413);
  if (!request.body) throw new InputError('No form was received.');
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length;
    if (bytes > limit) { await reader.cancel(); throw new InputError('This upload is too large.', 413); } chunks.push(value); }
  try { return await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type') || '' } }).formData(); }
  catch { throw new InputError('We could not read the upload. Please select the photo again.'); }
}
