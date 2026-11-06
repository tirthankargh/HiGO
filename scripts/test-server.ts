import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
async function main(){
  const dir=await mkdtemp(path.join(tmpdir(),'higo-browser-'));
  process.env.HIGO_DATA_DIR=dir;process.env.ADMIN_PASSWORD='higo-browser-test-password';process.env.SESSION_SECRET='higo-browser-test-session-secret-at-least-32-characters';
  process.env.HIGO_ATLAS_PATH=path.resolve('data/atlas.sqlite');
  const {seed}=await import('../lib/seed');await seed();
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:process.env});
  for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>child.kill(signal));
  child.on('exit',async code=>{await rm(dir,{recursive:true,force:true});process.exit(code||0);});
}
main().catch(e=>{console.error(e);process.exit(1);});
