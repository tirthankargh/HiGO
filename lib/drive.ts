// Drive originals are private. Display and thumbnail derivatives remain in local storage.
// OAuth credentials are configured by the operator; none are exposed to browsers.
import { InputError } from './validation';

type Config={clientId:string;clientSecret:string;refreshToken:string;folderId:string};
function config():Config {
  const {GOOGLE_DRIVE_CLIENT_ID:clientId,GOOGLE_DRIVE_CLIENT_SECRET:clientSecret,GOOGLE_DRIVE_REFRESH_TOKEN:refreshToken,GOOGLE_DRIVE_FOLDER_ID:folderId}=process.env;
  if(!clientId||!clientSecret||!refreshToken||!folderId)throw new InputError('Photo storage is not configured. Please try again later.',503);
  return {clientId,clientSecret,refreshToken,folderId};
}
let cached:{token:string;expires:number;key:string}|undefined;
async function token(c:Config) {
  const key=[c.clientId,c.clientSecret,c.refreshToken].join('\0');
  if(cached?.key===key&&cached.expires>Date.now()+60_000)return cached.token;
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'})});
  if(!response.ok)throw new InputError('Photo storage could not authenticate. Please try again later.',503);
  const body=await response.json() as {access_token?:string;expires_in?:number};
  if(!body.access_token)throw new InputError('Photo storage could not authenticate. Please try again later.',503);
  cached={token:body.access_token,expires:Date.now()+Math.max(0,body.expires_in||0)*1000,key};
  return body.access_token;
}
export function driveEnabled() {
  const selected=process.env.HIGO_PHOTO_STORAGE||'local';
  if(!['local','drive'].includes(selected))throw new InputError('Photo storage is not configured. Please try again later.',503);
  return selected==='drive';
}
export async function uploadOriginal(id:string,bytes:Buffer,mime:string) {
  const c=config(), access=await token(c);
  const metadata=JSON.stringify({name:`${id}-original`,parents:[c.folderId],description:'Private original submitted to The Himalayan Glacier Observatory.'});
  const start=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id',{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(bytes.length)},body:metadata});
  const location=start.headers.get('location');
  if(!start.ok||!location)throw new InputError('Could not save your photograph to storage. Please try again later.',503);
  let session:URL;try{session=new URL(location);}catch{throw new InputError('Photo storage returned an invalid response. Please contact the curator.',503);}
  if(session.protocol!=='https:'||!['www.googleapis.com','content.googleapis.com'].includes(session.hostname))throw new InputError('Photo storage returned an invalid response. Please contact the curator.',503);
  let offset=0,check=false;
  for(let attempt=0;attempt<4;attempt++){
    let r:Response;
    try{
      r=await fetch(session,{method:'PUT',headers:{Authorization:`Bearer ${access}`,'Content-Type':mime,'Content-Range':check?`bytes */${bytes.length}`:`bytes ${offset}-${bytes.length-1}/${bytes.length}`},...(check?{}:{body:Uint8Array.from(bytes.subarray(offset))})});
    }catch{check=true;continue;}
    if(r.ok){const result=await r.json() as {id?:string};if(!result.id||!/^[\w-]+$/.test(result.id))throw new InputError('Photo storage returned an invalid response. Please contact the curator.',503);return `drive:${result.id}`;}
    if(r.status===308){const range=r.headers.get('range'),match=range&&/^bytes=0-(\d+)$/.exec(range);offset=match?Number(match[1])+1:0;if(offset>=bytes.length){check=true;continue;}check=false;continue;}
    if(r.status>=500){check=true;continue;}
    break;
  }
  throw new InputError('Could not save your photograph to storage. Please try again later.',503);
}
function fileId(reference:string){const match=/^drive:([\w-]+)$/.exec(reference);if(!match)throw new Error('Invalid Drive reference');return match[1];}
export async function readDriveOriginal(reference:string) {
  const access=await token(config());
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId(reference)}?alt=media&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${access}`},cache:'no-store'});
  if(!r.ok)throw new Error('Could not read private Drive original');
  return Buffer.from(await r.arrayBuffer());
}
export async function deleteDriveOriginal(reference:string) {
  const access=await token(config());
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId(reference)}?supportsAllDrives=true`,{method:'DELETE',headers:{Authorization:`Bearer ${access}`}});
  if(!r.ok&&r.status!==404)throw new Error('Could not remove unused Drive original');
}
