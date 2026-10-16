import {validateEntry} from './locations.mjs';
export const VALIDATION_CONTEXT='compare-salary/location-data';
export function dataFiles(files){return files.length>0&&files.length<=20&&files.every(f=>/^data\/locations\/[a-z0-9-]+\.json$/.test(f.filename)&&['added','modified'].includes(f.status));}
export function mergeReadiness({pr,files,reviews,statuses,checks,reviewer}){
 if(!reviewer)throw Error('Configure an exact trusted reviewer login');
 if(pr.state!=='open'||pr.draft)return {ready:false,reason:'Pull request is not open and ready'};
 if(!dataFiles(files))return {ready:false,reason:'Only location data changes may use automatic merging'};
 const latest=reviews.filter(r=>r.user.login===reviewer&&r.commit_id===pr.head.sha).at(-1);
 if(!latest||latest.state!=='APPROVED')return {ready:false,reason:'Waiting for the trusted reviewer to approve this exact commit'};
 // The trusted pull_request_target validator posts this status on the PR head.
 // Its normal workflow check is attached to the base SHA and cannot gate the head.
 const validation=statuses.find(s=>s.context===VALIDATION_CONTEXT&&s.creator?.login==='github-actions[bot]');
 if(validation?.state!=='success')return {ready:false,reason:'Waiting for location validation on this exact commit'};
 if(checks.some(c=>c.status!=='completed'||!['success','neutral','skipped'].includes(c.conclusion)))return {ready:false,reason:'Waiting for other checks to pass'};
 return {ready:true,sha:pr.head.sha};
}
export function validateContributionFile(file,value){
 if(value.size>50000||value.encoding!=='base64')throw Error('Invalid location blob');
 const e=validateEntry(JSON.parse(Buffer.from(value.content,'base64').toString('utf8')));
 if(file.filename!==`data/locations/${e.id}.json`)throw Error('Filename does not match location id');
 return e;
}
