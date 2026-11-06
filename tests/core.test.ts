import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { dateFields, coordinate, parseCrop, dateBounds, MAX_BYTES } from '../lib/validation';
import { db, dataDir, observations, observation, published, publicObservation } from '../lib/db';
import { storePhoto, extractMetadata } from '../lib/images';
import { seed } from '../lib/seed';
import { checkOrigin } from '../lib/auth';
let directory:string;
before(async()=>{ directory=await mkdtemp(path.join(tmpdir(),'higo-unit-')); process.env.HIGO_DATA_DIR=directory; });
after(async()=>{db().close();await rm(directory,{recursive:true,force:true});});
test('dates preserve unknown and partial precision and reject impossible dates',()=>{
  assert.deepEqual(dateFields('','unknown'),{capture_date:null,date_precision:'unknown'});
  assert.equal(dateFields('2020','year').capture_date,'2020');
  assert.equal(dateFields('2020-02','month').date_precision,'month');
  assert.equal(dateFields('2020-02-29','day').capture_date,'2020-02-29');
  for(const d of ['2023-02-29','2023-13-01','2023-04-31','2999-01-01'])assert.throws(()=>dateFields(d,'day'));
  assert.throws(()=>dateFields('2023-10','day'));
  assert.deepEqual(dateBounds('2020-02'),{start:'2020-02-01',end:'2020-02-29'});
});
test('camera coordinates and image crop boundaries are validated',()=>{
  assert.equal(coordinate('','latitude'),null);assert.equal(coordinate('32.4','latitude'),32.4);
  assert.throws(()=>coordinate('91','latitude'));assert.throws(()=>coordinate('Infinity','longitude'));
  assert.throws(()=>parseCrop('{"left":90,"top":0,"width":20,"height":100}'));
  assert.throws(()=>parseCrop('null'));
});
test('origin checks tolerate Next localhost normalization and reject other origins',()=>{
  assert.doesNotThrow(()=>checkOrigin(new Request('http://localhost:3000/api/observations',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}})));
  assert.throws(()=>checkOrigin(new Request('http://localhost:3000/api/observations',{headers:{host:'127.0.0.1:3000',origin:'http://evil.example'}})));
  assert.throws(()=>checkOrigin(new Request('http://localhost:3000/api/observations')));
});
test('seed is idempotent and keeps uncertain metadata honest',async()=>{
  await seed();assert.equal(observations().length,6);
  assert.equal(Object.getPrototypeOf(observation('drang-2023')),Object.prototype);
  assert.equal(observation('drang-2023')?.credit,'bibek nandi');
  assert.equal(observation('drang-undated')?.capture_date,null);
  assert.ok(observations().every(o=>o.latitude===null&&o.longitude===null));
  db().prepare('UPDATE observations SET caption=? WHERE id=?').run('A curator correction','panchi-wide');
  await seed();assert.equal(observations().length,6);assert.equal(observation('panchi-wide')?.caption,'A curator correction');
});
test('public observation shape excludes contact, original path, precise GPS, permission, and receipt',()=>{
  const publicRow=publicObservation(observation('drang-2023')!);
  for(const field of ['contact','original_path','latitude','longitude','receipt_token','permission','extracted_metadata'])assert.equal(field in publicRow,false);
  db().prepare('UPDATE observations SET status=? WHERE id=?').run('pending','drang-2023');
  assert.equal(published('drang-drang').some(o=>o.id==='drang-2023'),false);
  db().prepare('UPDATE observations SET status=? WHERE id=?').run('approved','drang-2023');
});
test('original stays byte-identical, display is oriented and metadata stripped',async()=>{
  const original=await readFile('drang drang/IMG_4305.jpg');
  assert.equal(Buffer.compare(original,await readFile(path.join(dataDir(),observation('drang-2023')!.original_path))),0);
  const metadata=await sharp(path.join(dataDir(),observation('drang-2023')!.display_path)).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);assert.equal(metadata.xmp,undefined);
  assert.ok(Math.max(metadata.width!,metadata.height!)<=2200);
  const extracted=await extractMetadata(original);assert.equal(extracted.date,'2023-10-02');assert.equal(extracted.credit,'bibek nandi');
});
test('invalid files, unsupported images, oversized uploads, and excessive pixels fail cleanly',async()=>{
  await assert.rejects(()=>storePhoto('invalid',Buffer.from('not a photograph')));
  await assert.rejects(()=>storePhoto('large',Buffer.alloc(MAX_BYTES+1)));
  const gif=await sharp({create:{width:10,height:10,channels:3,background:'white'}}).gif().toBuffer();
  await assert.rejects(()=>storePhoto('gif',gif));
  const huge=await sharp({create:{width:6400,height:6400,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(()=>storePhoto('pixels',huge));
  assert.equal(observations().length,6);
});
test('missing EXIF is normal and file storage failures do not create records',async()=>{
  const image=await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer();
  assert.equal((await extractMetadata(image)).date,null);
  await mkdir(path.join(dataDir(),'photos'),{recursive:true});await writeFile(path.join(dataDir(),'photos','blocked'),'occupied');
  await assert.rejects(()=>storePhoto('blocked',image));assert.equal(observation('blocked'),undefined);
});
test('database and approved record persist in a fresh process',()=>{
  db().prepare("UPDATE observations SET rgi_id=? WHERE id='drang-2023'").run('RGI2000-v7.0-G-14-26914');
  const child=spawnSync(process.execPath,['--input-type=module','-e',`import { DatabaseSync } from 'node:sqlite'; const d=new DatabaseSync(process.env.HIGO_DATA_DIR+'/higo.sqlite'); console.log(JSON.stringify(d.prepare("SELECT count(*) AS count FROM observations WHERE status='approved'").get()));`],{encoding:'utf8',env:process.env});
  assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).count,6);
  const association=spawnSync(process.execPath,['--input-type=module','-e',`import { DatabaseSync } from 'node:sqlite'; const d=new DatabaseSync(process.env.HIGO_DATA_DIR+'/higo.sqlite'); console.log(d.prepare("SELECT rgi_id FROM observations WHERE id='drang-2023'").get().rgi_id);`],{encoding:'utf8',env:process.env});
  assert.equal(association.status,0,association.stderr);assert.equal(association.stdout.trim(),'RGI2000-v7.0-G-14-26914');
});
test('backup includes a readable database and unchanged original files',async()=>{
  const script=path.resolve('scripts/backup.ts');
  const child=spawnSync(process.execPath,['--import',path.resolve('node_modules/tsx/dist/loader.mjs'),script],{cwd:directory,encoding:'utf8',env:process.env});
  assert.equal(child.status,0,child.stderr);
  const names=await readdir(path.join(directory,'backups'));
  const destination=path.join(directory,'backups',names[0]);
  assert.ok((await readFile(path.join(destination,'higo.sqlite'))).length>0);
  const original=await readFile('drang drang/IMG_4305.jpg');
  assert.equal(Buffer.compare(original,await readFile(path.join(destination,'photos','drang-2023','original'))),0);
});
