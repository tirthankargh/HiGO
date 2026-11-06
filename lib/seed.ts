import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db, insertObservation, observation } from './db';
import { extractMetadata, removePhoto, storePhoto } from './images';
export async function seed() {
  const insert = db().prepare('INSERT OR IGNORE INTO glaciers(id,name,region,introduction,hero_id) VALUES (?,?,?,?,?)');
  insert.run('drang-drang','Drang Drung','Zanskar · Ladakh', 'A broad river of ice bends between steep mountain walls. These three photographs look into the same valley, each with its own framing and conditions. Together, they begin a record that future observations can extend.', 'drang-2023');
  insert.run('panchinala','Panchinala','Lahaul · Himachal Pradesh', 'At the meeting of rock, ice, and water, the details matter. This small collection moves from a wide view with trekkers to the texture of an ice face. It is a starting point for returning to—and recording—the same place.', 'panchi-wide');
  const photos = [
    { id: 'drang-2023', file: 'drang drang/IMG_4305.jpg', glacier: 'drang-drang', date: '2023-10-02', credit: 'bibek nandi', caption: 'A sweeping view along the glacier valley.' },
    { id: 'drang-undated', file: 'drang drang/IMG_5042.jpg', glacier: 'drang-drang', date: null, credit: '', caption: 'A monochrome view of the glacier. Capture date and original source are unconfirmed.' },
    { id: 'drang-snow', file: 'drang drang/image3.jpg', glacier: 'drang-drang', date: null, credit: '', caption: 'Snow across the glacier, with water visible in the foreground.' },
    { id: 'panchi-wide', file: 'Panchinala/DSCF1629.jpg', glacier: 'panchinala', date: null, credit: '', caption: 'Trekkers in the foreground give a sense of scale to the ice face beyond.' },
    { id: 'panchi-20240609', file: 'Panchinala/DSCF1628.jpg', glacier: 'panchinala', date: '2024-06-09', credit: '', caption: 'A view from the ice face towards the snow-covered slopes above.' },
    { id: 'panchi-20240610', file: 'Panchinala/DSCF1638.jpg', glacier: 'panchinala', date: '2024-06-10', credit: '', caption: 'Layers, debris, and texture at the glacier’s edge.' }
  ];
  for (const p of photos) {
    if (observation(p.id)) continue;
    const buffer = await readFile(path.join(process.cwd(), p.file));
    const image = await storePhoto(p.id, buffer);
    try {
      insertObservation({ id: p.id, glacier_id: p.glacier, viewpoint_id: null, filename: path.basename(p.file), ...image,
        capture_date: p.date, date_precision: p.date ? 'day' : 'unknown', approximate: 0, metadata_source: p.date ? 'Camera metadata · not independently verified' : 'Date not supplied',
        latitude: null, longitude: null, location_description: '', credit: p.credit, source: 'Supplied HiGO collection', caption: p.caption,
        contact: '', permission: 'Supplied by project owner for the local HiGO demo; original attribution and third-party reuse rights remain unconfirmed.',
        status: 'approved', receipt_token: null, created_at: new Date().toISOString(), extracted_metadata: JSON.stringify(await extractMetadata(buffer)) });
    } catch (error) { await removePhoto(p.id); throw error; }
  }
}
