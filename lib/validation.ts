import type { Crop, Precision } from './types';
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function textField(form: FormData, key: string, max = 2000) {
  const v = form.get(key);
  if (v !== null && typeof v !== 'string') throw new InputError(`Invalid ${key}.`);
  const value = (v || '').trim();
  if (value.length > max) throw new InputError(`${key} is too long (maximum ${max} characters).`);
  return value;
}
export function dateFields(date: string, precision: string) {
  if (!['unknown','year','month','day'].includes(precision)) throw new InputError('Choose a date precision.');
  if (precision === 'unknown') return { capture_date: null, date_precision: 'unknown' as Precision };
  const patterns: Record<string, RegExp> = { year: /^\d{4}$/, month: /^\d{4}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/ };
  if (!patterns[precision].test(date)) throw new InputError('Enter a date matching the selected precision.');
  const full = date + (precision === 'year' ? '-01-01' : precision === 'month' ? '-01' : '');
  const parsed = new Date(full + 'T00:00:00Z');
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0,10) !== full || +date.slice(0,4) < 1800 || full > new Date().toISOString().slice(0,10)) throw new InputError('Enter a valid capture date between 1800 and today.');
  return { capture_date: date, date_precision: precision as Precision };
}
export function coordinate(value: string, axis: 'latitude' | 'longitude') {
  if (!value) return null;
  const n = Number(value), bound = axis === 'latitude' ? 90 : 180;
  if (!Number.isFinite(n) || Math.abs(n) > bound) throw new InputError(`Invalid ${axis}.`);
  return n;
}
export function parseCrop(value: string): Crop {
  let c: Crop;
  try { c = JSON.parse(value); } catch { throw new InputError('Invalid crop.'); }
  if (!c || ['left','top','width','height'].some(k => !Number.isFinite(c[k as keyof Crop]))) throw new InputError('Crop must contain numeric percentages.');
  if (c.left < 0 || c.top < 0 || c.width < 1 || c.height < 1 || c.left + c.width > 100 || c.top + c.height > 100) throw new InputError('Crop must fit inside the original image.');
  return c;
}
export function dateBounds(value: string) {
  const start = value + (value.length === 4 ? '-01-01' : value.length === 7 ? '-01' : '');
  let end = start;
  if (value.length === 4) end = value + '-12-31';
  if (value.length === 7) end = value + '-' + new Date(Date.UTC(+value.slice(0,4), +value.slice(5,7), 0)).getUTCDate();
  return { start, end };
}
