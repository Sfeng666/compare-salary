import {socialWorkerPay} from './model.mjs';
import {resolveTaxCoverage,validateTaxReview} from './local-tax-coverage.mjs';
export const STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export function locationKey(value){return String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');}
const median=xs=>{const a=xs.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)throw Error('No regional data available');return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
export function parseLocation(input){
 let s=String(input||'').trim().replace(/,?\s+(?:United States(?: of America)?|USA|US)$/i,'');
 for(const [abbr,name]of Object.entries(STATES).sort((a,b)=>b[1].length-a[1].length))s=s.replace(new RegExp(',?\\s+'+name+'$','i'),', '+abbr);
 if(/^(NYC|New York City)$/i.test(s))s='New York City, NY';
 const m=/^([^,;\/]+),?\s+([A-Za-z]{2})$/.exec(s);
 if(!m||!STATES[m[2].toUpperCase()])throw Error('Enter a US city and state, such as Madison, WI. Version 1 covers US wage earners.');
 return {city:m[1].trim(),state:m[2].toUpperCase(),label:`${m[1].trim()}, ${m[2].toUpperCase()}`};
}
export function resolveLocation(database,input,options={}){
 const parsed=parseLocation(input),key=locationKey(parsed.label),entries=database.entries||[];
 const entry=entries.find(e=>locationKey(e.label)===key);
 let row=database.cities[key]||database.cities[key.replace(/^st\.? /,'saint ')]||database.cities[key.replace(/^saint /,'st. ')];
 if(entry)row={...row,...entry};
 if(parsed.state==='NY'&&/^(New York|New York City|NYC)$/i.test(parsed.city))row={city:'New York City',state:'NY',fips:'36061',boroughs:['36005','36047','36061','36081','36085']};
 const adults=options.adults??1,bedrooms=options.bedrooms??1,family=`${adults}p0c`;
 const rentKey=bedrooms===0?'studio':bedrooms===1?'oneBedroom':'twoBedroom';
 const warnings=[];
 let county=row&&database.counties[row.fips];
 let costs,rent,spouse,rentArea,metro,quality='county',costBasis=county?'county':'state-median';
 if(county){
  const town=county.rents.find(r=>r.town.replace(/ (?:city|town)$/i,'').toLowerCase()===(row.city||parsed.city).toLowerCase());
  const rates=county.rents.map(r=>r[rentKey]);
  const chosen=town||county.rents[0];
  rent=town?town[rentKey]:median(rates);
  if(!town&&new Set(rates).size>1)warnings.push('Rent uses the median of HUD areas in this county; the town has not been matched to a rent area.');
  costs={...county.families[family]};metro=chosen?.metro;rentArea=chosen?.area;
  spouse=socialWorkerPay(database.wages[metro]||database.wages['state:'+parsed.state]);
  if(row.boroughs){const parts=row.boroughs.map(fips=>database.counties[fips]);const weights=parts.map(c=>c.rents.reduce((s,r)=>s+r.population,0));const total=weights.reduce((a,b)=>a+b,0);for(const k of Object.keys(costs))costs[k]=parts.reduce((s,c,i)=>s+c.families[family][k]*weights[i]/total,0);rent=parts.reduce((s,c,i)=>s+c.rents[0][rentKey]*weights[i]/total,0);costBasis='borough-weighted';}
 }else{
  const counties=Object.values(database.counties).filter(c=>c.state===parsed.state);
  costs=Object.fromEntries(['food','transport','healthcare','other'].map(k=>[k,median(counties.map(c=>c.families[family]?.[k]))]));
  rent=median(counties.flatMap(c=>c.rents.map(r=>r[rentKey])));
  spouse=socialWorkerPay(database.wages['state:'+parsed.state]);quality='state-approximation';
  warnings.push(`This city is not in the database. Costs and rent use ${STATES[parsed.state]} medians.${options.spouse==='local_social_worker'?' Spouse wages use the state estimate.':''} Research can replace these inputs.`);
 }
 if(entry?.familyCosts?.[family]){costs={...entry.familyCosts[family]};quality='researched';costBasis='contributed';}
 if(entry?.rents?.[String(bedrooms)]!=null)rent=entry.rents[String(bedrooms)];
 if(entry?.socialWorkerMedian)spouse={median:entry.socialWorkerMedian,method:'Contributed local social-worker wage estimate'};
 const annualCost=Object.values(costs).reduce((a,b)=>a+b,0)+rent*12;
 if(!Number.isFinite(annualCost)||!Number.isFinite(rent))throw Error('Incomplete location budget');
 const place={...parsed,...row,label:row?.label||`${row?.city||parsed.city}, ${parsed.state}`,monthlyRent:rent,annualCost,costs:{rent:rent*12,...costs},costBasis,spouse,county:county?.name,rentArea,metro,quality,warnings,rentBasis:entry?.rents?.[String(bedrooms)]!=null?'contributed':'HUD FY2027',needsResearch:!row};
 place.taxCoverage=resolveTaxCoverage(database.localTaxCoverage,place,entry,options.taxYear??2026);
 const taxTable=database.localTaxTables?.year===(options.taxYear??2026)&&database.localTaxTables.tables[place.taxCoverage.tableId];
 if(place.taxCoverage.tableId&&!taxTable)place.taxCoverage={...place.taxCoverage,status:'needs_research',needsResearch:true,reason:'Verified local tax rules exist, but the matching calculation table is unavailable.'};
 place.localTax=place.taxCoverage.localTax||null;
 place.needsTaxResearch=place.taxCoverage.needsResearch;
 // Calculation tables are internal inputs, not part of every public result.
 if(taxTable)Object.defineProperty(place,'localTaxTable',{value:{gross:database.localTaxTables.gross,...taxTable},enumerable:false});
 place.sources=[...(database.sources||[]),...(costBasis==='contributed'?[]:[{name:'EPI family budget methodology, including transportation',url:'https://www.epi.org/publication/family-budget-calculator-documentation/',vintage:'2026'}]),...(entry?.sources||[]),...place.taxCoverage.sources];
 return place;
}
export const STATE_FIPS={"AL":"01","AK":"02","AZ":"04","AR":"05","CA":"06","CO":"08","CT":"09","DE":"10","DC":"11","FL":"12","GA":"13","HI":"15","ID":"16","IL":"17","IN":"18","IA":"19","KS":"20","KY":"21","LA":"22","ME":"23","MD":"24","MA":"25","MI":"26","MN":"27","MS":"28","MO":"29","MT":"30","NE":"31","NV":"32","NH":"33","NJ":"34","NM":"35","NY":"36","NC":"37","ND":"38","OH":"39","OK":"40","OR":"41","PA":"42","RI":"44","SC":"45","SD":"46","TN":"47","TX":"48","UT":"49","VT":"50","VA":"51","WA":"53","WV":"54","WI":"55","WY":"56"};
export function validateEntry(e){
 const fail=m=>{throw Error(m);};
 if(!e||e.schemaVersion!==1)fail('Location entry needs schemaVersion 1');
 const p=parseLocation(e.label);if(e.state!==p.state||e.city!==p.city)fail('City/state must match label');
 if(!/^[a-z0-9-]{3,100}$/.test(e.id||''))fail('Invalid location id');
 const allowed=['schemaVersion','id','label','city','state','fips','familyCosts','rents','socialWorkerMedian','localTax','taxReview','sources','researchedAt','license'];
 if(Object.keys(e).some(k=>!allowed.includes(k)))fail('Unexpected entry field; personal and job data are not accepted');
 if(!/^\d{5}$/.test(e.fips||''))fail('A researched county FIPS is required');
 if(e.fips.slice(0,2)!==STATE_FIPS[e.state])fail('County FIPS does not match state');
 if(!Number.isFinite(Date.parse(e.researchedAt))||Date.parse(e.researchedAt)>Date.now()+86400000)fail('Invalid research date');
 if(e.license!=='CC-BY-NC-SA-4.0')fail('Contribution license must be CC-BY-NC-SA-4.0');
 if(!Array.isArray(e.sources)||!e.sources.length||e.sources.length>20)fail('Provide 1 to 20 public sources');
 for(const s of e.sources){let url;try{url=new URL(s.url);}catch{fail('Source URL invalid');}if(url.protocol!=='https:'||url.username||url.password)fail('Sources require public HTTPS URLs');if(!s.title||!s.retrievedAt||!s.quote||s.quote.length>600)fail('Sources need title, date and a short evidence excerpt');if(!Array.isArray(s.fields)||!s.fields.length)fail('Identify the fields supported by each source');}
 const covers=field=>e.sources.some(s=>s.fields.includes(field));
 if(!covers('fips'))fail('County needs cited evidence');
 const amount=(v,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 if(e.familyCosts)for(const [family,costs]of Object.entries(e.familyCosts)){if(!['1p0c','2p0c'].includes(family)||Object.keys(costs).sort().join()!=='food,healthcare,other,transport')fail('Invalid family budget');if(Object.values(costs).some(v=>!amount(v,300000))||!covers('familyCosts'))fail('Invalid or unsourced annual costs');}
 if(e.rents)for(const [beds,value]of Object.entries(e.rents))if(!['0','1','2'].includes(beds)||!amount(value,20000)||value===0||!covers('rents'))fail('Invalid or unsourced monthly rent');
 if(e.socialWorkerMedian!=null&&(!amount(e.socialWorkerMedian,300000)||e.socialWorkerMedian===0||!covers('socialWorkerMedian')))fail('Invalid or unsourced social-worker pay');
 if(e.localTax){const t=e.localTax;if(t.year!==2026||t.verified!==true||t.coverage!=='complete_resident_and_work_city'||!Array.isArray(t.income)||!Array.isArray(t.occupational)||!covers('localTax'))fail('Local tax needs complete sourced 2026 coverage');if(Object.keys(t).some(k=>!['year','verified','coverage','income','occupational'].includes(k)))fail('Unsupported local tax rule');for(const r of t.income){if(Object.keys(r).some(k=>!['rate','exemption_per_person'].includes(k)))fail('Unsupported local income tax rule');if(!amount(r.rate,.15)||!amount(r.exemption_per_person,1000000))fail('Invalid local income tax');}for(const r of t.occupational){if(Object.keys(r).some(k=>!['amount','period','minimum_annual_wages','threshold_inclusive'].includes(k)))fail('Unsupported occupational tax rule');if(!amount(r.amount,10000)||!['year','month','week'].includes(r.period)||!amount(r.minimum_annual_wages,1000000))fail('Invalid occupational tax');}}
 if(e.localTax?.occupational.some(r=>r.threshold_inclusive!==undefined&&typeof r.threshold_inclusive!=='boolean'))fail('Invalid fee threshold');
 if(e.taxReview)validateTaxReview(e.taxReview,e);
 return e;
}
