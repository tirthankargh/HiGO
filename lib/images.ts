import sharp from 'sharp';
import exifr from 'exifr';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './db';
import { InputError, MAX_BYTES, MAX_PIXELS } from './validation';
import type { Crop } from './types';

export async function extractMetadata(buffer: Buffer) {
  try {
    const exif = await exifr.parse(buffer, { pick: ['DateTimeOriginal','Artist','Make','Model','GPSLatitude','GPSLongitude','GPSLatitudeRef','GPSLongitudeRef'] });
    const date = exif?.DateTimeOriginal;
    return {
      date: date instanceof Date && Number.isFinite(date.valueOf()) ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : null,
      credit: typeof exif?.Artist === 'string' ? exif.Artist.trim() : '',
      latitude: typeof exif?.latitude === 'number' ? exif.latitude : null,
      longitude: typeof exif?.longitude === 'number' ? exif.longitude : null,
      make: exif?.Make || null, model: exif?.Model || null
    };
  } catch { return { date: null, credit: '', latitude: null, longitude: null, make: null, model: null }; }
}
export async function storePhoto(id: string, buffer: Buffer) {
  if (!buffer.length || buffer.length > MAX_BYTES) throw new InputError('Please select an image no larger than 20 MB.', 413);
  let meta;
  try { meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata(); } catch { throw new InputError('This image could not be read. Use a JPEG, PNG, or WebP under 40 megapixels.'); }
  if (!['jpeg','png','webp'].includes(meta.format || '') || (meta.pages || 1) > 1) throw new InputError('Use a single-frame JPEG, PNG, or WebP photograph.');
  if (!meta.width || !meta.height || meta.width * meta.height > MAX_PIXELS) throw new InputError('Images must be no larger than 40 megapixels.');
  const dir = path.join(dataDir(), 'photos', id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await writeFile(path.join(dir, 'original'), buffer, { mode: 0o600 });
    const display = await sharp(buffer).autoOrient().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(dir, 'display.webp'));
    await sharp(buffer).autoOrient().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, 'thumb.webp'));
    return { original_path: `photos/${id}/original`, display_path: `photos/${id}/display.webp`, thumb_path: `photos/${id}/thumb.webp`, width: display.width, height: display.height };
  } catch (error) { await rm(dir, { recursive: true, force: true }); throw error; }
}
export async function removePhoto(id: string) { await rm(path.join(dataDir(), 'photos', id), { recursive: true, force: true }); }
export async function comparisonImage(original: string, crop: Crop) {
  const rotated = await sharp(path.join(dataDir(), original)).autoOrient().toBuffer({ resolveWithObject: true });
  const w = rotated.info.width, h = rotated.info.height;
  return sharp(rotated.data).extract({ left: Math.floor(crop.left / 100 * w), top: Math.floor(crop.top / 100 * h), width: Math.floor(crop.width / 100 * w), height: Math.floor(crop.height / 100 * h) }).resize(1600,1000,{ fit: 'cover' }).webp({ quality: 85 }).toBuffer();
}
