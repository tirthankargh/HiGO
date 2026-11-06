import type { PublicObservation } from './types';
export function photoDate(o: Pick<PublicObservation, 'capture_date' | 'date_precision' | 'approximate'>) {
  if (!o.capture_date || o.date_precision === 'unknown') return 'Date unknown';
  const d = o.capture_date;
  const label = o.date_precision === 'year' ? d : new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', ...(o.date_precision === 'day' ? { day: 'numeric' as const } : {}), timeZone: 'UTC' }).format(new Date((d.length === 7 ? d + '-01' : d) + 'T00:00:00Z'));
  return (o.approximate ? 'Around ' : '') + label;
}
export function creditLabel(credit: string) { return credit || 'Photographer unconfirmed'; }
