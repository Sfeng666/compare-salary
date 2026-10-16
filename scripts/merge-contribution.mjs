import {mergeReadiness,validateContributionFile} from '../src/contribution-review.mjs';
const {REPO,PR_NUMBER,REVIEWER,GH_TOKEN}=process.env;
const api=async(path,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+REPO+'/'+path,{method,headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const v=await r.json();if(!r.ok)throw Error(v.message);return v;};
const pages=async path=>{const out=[];for(let page=1;page<=20;page++){const batch=await api(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);out.push(...batch);if(batch.length<100)return out;}throw Error('Too many records to review safely');};
async function mergeOne(number){
const pr=await api('pulls/'+number),sha=pr.head.sha;
const [files,reviews,statuses,checks]=await Promise.all([pages(`pulls/${number}/files`),pages(`pulls/${number}/reviews`),pages(`commits/${sha}/statuses`),api(`commits/${sha}/check-runs?per_page=100&filter=latest`)]);
if(checks.total_count>100)throw Error('Too many checks to review safely');
const readiness=mergeReadiness({pr,files,reviews,statuses,checks:checks.check_runs,reviewer:REVIEWER});
if(!readiness.ready){console.log(`#${number}: ${readiness.reason}`);return;}
for(const f of files){const r=await fetch(`https://api.github.com/repos/${pr.head.repo.full_name}/contents/${f.filename}?ref=${sha}`,{headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('Cannot read contribution');validateContributionFile(f,await r.json());}
const result=await api('pulls/'+number+'/merge','PUT',{sha,merge_method:'squash'});if(!result.merged)throw Error('GitHub did not merge this PR');console.log('Merged reviewed location data at '+sha);

}
// workflow_run executes this base-branch code with write permissions after the
// read-only review signal or trusted validator finishes, including fork PRs.
// Never download or execute artifacts/code from the triggering workflow.
if(PR_NUMBER){if(!/^[1-9][0-9]*$/.test(PR_NUMBER))throw Error('Invalid pull request number');await mergeOne(PR_NUMBER);}
else for(const pr of await pages('pulls?state=open'))await mergeOne(pr.number);
