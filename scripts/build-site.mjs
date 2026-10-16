import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
await import('./audit-tax-coverage.mjs');
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
fs.mkdirSync('data/locations',{recursive:true});
fs.cpSync('data','dist/data',{recursive:true});
const entries=fs.readdirSync('data/locations').filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync('data/locations/'+n,'utf8')));
fs.writeFileSync('dist/data/locations.json',JSON.stringify(entries));
fs.writeFileSync('dist/.nojekyll','');
const result=await build({entryPoints:['app.mjs','style.css'],outdir:'dist',entryNames:'[name]-[hash]',bundle:true,format:'esm',splitting:true,minify:true,metafile:true,chunkNames:'chunks/[name]-[hash]'});
const asset=entry=>path.basename(Object.entries(result.metafile.outputs).find(([,output])=>output.entryPoint===entry)[0]);
let html=fs.readFileSync('index.html','utf8');
for(const [attribute,source,entry]of [['src','app.js','app.mjs'],['href','style.css','style.css']]){
 const marker=`${attribute}="${source}"`;
 if(!html.includes(marker))throw Error(`Missing site asset reference: ${source}`);
 html=html.replace(marker,`${attribute}="${asset(entry)}"`);
}
fs.writeFileSync('dist/index.html',html);
console.log('Built static website in dist/');
