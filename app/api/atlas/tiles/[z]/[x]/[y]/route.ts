import { atlasDb } from '@/lib/atlas';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{z:string;x:string;y:string}>}) {
  const {z:zs,x:xs,y:ys}=await params;
  if(![zs,xs,ys].every(s=>/^\d{1,4}$/.test(s))) return new Response(null,{status:400});
  const z=+zs,x=+xs,y=+ys;
  if(z>10||x>=2**z||y>=2**z)return new Response(null,{status:400});
  const database=atlasDb();if(!database)return new Response(null,{status:503});
  const tile=database.prepare('SELECT data FROM tiles WHERE z=? AND x=? AND y=?').get(z,x,y) as {data:Uint8Array}|undefined;
  return new Response(tile?new Uint8Array(tile.data):null,{status:tile?200:204,headers:{'Content-Type':'application/vnd.mapbox-vector-tile','Cache-Control':'public, max-age=3600'}});
}
