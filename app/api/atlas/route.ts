import { atlasSummary, searchAtlas } from '@/lib/atlas';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const q=params.get('q')||'',region=params.get('region')||'';
  if(q.length>120||(region&&!/^\d{2}$/.test(region)))return Response.json({error:'Invalid search.'},{status:400});
  const raw=params.get('bbox'),bounds=raw?.split(',').map(Number);
  if(bounds&&(bounds.length!==4||bounds.some(n=>!Number.isFinite(n))||bounds[0]<-180||bounds[2]>180||bounds[1]<-90||bounds[3]>90||bounds[0]>bounds[2]||bounds[1]>bounds[3]))return Response.json({error:'Invalid map bounds.'},{status:400});
  return Response.json({summary:atlasSummary(),results:searchAtlas(q,region,bounds)},{headers:{'Cache-Control':'no-store'}});
}
