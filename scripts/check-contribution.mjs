import {dataFiles,validateContributionFile,VALIDATION_CONTEXT} from '../src/contribution-review.mjs';
const {REPO,PR_NUMBER,HEAD_SHA,HEAD_REPO,GH_TOKEN,GITHUB_RUN_ID}=process.env;
async function api(path,method='GET',body){const r=await fetch('https://api.github.com/'+path,{method,headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('GitHub request failed '+r.status);return r.json();}
const status=(state,description)=>api(`repos/${REPO}/statuses/${HEAD_SHA}`,'POST',{state,context:VALIDATION_CONTEXT,description,target_url:`https://github.com/${REPO}/actions/runs/${GITHUB_RUN_ID}`});
await status('pending','Checking location files with the trusted base validator');
try{
 const files=await api(`repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100`);
 if(!dataFiles(files)){await status('failure','Not a data-only contribution; ordinary code review required');console.log('Ineligible for data auto-merge.');}
 else {
  for(const f of files)validateContributionFile(f,await api(`repos/${HEAD_REPO}/contents/${f.filename}?ref=${HEAD_SHA}`));
  const current=await api(`repos/${REPO}/pulls/${PR_NUMBER}`);
  if(current.head.sha!==HEAD_SHA)throw Error('Pull request changed while validation was running');
  await status('success',`Validated ${files.length} location entries; evidence review still required`);
  console.log(`Validated ${files.length} location entries at ${HEAD_SHA}.`);
 }
}catch(e){await status('failure','Location validation failed; see workflow log');throw e;}
