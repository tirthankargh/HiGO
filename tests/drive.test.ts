import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { storePhoto, readStoredPhoto, removePhoto, comparisonImage } from '../lib/images';

test('configured Drive originals stay private and support retrieval, crops and cleanup',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'higo-drive-test-'));
  const previous={...process.env},originalFetch=globalThis.fetch;
  const image=await sharp({create:{width:40,height:30,channels:3,background:'white'}}).png().toBuffer();
  const calls:string[]=[];let puts=0;
  try{
    Object.assign(process.env,{HIGO_DATA_DIR:directory,HIGO_PHOTO_STORAGE:'drive',GOOGLE_DRIVE_CLIENT_ID:'test-id',GOOGLE_DRIVE_CLIENT_SECRET:'test-secret',GOOGLE_DRIVE_REFRESH_TOKEN:'test-refresh',GOOGLE_DRIVE_FOLDER_ID:'test-folder'});
    globalThis.fetch=async (input,init)=>{
      const url=String(input);calls.push(`${init?.method||'GET'} ${url}`);
      if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access',expires_in:3600});
      if(url.includes('uploadType=resumable')){
        assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-access');
        return new Response(null,{status:200,headers:{location:'https://www.googleapis.com/upload-session/test'}});
      }
      if(url.includes('/upload-session/')){
        const range=(init?.headers as Record<string,string>)['Content-Range'];
        if(range.startsWith('bytes */'))return new Response(null,{status:308,headers:{range:'bytes=0-7'}});
        puts++;if(puts===1)throw new Error('Simulated interrupted connection');
        assert.deepEqual(Buffer.from(init?.body as ArrayBuffer),image.subarray(8));
        return Response.json({id:'private-file-id'});
      }
      if(url.includes('private-file-id')&&init?.method==='DELETE')return new Response(null,{status:204});
      if(url.includes('private-file-id'))return new Response(image);
      throw new Error('Unexpected request in Drive test');
    };
    const stored=await storePhoto('drive-test',image,true);
    assert.equal(stored.original_path,'drive:private-file-id');
    await assert.rejects(()=>readFile(path.join(directory,'photos/drive-test/original')));
    assert.deepEqual(await readStoredPhoto(stored.original_path),image);
    assert.equal((await sharp(await comparisonImage(stored.original_path,{left:0,top:0,width:100,height:100})).metadata()).format,'webp');
    await removePhoto('drive-test',stored.original_path);
    assert.ok(calls.some(c=>c.startsWith('DELETE ')&&c.includes('private-file-id')));
  }finally{globalThis.fetch=originalFetch;process.env=previous;await rm(directory,{recursive:true,force:true});}
});

test('Drive mode fails closed without credentials and leaves no local photograph',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'higo-drive-fail-'));
  const previous={...process.env};
  try{
    process.env.HIGO_DATA_DIR=directory;process.env.HIGO_PHOTO_STORAGE='drive';
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    const image=await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer();
    await assert.rejects(()=>storePhoto('failed',image,true),/storage is not configured/);
    await assert.rejects(()=>readFile(path.join(directory,'photos/failed/display.webp')));
  }finally{process.env=previous;await rm(directory,{recursive:true,force:true});}
});
