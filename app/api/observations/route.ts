import { randomUUID, randomBytes } from 'node:crypto';
import { checkOrigin } from '@/lib/auth';
import { glacier, insertObservation, rateLimit } from '@/lib/db';
import { extractMetadata, removePhoto, storePhoto } from '@/lib/images';
import { coordinate, dateFields, InputError, textField } from '@/lib/validation';
import { errorResponse, limitedForm } from '@/lib/http';
import { atlasGlacier } from '@/lib/atlas';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let storedId: string | undefined;
  try {
    checkOrigin(request);
    if (!rateLimit('uploads', 60, 3600_000)) throw new InputError('The upload limit has been reached. Please try again later.', 429);
    const form = await limitedForm(request), file = form.get('photo');
    if (!(file instanceof File)) throw new InputError('Choose a photograph to contribute.');
    if (form.get('consent') !== 'yes') throw new InputError('Please confirm permission to store and display this photograph.');
    const glacierId = textField(form, 'glacier_id', 100);
    const rgiId = textField(form,'rgi_id',100);
    if(rgiId&&!atlasGlacier(rgiId))throw new InputError('This inventory glacier could not be found. Return to the atlas and select it again.');
    if (glacierId && !glacier(glacierId)) throw new InputError('Choose a glacier from the list, or select “Not sure”.');
    const date = dateFields(textField(form,'capture_date',10), textField(form,'date_precision',10));
    const credit = textField(form,'credit',200), source = textField(form,'source',1000), caption = textField(form,'caption'), contact = textField(form,'contact',254);
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) throw new InputError('Enter a valid contact email, or leave it blank.');
    const location_description = textField(form,'location_description',1000);
    const latitude = coordinate(textField(form,'latitude',30),'latitude'), longitude = coordinate(textField(form,'longitude',30),'longitude');
    if ((latitude === null) !== (longitude === null)) throw new InputError('Provide both camera coordinates, or leave both blank.');
    const buffer = Buffer.from(await file.arrayBuffer()), extracted = await extractMetadata(buffer);
    const id = randomUUID(), receipt = randomBytes(32).toString('hex');
    const image = await storePhoto(id, buffer); storedId = id;
    insertObservation({ id, glacier_id: glacierId || null, rgi_id:rgiId||null, viewpoint_id: null, filename: file.name.slice(0,255), ...image, ...date,
      approximate: form.get('approximate') === 'yes' ? 1 : 0,
      metadata_source: date.capture_date ? (extracted.date === date.capture_date && date.date_precision === 'day' ? 'Camera metadata · confirmed by contributor' : 'Contributor supplied') : 'Date not supplied',
      latitude, longitude, location_description, credit, source, caption, contact,
      permission: 'HiGO permission v1: contributor confirms ownership or authorization, consents to private original storage and public display with attribution after review. No third-party reuse license granted.',
      status: 'pending', receipt_token: receipt, created_at: new Date().toISOString(), extracted_metadata: JSON.stringify(extracted) });
    storedId = undefined;
    return Response.json({ receiptUrl: `/submission/${receipt}` }, { status: 201 });
  } catch (error) { if (storedId) await removePhoto(storedId).catch(() => {}); return errorResponse(error); }
}
