#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compareSalary} from '../src/compare.mjs';
import {loadDatabase,saveEntry,createPolicyEngine,ROOT} from '../src/local.mjs';
import {researchPrompt} from '../src/research.mjs';
import {createContribution} from '../src/contribute.mjs';
const args=process.argv.slice(2),command=args.shift()||'help';
try{
 if(command==='compare'){
  const get=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
  const input=get('input')?JSON.parse(fs.readFileSync(get('input'),'utf8')):{location:get('location'),residence:get('residence'),remote:args.includes('--remote'),salary:Number(get('salary')),period:get('period','year'),reference:get('reference','Madison, WI'),options:{filing:get('filing','single'),adults:Number(get('adults',get('filing','single')==='single'?1:2)),bedrooms:Number(get('bedrooms',1)),spouse:get('spouse',get('filing','single')==='single'?'none':'normalized'),partnerIncome:Number(get('partner-income',0)),referencePartnerIncome:Number(get('reference-partner-income',0))}};
  const python=get('python',process.env.COMPARE_SALARY_PYTHON);const engine=python?createPolicyEngine(python):null;
  try{console.log(JSON.stringify(await compareSalary(input,loadDatabase(get('data')),{taxCurve:engine?engine.curve.bind(engine):undefined}),null,2));}finally{engine?.close();}
 }else if(command==='research-prompt')console.log(researchPrompt(args.join(' ')));
 else if(command==='add-location')console.log(saveEntry(JSON.parse(fs.readFileSync(args[0],'utf8'))));
 else if(command==='contribute'){
  const entry=JSON.parse(fs.readFileSync(args[0],'utf8'));
  const token=process.env.GITHUB_TOKEN||execFileSync(process.env.GH_BIN||'gh',['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  console.log(JSON.stringify(await createContribution(entry,{token}),null,2));
 }else if(command==='serve')await import('../src/server.mjs');
 else if(command==='install-skill'){
  const dest=args[0];if(!dest)throw Error('Provide the agent skills directory');const target=path.resolve(dest,'compare-salary');if(fs.existsSync(target))throw Error('Skill already exists: '+target);fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(path.join(ROOT,'skills/compare-salary'),target,{recursive:true});console.log(target);
 }else console.log('compare-salary compare --location "Boston, MA" --salary 100000 --reference "Madison, WI"\n  --remote --residence "Madison, WI"\n  --filing single|joint|separate|lowest_married_tax --adults 1|2 --bedrooms 0|1|2\n  --spouse none|normalized --partner-income 60000\n  --python /path/to/python (optional detailed PolicyEngine)\n  --input request.json --data /path/to/local/database\ncompare-salary research-prompt "City, ST"\ncompare-salary add-location entry.json\ncompare-salary contribute entry.json\ncompare-salary install-skill /path/to/agent/skills\ncompare-salary serve');
}catch(e){console.error(e.message);process.exitCode=1;}
