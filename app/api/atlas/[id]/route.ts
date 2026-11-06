import { atlasDetail } from '@/lib/atlas';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const record=atlasDetail((await params).id);
  return record?Response.json(record,{headers:{'Cache-Control':'no-store'}}):Response.json({error:'Glacier not found.'},{status:404});
}
