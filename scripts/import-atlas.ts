// Rebuild a separate, derived catalogue. Original shapefiles and photo storage are untouched.
import { readdir, readFile, mkdir, rename, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { open } from 'shapefile';
import geojsonvt from 'geojson-vt';
import { fromGeojsonVt } from 'vt-pbf';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry, FeatureCollection } from 'geojson';

export async function importAtlas() {
  const root=process.cwd();
  const folders=(await readdir(root,{withFileTypes:true})).filter(d=>d.isDirectory()&&/^RGI2000-v7\.0-G-\d\d_/.test(d.name)).map(d=>d.name).sort();
  if(!folders.length) {console.log('No RGI v7 outline directories found. Atlas import skipped.');return;}
  const output=path.resolve(process.env.HIGO_ATLAS_PATH||path.join(process.env.HIGO_DATA_DIR||'data','atlas.sqlite'));
  await mkdir(path.dirname(output),{recursive:true});
  const temp=output+'.importing'; await rm(temp,{force:true});
  const database=new DatabaseSync(temp);
  try {
    database.exec(`CREATE TABLE inventory (id TEXT PRIMARY KEY,name TEXT NOT NULL,region TEXT NOT NULL,longitude REAL,latitude REAL,area REAL,source_date TEXT,min_elevation REAL,max_elevation REAL,west REAL,south REAL,east REAL,north REAL);
      CREATE INDEX inventory_region ON inventory(region); CREATE INDEX inventory_bounds ON inventory(west,east,south,north);
      CREATE TABLE tiles (z INTEGER,x INTEGER,y INTEGER,data BLOB,PRIMARY KEY(z,x,y));`);
    const insert=database.prepare('INSERT INTO inventory VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const polygons:Feature<Geometry>[]=[]; const points:Feature<Geometry>[]=[];
    database.exec('BEGIN');
    for(const folder of folders) {
      const names=await readdir(folder),shp=names.find(n=>n.endsWith('.shp'));
      if(!shp) throw new Error(`Missing shapefile: ${folder}`);
      const prj=await readFile(path.join(folder,shp.replace(/\.shp$/,'.prj')),'utf8');
      if(!/GCS_WGS_1984|WGS 84/.test(prj)||/PROJCS/.test(prj)) throw new Error(`Expected WGS84 geographic coordinates in ${folder}`);
      const source=await open(path.join(folder,shp),undefined,{encoding:'utf-8'});
      let count=0;
      while(true) {
        const result=await source.read(); if(result.done) break;
        const f=result.value, p=f.properties!;
        if(!['Polygon','MultiPolygon'].includes(f.geometry.type)) throw new Error('Expected polygon geometry');
        let west=180,south=90,east=-180,north=-90;
        function bounds(c:unknown) { if(!Array.isArray(c))return; if(typeof c[0]==='number'){west=Math.min(west,c[0]);east=Math.max(east,c[0]);south=Math.min(south,c[1]);north=Math.max(north,c[1]);} else c.forEach(bounds); }
        bounds((f.geometry as GeoJSON.Polygon).coordinates);
        const id=String(p.rgi_id),region=String(p.o1region).padStart(2,'0');
        const sourceDate=String(p.src_date||'').slice(0,10);
        if(![p.cenlon,p.cenlat,p.area_km2].every(n=>typeof n==='number'&&Number.isFinite(n))||p.area_km2<=0)throw new Error(`Invalid centre or area for ${id}`);
        insert.run(id,String(p.glac_name||''),region,+p.cenlon,+p.cenlat,+p.area_km2,/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)?sourceDate:null,+p.zmin_m>0?+p.zmin_m:null,+p.zmax_m>0?+p.zmax_m:null,west,south,east,north);
        const props={id,region};
        polygons.push({type:'Feature',properties:props,geometry:f.geometry});
        points.push({type:'Feature',properties:props,geometry:{type:'Point',coordinates:[+p.cenlon,+p.cenlat]}}); count++;
      }
      console.log(`${folder}: ${count.toLocaleString()} glacier outlines`);
    }
    database.exec('COMMIT');
    console.log('Building local vector tiles (zooms 0–10)…');
    const polyIndex=new geojsonvt({type:'FeatureCollection',features:polygons},{maxZoom:10,tolerance:2,indexMaxZoom:4});
    const pointIndex=new geojsonvt({type:'FeatureCollection',features:points},{maxZoom:10,indexMaxZoom:4});
    const tileInsert=database.prepare('INSERT INTO tiles VALUES (?,?,?,?)');let tileCount=0;
    // Follow point occupancy, including tiny glaciers simplified out at low zooms.
    const visit=(z:number,x:number,y:number)=>{
      const outlines=polyIndex.getTile(z,x,y),centers=pointIndex.getTile(z,x,y);
      if(!outlines?.features.length&&!centers?.features.length)return;
      const layers:Record<string,unknown>={};
      if(outlines?.features.length) layers.outlines=outlines;
      if(z<=6&&centers?.features.length) layers.centers=centers;
      if(Object.keys(layers).length){tileInsert.run(z,x,y,fromGeojsonVt(layers as Parameters<typeof fromGeojsonVt>[0]));tileCount++;}
      if(z<10)for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)visit(z+1,x*2+dx,y*2+dy);
    };
    database.exec('BEGIN');visit(0,0,0);database.exec('COMMIT');
    database.close(); await rename(temp,output);
    const world=JSON.parse(await readFile(path.join(root,'node_modules/world-atlas/land-110m.json'),'utf8')) as Topology<{land:GeometryCollection}>;
    await mkdir('public/atlas',{recursive:true});
    await writeFile('public/atlas/land.json',JSON.stringify(feature(world,world.objects.land) as FeatureCollection));
    console.log(`Atlas ready: ${polygons.length.toLocaleString()} records, ${tileCount.toLocaleString()} tiles. Restart the app after reimporting.`);
  } catch(e) {try{database.close();}catch{} await rm(temp,{force:true});throw e;}
}
if(process.argv[1]?.endsWith('import-atlas.ts')) {
  if(existsSync('.env.local'))process.loadEnvFile('.env.local');
  importAtlas().catch(e=>{console.error(e);process.exitCode=1;});
}
