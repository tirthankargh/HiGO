import { photographedGlaciers } from '@/lib/atlas';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){return Response.json({glaciers:photographedGlaciers()},{headers:{'Cache-Control':'no-store'}});}
