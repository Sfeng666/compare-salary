import {validateEntry} from '../src/locations.mjs';
const {REPO,PR_NUMBER,REVIEWER,GH_TOKEN}=process.env;
if(!REVIEWER)throw Error('Configure an exact trusted reviewer login');
const api=async(path,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+REPO+'/'+path,{method,headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const v=await r.json();if(!r.ok)throw Error(v.message);return v;};
const pr=await api('pulls/'+PR_NUMBER),sha=pr.head.sha;
if(pr.state!=='open'||pr.draft)throw Error('Pull request is not ready');
const files=await api(`pulls/${PR_NUMBER}/files?per_page=100`);if(!files.length||files.length>20||!files.every(f=>/^data\/locations\/[a-z0-9-]+\.json$/.test(f.filename)&&['added','modified'].includes(f.status)))throw Error('Only location data changes may be merged by this workflow');
const reviews=await api(`pulls/${PR_NUMBER}/reviews?per_page=100`),latest=reviews.filter(r=>r.user.login===REVIEWER&&r.commit_id===sha).at(-1);
if(!latest||latest.state!=='APPROVED')throw Error('The configured reviewer has not approved this exact commit');
const checks=await api('commits/'+sha+'/check-runs');if(!checks.check_runs.some(c=>c.name==='validate'&&c.conclusion==='success')||checks.check_runs.some(c=>['failure','cancelled','timed_out'].includes(c.conclusion)))throw Error('Required checks have not passed');
for(const f of files){const r=await fetch(`https://api.github.com/repos/${pr.head.repo.full_name}/contents/${f.filename}?ref=${sha}`,{headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json'}});const b=await r.json();if(!r.ok||b.size>50000)throw Error('Invalid entry');validateEntry(JSON.parse(Buffer.from(b.content,'base64').toString()));}
const result=await api('pulls/'+PR_NUMBER+'/merge','PUT',{sha,merge_method:'squash'});if(!result.merged)throw Error('GitHub did not merge this PR');console.log('Merged reviewed location data at '+sha);
