// MapLibre 6's ES module worker needs a stable same-origin URL under Next's bundler.
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('public/atlas',{recursive:true});
for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']) {
  await copyFile(`node_modules/maplibre-gl/dist/${name}`,`public/atlas/${name}`);
}
await copyFile('node_modules/maplibre-gl/LICENSE.txt','public/atlas/MAPLIBRE-LICENSE.txt');
