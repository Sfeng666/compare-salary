import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {validateEntry} from './locations.mjs';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const LOCAL=process.env.COMPARE_SALARY_DATA||path.join(os.homedir(),'.local/share/compare-salary');
export function loadDatabase(directory=path.join(ROOT,'data'),{includeLocal=true}={}){
 const read=n=>JSON.parse(fs.readFileSync(path.join(directory,n),'utf8'));
 const entries=[];
 for(const dir of [path.join(directory,'locations'),...(includeLocal?[path.join(LOCAL,'locations')]:[])])if(fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){const entry=validateEntry(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')));const i=entries.findIndex(e=>e.id===entry.id);if(i>=0)entries[i]=entry;else entries.push(entry);}
 return {...read('base.json'),cities:read('cities.json'),taxTables:read('tax-tables.json'),localTaxCoverage:read('local-tax-coverage.json'),localTaxTables:read('local-tax-tables.json'),entries};
}
export function saveEntry(entry){validateEntry(entry);const dir=path.join(LOCAL,'locations');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,entry.id+'.json');const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(entry,null,2)+'\n');fs.renameSync(tmp,file);return file;}
