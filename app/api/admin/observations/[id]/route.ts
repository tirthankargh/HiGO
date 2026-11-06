import { randomUUID } from 'node:crypto';
import { checkOrigin, requireAdmin } from '@/lib/auth';
import { db, glacier, observation } from '@/lib/db';
import { errorResponse, limitedForm } from '@/lib/http';
import { coordinate, dateFields, InputError, textField } from '@/lib/validation';
import { atlasGlacier } from '@/lib/atlas';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request); await requireAdmin(); const { id } = await params;
    if (!observation(id)) throw new InputError('Observation not found.',404);
    const form = await limitedForm(request, 16000), glacierId = textField(form,'glacier_id',100), status = textField(form,'status',20);
    const rgiId=textField(form,'rgi_id',100);
    if(rgiId&&!atlasGlacier(rgiId))throw new InputError('Choose an RGI ID from the imported atlas, or leave it blank.');
    if (glacierId && !glacier(glacierId)) throw new InputError('Choose an existing glacier.');
    if (!['pending','approved','rejected'].includes(status)) throw new InputError('Invalid review status.');
    if (status === 'approved' && !glacierId && !rgiId) throw new InputError('Assign a journal or inventory glacier before publishing.');
    const date = dateFields(textField(form,'capture_date',10),textField(form,'date_precision',10));
    const latitude = coordinate(textField(form,'latitude',30),'latitude'), longitude = coordinate(textField(form,'longitude',30),'longitude');
    if ((latitude === null) !== (longitude === null)) throw new InputError('Provide both camera coordinates, or neither.');
    const caption = textField(form,'caption'), credit = textField(form,'credit',200), source = textField(form,'source',1000), location = textField(form,'location_description',1000), metadata = textField(form,'metadata_source',300);
    const viewpoint = textField(form,'viewpoint',200);
    if (viewpoint && !glacierId) throw new InputError('Assign a glacier before adding a viewpoint.');
    let viewpointId: string | null = null;
    const database = db(); database.exec('BEGIN');
    try {
      if (viewpoint) { database.prepare('INSERT OR IGNORE INTO viewpoints(id,glacier_id,name) VALUES (?,?,?)').run(randomUUID(),glacierId,viewpoint);
        viewpointId = (database.prepare('SELECT id FROM viewpoints WHERE glacier_id=? AND name=?').get(glacierId,viewpoint) as { id: string }).id; }
      database.prepare(`UPDATE observations SET glacier_id=?,viewpoint_id=?,capture_date=?,date_precision=?,approximate=?,metadata_source=?,latitude=?,longitude=?,location_description=?,credit=?,source=?,caption=?,status=? WHERE id=?`).run(glacierId || null, viewpointId, date.capture_date,date.date_precision,form.get('approximate')==='yes'?1:0,metadata || 'Curator supplied',latitude,longitude,location,credit,source,caption,status,id);
      // Metadata changes invalidate previous alignment/chronology approval.
      database.prepare('UPDATE observations SET rgi_id=? WHERE id=?').run(rgiId||null,id);
      database.prepare('UPDATE comparisons SET status=\'draft\' WHERE before_id=? OR after_id=?').run(id,id);
      database.exec('COMMIT');
    } catch(error) { database.exec('ROLLBACK'); throw error; }
    return Response.json({ ok: true });
  } catch(error) { return errorResponse(error); }
}
