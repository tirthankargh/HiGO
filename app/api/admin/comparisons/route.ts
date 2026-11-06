import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { checkOrigin, requireAdmin } from '@/lib/auth';
import { dataDir, db, observation } from '@/lib/db';
import { comparisonImage } from '@/lib/images';
import { errorResponse, limitedForm } from '@/lib/http';
import { dateBounds, InputError, parseCrop, textField } from '@/lib/validation';
export async function POST(request: Request) {
  let created: string | undefined;
  try {
    checkOrigin(request); await requireAdmin(); const form = await limitedForm(request, 10000);
    const before = observation(textField(form,'before_id',100)), after = observation(textField(form,'after_id',100));
    if (!before || !after || before.id === after.id || !before.glacier_id || before.glacier_id !== after.glacier_id) throw new InputError('Choose two different photographs from the same glacier.');
    if (before.status !== 'approved' || after.status !== 'approved') throw new InputError('Both photographs must be approved first.');
    if (!before.capture_date || !after.capture_date || dateBounds(before.capture_date).end >= dateBounds(after.capture_date).start) throw new InputError('Dates must establish an earlier and a later photograph without overlapping ranges.');
    if (form.get('aligned') !== 'yes') throw new InputError('Confirm the framing, viewpoint, chronology, and seasonal comparability.');
    const left = parseCrop(textField(form,'before_crop',300)), right = parseCrop(textField(form,'after_crop',300));
    const caption = textField(form,'caption');
    if (!caption) throw new InputError('Describe the comparison and its limitations.');
    const id = randomUUID(), dir = path.join(dataDir(),'comparisons',id);
    const [a,b] = await Promise.all([comparisonImage(before.original_path,left),comparisonImage(after.original_path,right)]);
    await mkdir(dir,{ recursive: true, mode: 0o700 }); created = dir;
    await writeFile(path.join(dir,'before.webp'),a); await writeFile(path.join(dir,'after.webp'),b);
    db().prepare('INSERT INTO comparisons VALUES (?,?,?,?,?,?,?,?,?)').run(id,before.glacier_id,before.id,after.id,JSON.stringify(left),JSON.stringify(right),caption,'approved',new Date().toISOString());
    created = undefined; return Response.json({ ok: true, id });
  } catch(error) { if (created) await rm(created,{ recursive: true, force: true }); return errorResponse(error); }
}
