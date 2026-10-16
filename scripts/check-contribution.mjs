import {validateEntry} from '../src/locations.mjs';
const {REPO,PR_NUMBER,HEAD_SHA,HEAD_REPO,GH_TOKEN}=process.env;
async function api(path){const r=await fetch('https://api.github.com/'+path,{headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('GitHub read failed '+r.status);return r.json();}
let files=[];for(let page=1;page<=5;page++){const rows=await api(`repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`);files.push(...rows);if(rows.length<100)break;}
const dataOnly=files.length>0&&files.length<=20&&files.every(f=>/^data\/locations\/[a-z0-9-]+\.json$/.test(f.filename)&&['added','modified'].includes(f.status));
if(!dataOnly){console.log('This is not a data-only contribution. It requires normal code review and is ineligible for data auto-merge.');process.exit(0);}
for(const f of files){const value=await api(`repos/${HEAD_REPO}/contents/${f.filename}?ref=${HEAD_SHA}`);if(value.size>50000||value.encoding!=='base64')throw Error('Invalid location blob');const e=validateEntry(JSON.parse(Buffer.from(value.content,'base64').toString('utf8')));if(f.filename!==`data/locations/${e.id}.json`)throw Error('Filename does not match location id');}
console.log(`Validated ${files.length} location entries. A reviewer must still verify evidence and licensing.`);
