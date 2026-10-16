import {parseLocation,STATE_FIPS,validateEntry} from './locations.mjs';
const root='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/';
export async function censusEvidence(location,{fetcher=fetch}={}){
 const p=parseLocation(location),state=STATE_FIPS[p.state];
 const query=async(service,layer,params)=>{const url=new URL(`${root}${service}/MapServer/${layer}/query`);url.search=new URLSearchParams({f:'json',returnGeometry:'false',...params});const response=await fetcher(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('Census lookup is temporarily unavailable');const data=await response.json();if(data.error)throw Error('Census lookup failed');return {url:url.href,features:data.features||[]};};
 const where=`STATE = '${state}' AND UPPER(BASENAME) = '${p.city.toUpperCase().replaceAll("'","''")}'`;
 const results=await Promise.all([4,5,1].map(layer=>query('Places_CouSub_ConCity_SubMCD',layer,{where,outFields:'NAME,BASENAME,STATE,GEOID,INTPTLAT,INTPTLON'})));
 // Prefer an incorporated or census-designated place over a same-name township.
 const found=results.find(r=>r.features.length===1);
 if(!found)throw Error('No unambiguous Census place match. Try the official city name or a provider with web search.');
 const place=found.features[0].attributes,lat=Number(place.INTPTLAT),lon=Number(place.INTPTLON);
 if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Census place has no usable internal point');
 // The base budgets retain Connecticut's pre-planning-region county geography.
 const counties=await query('State_County',p.state==='CT'?55:1,{geometry:`${lon},${lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'GEOID,NAME,STATE'});
 if(counties.features.length!==1)throw Error('County could not be resolved unambiguously');
 const county=counties.features[0].attributes;if(county.STATE!==state)throw Error('Census state did not match');
 const date=new Date().toISOString(),placeText=JSON.stringify(place),countyText=JSON.stringify(county);
 const entry={schemaVersion:1,id:`${p.state.toLowerCase()}-${p.city.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,label:p.label,city:p.city,state:p.state,fips:county.GEOID,researchedAt:date,license:'CC-BY-NC-SA-4.0',sources:[{title:'US Census TIGERweb place and internal point',url:found.url,retrievedAt:date,quote:placeText,fields:['fips']},{title:'US Census TIGERweb county at the place internal point',url:counties.url,retrievedAt:date,quote:countyText,fields:['fips']}]};
 validateEntry(entry);
 return {entry,text:found.url+'\n'+placeText+'\n'+counties.url+'\n'+countyText,note:'County assigned at the Census place internal point; a city spanning several counties may have different costs elsewhere. Local taxes remain unverified.'};
}
