import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDatabase} from '../src/local.mjs';
import {compareSalary} from '../src/compare.mjs';
import {resolveLocation,validateEntry} from '../src/locations.mjs';
import {tableTax} from '../src/tax-tables.mjs';
import {validateTaxPlace} from '../src/tax-jurisdiction.mjs';
import {resolveTaxCoverage,validateTaxCatalog} from '../src/local-tax-coverage.mjs';
import {fullResearchPrompt,parseResearch} from '../src/research.mjs';
const db=loadDatabase(undefined,{includeLocal:false}),close=(a,b)=>assert(Math.abs(a-b)<.02,`${a} != ${b}`);
const tax=(city,gross=100000,partner=0,filing='single')=>tableTax(db.taxTables,resolveLocation(db,city),gross,partner,filing);

test('Fremont and Madison have positive evidence for zero local wage tax',async()=>{
 const r=await compareSalary({location:'Fremont, CA',reference:'Madison, WI',salary:100000},db);
 for(const p of [r.source,r.reference]){assert.equal(p.taxCoverage.status,'verified');assert.equal(p.needsTaxResearch,false);assert(p.taxCoverage.sources.length);validateTaxPlace(p);}
 assert(!r.warnings.some(w=>w.includes('overstate take-home')));
 assert.equal(r.calculation.taxes.parts.local_tax,0);
});
test('statewide coverage applies to a new place without inventing its county',()=>{
 const p=resolveLocation(db,'Unlisted New City, WI');assert.equal(p.needsResearch,true);assert.equal(p.taxCoverage.status,'verified');assert.equal(p.fips,undefined);
 const q=resolveLocation(db,'Unlisted New City, IN');assert.equal(q.taxCoverage.status,'needs_research');assert.equal(q.localTax,null);
});
test('additional statewide evidence covers North Carolina, Minnesota, Wyoming and South Carolina',()=>{
 for(const city of ['Raleigh, NC','Minneapolis, MN','Cheyenne, WY','Columbia, SC'])assert.equal(resolveLocation(db,city).taxCoverage.status,'verified');
});
test('Ohio, Pennsylvania and Iowa never silently certify zero local taxes',async()=>{
 for(const city of ['Columbus, OH','Pittsburgh, PA','Des Moines, IA']){const r=await compareSalary({location:city,salary:100000},db);assert.equal(r.source.taxCoverage.status,'address_required');assert(r.warnings.some(w=>w.startsWith(city)&&w.includes('overstate take-home')));assert.throws(()=>validateTaxPlace(r.source),/verification/);}
});
test('all named places have an explicit status, with no unknown-to-zero fallback',()=>{
 validateTaxCatalog(db.localTaxCoverage);let count=0;for(const city of Object.values(db.cities)){const c=resolveTaxCoverage(db.localTaxCoverage,city);assert(['verified','needs_research','address_required'].includes(c.status));if(c.status==='verified'){assert(c.sources.length);assert(c.localTax||db.localTaxTables.tables[c.tableId]);}else assert.equal(c.localTax,undefined);count++;}assert.equal(count,168640);
});
test('Indiana 2026 county rates use the correct county and exemption',()=>{
 close(tax('Indianapolis, IN').parts.local_tax,99000*.0202);
 close(tax('Marion, IN').parts.local_tax,99000*.0275); // Grant changed in 2026.
 close(tax('Decatur, IN').parts.local_tax,99000*.016); // Adams, not Decatur County.
 close(tax('Indianapolis, IN',100000,0,'joint').parts.local_tax,98000*.0202);
});
test('Maryland 2026 changes tax the taxable base, not gross wages',()=>{
 // Single, no children at $100k: $3,400 standard deduction + $3,200 exemption.
 close(tax('Cumberland, MD').parts.local_tax,93400*.032);
 close(tax('Chestertown, MD').parts.local_tax,93400*.033);
 close(tax('Annapolis, MD').parts.local_tax,50000*.027+43400*.0294);
});
test('city wages and occupational fees affect the browser estimate once',()=>{
 close(tax('Kansas City, MO').parts.local_tax,1000);close(tax('St. Louis, MO').parts.local_tax,1000);close(tax('Wilmington, DE').parts.local_tax,1250);
 close(tax('Denver, CO').parts.local_tax,69);close(tax('Denver, CO',100000,60000,'joint').parts.local_tax,138);
 close(tax('Denver, CO',5999).parts.local_tax,0);close(tax('Denver, CO',6000).parts.local_tax,69);
 close(tax('Glendale, CO',9000).parts.local_tax,0);close(tax('Glendale, CO',9001).parts.local_tax,60);
});
test('fee thresholds remain intact through salary-curve interpolation',async()=>{
 for(const [salary,fee]of [[9000,0],[9001,60]]){
  const r=await compareSalary({location:'Glendale, CO',reference:'Glendale, CO',salary},db);
  close(r.calculation.taxes.parts.local_tax,fee);
  close(r.sourceAfterTax,r.normalizedAfterTax);
  assert(r.normalizedBeforeTax<=salary+.01); // A fee cliff can have a lower equivalent.
 }
});
test('NYC and Yonkers local taxes survive married allocation and normalization',async()=>{
 assert(tax('New York City, NY').parts.local_tax>3000);assert(tax('Yonkers, NY').parts.local_tax>700);
 const r=await compareSalary({location:'New York City, NY',salary:150000,options:{filing:'separate',adults:2,spouse:'normalized',partnerIncome:50000}},db);
 close(r.sourceAllocation.yourTax+r.sourceAllocation.spouseTax,r.sourceTax);close(r.sourceAfterTax-r.source.annualCost,r.normalizedAfterTax-r.reference.annualCost);
 assert(r.calculation.taxes.yourParts.local_tax>r.calculation.taxes.spouseParts.local_tax);
});
const entry={schemaVersion:1,id:'oh-example',label:'Example, OH',city:'Example',state:'OH',fips:'39049',researchedAt:'2026-10-16',license:'CC-BY-NC-SA-4.0',sources:[{url:'https://www.census.gov/example',title:'County geography',retrievedAt:'2026-10-16',quote:'Example is in Franklin County.',fields:['fips']}]};
test('research may save geography while keeping address-dependent taxes unresolved',()=>{
 const e={...entry,taxReview:{year:2026,status:'address_required',checkedAt:'2026-10-16',reason:'The residence school district is unknown.'}};
 validateEntry(e);assert.equal(parseResearch(JSON.stringify(e),e.label,{requireTaxReview:true}).taxReview.status,'address_required');
 const p=resolveLocation({...db,entries:[e]},e.label);assert.equal(p.needsResearch,false);assert.equal(p.needsTaxResearch,true);
 assert.throws(()=>parseResearch(JSON.stringify(entry),entry.label,{requireTaxReview:true}),/required local tax review/);
});
test('complete tax research requires evidence and all jurisdiction categories',()=>{
 const taxReview={year:2026,status:'complete',checkedAt:'2026-10-16',reason:'No local tax found.'};
 assert.throws(()=>validateEntry({...entry,taxReview}),/every local jurisdiction/);
 assert(fullResearchPrompt('Example, OH').includes('school-district surtax'));assert(fullResearchPrompt('Example, OH').includes('Zero tax requires positive official evidence'));
});
test('unsupported tax bases and caps cannot be silently ignored',()=>{
 const e={...entry,localTax:{year:2026,verified:true,coverage:'complete_resident_and_work_city',income:[{rate:.01,exemption_per_person:0,cap:100}],occupational:[]},sources:[...entry.sources,{...entry.sources[0],fields:['localTax']}]};
 assert.throws(()=>validateEntry(e),/Unsupported local income tax rule/);
});
test('local tax models cannot silently fall back when their tables are missing',()=>{
 const p=resolveLocation({...db,localTaxTables:{year:2026,tables:{}}},'Indianapolis, IN');assert.equal(p.needsTaxResearch,true);assert(p.taxCoverage.reason.includes('unavailable'));
});
