import fs from 'node:fs';
import path from 'node:path';
import {validateEntry} from '../src/locations.mjs';
import {validateTaxCatalog} from '../src/local-tax-coverage.mjs';
const dirs=process.argv.slice(2);let count=0;
for(const dir of dirs.length?dirs:['data/locations'])if(fs.existsSync(dir))for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const p=path.join(dir,file);if(fs.statSync(p).size>50000)throw Error('Entry too large: '+p);const e=validateEntry(JSON.parse(fs.readFileSync(p,'utf8')));if(file!==e.id+'.json')throw Error('Filename must match entry id');count++;}
console.log(`Validated ${count} location entries`);
if(!dirs.length){const c=validateTaxCatalog(JSON.parse(fs.readFileSync('data/local-tax-coverage.json','utf8')));const t=JSON.parse(fs.readFileSync('data/local-tax-tables.json','utf8'));if(t.year!==c.year)throw Error('Local tax table year mismatch');for(const r of [...Object.values(c.counties),...c.cities])if(r.tableId&&!t.tables[r.tableId])throw Error('Missing local tax table');for(const table of Object.values(t.tables))for(const mode of ['single','joint','separate'])for(const part of ['income','local'])if(table[mode][part].length!==t.gross.length||!table[mode][part].every(Number.isFinite))throw Error('Invalid local tax curve');console.log(`Validated ${Object.keys(c.states).length} state coverage records and ${Object.keys(t.tables).length} local tax tables`);}
