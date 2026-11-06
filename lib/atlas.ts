import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { dataDir, db, published, publicObservation } from './db';
import { DRANG_RGI, type AtlasGlacier, type AtlasSummary, type AtlasDetail } from './atlas-types';
import type { Observation } from './types';
import { photoDate } from './format';

export function atlasPath() { return path.resolve(process.env.HIGO_ATLAS_PATH || path.join(dataDir(),'atlas.sqlite')); }
let connection:DatabaseSync|undefined;
export function atlasDb() {
  if(connection) return connection;
  if(!existsSync(atlasPath())) return null;
  connection=new DatabaseSync(atlasPath(),{readOnly:true});
  return connection;
}
export function atlasSummary():AtlasSummary {
  const database=atlasDb();
  if(!database) return {available:false,count:0,regions:[],bounds:null};
  const r=database.prepare('SELECT count(*) AS count,min(west) AS west,min(south) AS south,max(east) AS east,max(north) AS north FROM inventory').get() as {count:number;west:number;south:number;east:number;north:number};
  return {available:true,count:r.count,regions:database.prepare('SELECT region AS id,count(*) AS count FROM inventory GROUP BY region').all().map(r=>({...r})) as AtlasSummary['regions'],bounds:[r.west,r.south,r.east,r.north]};
}
export function atlasGlacier(id:string):AtlasGlacier|null {
  const row=atlasDb()?.prepare('SELECT * FROM inventory WHERE id=?').get(id);
  return row?{...row} as AtlasGlacier:null;
}
export function atlasDetail(id:string):AtlasDetail|null {
  const g=atlasGlacier(id); if(!g) return null;
  const photos=(db().prepare("SELECT * FROM observations WHERE rgi_id=? AND status='approved' ORDER BY capture_date DESC").all(id) as Observation[]).map(publicObservation);
  const nearby=id===DRANG_RGI?published('drang-drang'):[];
  const cover=nearby.find(p=>p.id==='drang-2023')||nearby[0];
  return {...g,photos,relatedJournal:id===DRANG_RGI?{slug:'drang-drang',name:'Drang Drung',count:nearby.length,cover:cover?.id||null,coverCredit:cover?.credit||'Photographer unconfirmed',coverDate:cover?photoDate(cover):'Date unknown',provisional:true}:null};
}
export function searchAtlas(query:string,region:string,bounds?:number[]) {
  const database=atlasDb(); if(!database) return [];
  const terms:string[]=[],args:(string|number)[]=[];
  if(query.trim()) {
    const q=query.trim().replace(/[\\%_]/g,'\\$&');
    terms.push("(name LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\' OR (id=? AND ? LIKE '%drang%'))");
    args.push(`%${q}%`,`%${q}%`,DRANG_RGI,query.toLowerCase());
  }
  if(region){terms.push('region=?');args.push(region);}
  if(bounds){terms.push('east>=? AND west<=? AND north>=? AND south<=?');args.push(bounds[0],bounds[2],bounds[1],bounds[3]);}
  return database.prepare(`SELECT * FROM inventory ${terms.length?'WHERE '+terms.join(' AND '):''} ORDER BY CASE WHEN id='${DRANG_RGI}' THEN 0 ELSE 1 END, area DESC LIMIT 30`).all(...args).map(r=>({...r})) as AtlasGlacier[];
}
