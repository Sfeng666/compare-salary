import {validateEntry} from './locations.mjs';
export const REPOSITORY='Sfeng666/compare-salary';
export function contributionUrl(entry){validateEntry(entry);return `https://github.com/${REPOSITORY}/new/main?filename=${encodeURIComponent('data/locations/'+entry.id+'.json')}&value=${encodeURIComponent(JSON.stringify(entry,null,2)+'\n')}`;}
export async function createContribution(entry,{token,request=fetch}={}){
 validateEntry(entry);if(!token)throw Error('GitHub authentication is required to create a pull request');
 const api=async(method,url,body)=>{const r=await request('https://api.github.com'+url,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{})});const value=r.status===204?{}:await r.json();if(!r.ok)throw Error(`GitHub ${method} ${url}: ${r.status} ${value.message||''}`);return value;};
 const user=await api('GET','/user'),owner=user.login,target=owner+'/compare-salary';
 if(target.toLowerCase()!==REPOSITORY.toLowerCase()){try{const fork=await api('GET','/repos/'+target);if(fork.parent?.full_name?.toLowerCase()!==REPOSITORY.toLowerCase())throw Error('Existing repository is not a fork of compare-salary');}catch(e){if(!String(e.message).includes(': 404'))throw e;await api('POST','/repos/'+REPOSITORY+'/forks',{default_branch_only:true});}}
 const base=await api('GET','/repos/'+REPOSITORY+'/git/ref/heads/main');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(entry)))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,12);
 const branch='location/'+entry.id+'-'+hash;
 const prior=await api('GET','/repos/'+REPOSITORY+'/pulls?state=open&head='+encodeURIComponent(owner+':'+branch));if(prior.length)return {url:prior[0].html_url,number:prior[0].number,branch,reused:true};
 try{await api('GET','/repos/'+target+'/git/ref/heads/'+branch);}catch(e){if(!String(e.message).includes(': 404'))throw e;await api('POST','/repos/'+target+'/git/refs',{ref:'refs/heads/'+branch,sha:base.object.sha});}
 const filename='data/locations/'+entry.id+'.json';let sha;try{sha=(await api('GET','/repos/'+target+'/contents/'+filename+'?ref='+encodeURIComponent(branch))).sha;}catch(e){if(!String(e.message).includes(': 404'))throw e;}
 const content=JSON.stringify(entry,null,2)+'\n';const bytes=new TextEncoder().encode(content);const encoded=typeof Buffer!=='undefined'?Buffer.from(bytes).toString('base64'):btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
 await api('PUT','/repos/'+target+'/contents/'+filename,{message:'Add location data for '+entry.label,branch,content:encoded,...(sha?{sha}:{})});
 const pr=await api('POST','/repos/'+REPOSITORY+'/pulls',{title:'Location data: '+entry.label,head:owner+':'+branch,base:'main',body:'Adds public location data with field-level sources. No household salary or job information is included.\n\nPlease verify the geography, source excerpts, units, applicable tax year and license before merging.'});
 return {url:pr.html_url,number:pr.number,branch};
}
