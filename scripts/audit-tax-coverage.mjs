import fs from 'node:fs';
import {loadDatabase} from '../src/local.mjs';
import {resolveTaxCoverage,validateTaxCatalog} from '../src/local-tax-coverage.mjs';
const db=loadDatabase(undefined,{includeLocal:false}),catalog=validateTaxCatalog(db.localTaxCoverage);
const counts={verified:0,needs_research:0,address_required:0},states={},pending=[];
const entries=new Map(db.entries.map(e=>[e.label.toLowerCase(),e]));
for(const [key,city]of Object.entries(db.cities)){
 const coverage=resolveTaxCoverage(catalog,{...city,label:`${city.city}, ${city.state}`},entries.get(key));
 if(coverage.tableId&&!db.localTaxTables.tables[coverage.tableId])throw Error(`Missing table ${coverage.tableId}`);
 counts[coverage.status]++;
 const state=states[city.state]||={total:0,verified:0,needs_research:0,address_required:0};state.total++;state[coverage.status]++;
 if(coverage.status!=='verified')pending.push({location:`${city.city}, ${city.state}`,fips:city.fips,status:coverage.status});
}
const report={schemaVersion:1,taxYear:catalog.year,checkedAt:catalog.checkedAt,totalNamedPlaces:Object.keys(db.cities).length,counts,states,
 meaning:'Verified means the local wage-tax jurisdiction/rate rules have evidence and a supported calculation for the modeled full-year resident employee. It does not certify a tax return, exact address, or every federal/state deduction. Missing coverage is never a verified zero.',
 limitations:['The place index contains neighborhoods and unincorporated places as well as cities.','Municipal, school and transit boundaries may require residence and workplace addresses.','Single-county mappings use representative geography; cross-county cities can differ within the city.','Rules from older publications need confirmation if law changes; the checked date is a review date, not the source publication date.'],
 unresolvedFile:'tax-research-queue.json',sources:catalog.sources};
fs.writeFileSync('data/tax-coverage-audit.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('data/tax-research-queue.json',JSON.stringify({taxYear:catalog.year,checkedAt:catalog.checkedAt,locations:pending})+'\n');
console.log(JSON.stringify({total:report.totalNamedPlaces,...counts}));
