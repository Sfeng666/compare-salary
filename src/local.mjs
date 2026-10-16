import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
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
export function createPolicyEngine(python){
 const child=spawn(python,[path.join(ROOT,'src/taxes.py')],{stdio:['pipe','pipe','pipe'],env:{...process.env,OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1'}});
 const pending=new Map();let id=0,diagnostic='';child.stderr.on('data',b=>diagnostic=(diagnostic+b).slice(-1000));
 const fail=e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(e);}pending.clear();};
 child.on('error',fail);child.stdin.on('error',fail);child.on('exit',()=>fail(Error('PolicyEngine exited: '+diagnostic)));
 createInterface({input:child.stdout}).on('line',line=>{let r;try{r=JSON.parse(line);}catch{return;}const p=pending.get(r.id);if(!p)return;pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(r.error)):p.resolve(r.result);});
 return {request:r=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Tax engine timed out'));child.kill();},120000);pending.set(n,{resolve,reject,timer});child.stdin.write(JSON.stringify({...r,id:n})+'\n');}),async curve(place,o,partner){
  const {validateTaxPlace}=await import('./tax-jurisdiction.mjs');validateTaxPlace(place,o.taxYear);
  if(!place.fips||place.quality==='state-approximation')throw Error('Detailed taxes require a researched county; use the table estimate until that is available');
  const partnerAt=x=>typeof partner==='object'?x*partner.ratio:partner;
  const maximum=typeof partner==='object'?2000000/(1+partner.ratio):2000000-partner;
  const points=new Set();for(let x=0;x<=Math.min(300000,maximum);x+=500)points.add(x);for(let x=302500;x<=maximum;x+=2500)points.add(x);points.add(maximum);
  for(const rule of place.localTax?.occupational||[])for(const edge of [Math.max(0,rule.minimum_annual_wages-.01),rule.minimum_annual_wages,rule.minimum_annual_wages+.01]){points.add(edge);if(typeof partner==='object'&&partner.ratio>0)points.add(edge/partner.ratio);}
  const gross=[...points].filter(x=>x>=0&&x<=maximum).sort((a,b)=>a-b);
  return this.request({year:o.taxYear,state:place.state,county:place.fips,city:place.city,partnerIncome:typeof partner==='number'?partner:0,partnerIncomes:gross.map(partnerAt),filing:o.filing,gross,localTax:place.localTax});
 },close(){child.stdin.end();}};
}
