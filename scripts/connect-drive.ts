// Personal Drive connection for the local operator. This creates one private,
// app-owned folder using the limited drive.file scope; it never prints tokens.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main(){
  if(existsSync('.env.local'))process.loadEnvFile('.env.local');
  const clientId=process.env.GOOGLE_DRIVE_CLIENT_ID,clientSecret=process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error('Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local first. See RUN_AND_CHECK.md.');
  const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  let finish!:(code:string)=>void,fail!:(error:Error)=>void;
  const authorization=new Promise<string>((resolve,reject)=>{finish=resolve;fail=reject;});
  const server=createServer((req,res)=>{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    if(url.pathname!=='/oauth/callback'){res.writeHead(404).end('Not found');return;}
    if(url.searchParams.get('state')!==state){res.writeHead(400).end('Invalid connection state.');return;}
    const code=url.searchParams.get('code');
    if(!code){res.writeHead(400).end('Google Drive connection was cancelled. You may close this window.');fail(new Error('Authorization was cancelled.'));return;}
    res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Authorization received. Return to your terminal to finish connecting HiGO.');finish(code);
  });
  server.listen(0,'127.0.0.1');
  await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const address=server.address();if(!address||typeof address==='string')throw new Error('Could not open the local callback.');
  const redirect=`http://127.0.0.1:${address.port}/oauth/callback`;
  const params=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
  console.log('Open this Google authorization link in your browser:');
  console.log(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  console.log('Waiting for your authorization. Press Ctrl+C to cancel.');
  let code:string;try{code=await authorization;}finally{server.close();}
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,redirect_uri:redirect,grant_type:'authorization_code',code,code_verifier:verifier})});
  if(!tokenResponse.ok)throw new Error('Google could not exchange the authorization. Check the OAuth client type and try again.');
  const tokens=await tokenResponse.json() as {access_token?:string;refresh_token?:string};
  if(!tokens.access_token||!tokens.refresh_token)throw new Error('Google did not issue offline access. Revoke the app in your Google account and try again.');
  let folderId=process.env.GOOGLE_DRIVE_FOLDER_ID;
  if(folderId){
    if(!/^[\w-]+$/.test(folderId))throw new Error('The existing Google Drive folder identifier is invalid.');
    const existing=await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,mimeType,trashed&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${tokens.access_token}`}});
    if(!existing.ok)throw new Error('The existing HiGO folder is inaccessible. Reconnect the same Google account and OAuth client, or restore the folder.');
    const folder=await existing.json() as {mimeType?:string;trashed?:boolean};
    if(folder.mimeType!=='application/vnd.google-apps.folder'||folder.trashed)throw new Error('The existing HiGO folder is missing or in the trash. Restore it before reconnecting.');
  }else{
    const folderResponse=await fetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',headers:{Authorization:`Bearer ${tokens.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({name:'HiGO — private original submissions',mimeType:'application/vnd.google-apps.folder'})});
    if(!folderResponse.ok)throw new Error('Google could not create the private HiGO folder. Check Drive access and storage, then try again.');
    folderId=(await folderResponse.json() as {id?:string}).id;
    if(!folderId||!/^[\w-]+$/.test(folderId))throw new Error('Google returned an invalid folder identifier.');
  }
  let env=existsSync('.env.local')?await readFile('.env.local','utf8'):'';
  for(const [key,value] of Object.entries({GOOGLE_DRIVE_REFRESH_TOKEN:tokens.refresh_token,GOOGLE_DRIVE_FOLDER_ID:folderId,HIGO_PHOTO_STORAGE:'drive'})){
    env=env.replace(new RegExp(`^${key}=.*(?:\\r?\\n|$)`,'gm'),'');
    env+=`\n${key}=${value}\n`;
  }
  await writeFile('.env.local',env,{mode:0o600});
  await chmod('.env.local',0o600);
  console.log('Google Drive connected. New submission originals will be saved in the private HiGO folder. Restart HiGO.');
}
main().catch(e=>{console.error(`Connection failed: ${e instanceof Error?e.message:'Unknown error'}`);process.exitCode=1;});
