import fs from 'node:fs';
import path from 'node:path';
import {validateEntry} from '../src/locations.mjs';
const dirs=process.argv.slice(2);let count=0;
for(const dir of dirs.length?dirs:['data/locations'])for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const p=path.join(dir,file);if(fs.statSync(p).size>50000)throw Error('Entry too large: '+p);const e=validateEntry(JSON.parse(fs.readFileSync(p,'utf8')));if(file!==e.id+'.json')throw Error('Filename must match entry id');count++;}
console.log(`Validated ${count} location entries`);
