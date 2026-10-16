import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {ROOT} from '../src/local.mjs';

const retiredEngineEnv={...process.env,COMPARE_SALARY_PYTHON:'/not-installed/compare-salary-python'};

test('CLI comparisons use included tables with a retired engine setting present',async()=>{
 const child=spawn(process.execPath,['bin/compare-salary.mjs','compare','--location','Madison, WI','--reference','Madison, WI','--salary','100000'],{cwd:ROOT,env:retiredEngineEnv});
 let stdout='';child.stdout.on('data',b=>stdout+=b);child.stderr.resume();
 const [code]=await once(child,'close');assert.equal(code,0);
 const result=JSON.parse(stdout);assert.equal(result.normalizedBeforeTax,100000);assert(Number.isFinite(result.sourceAfterTax));
});

test('the research companion no longer accepts salary calculations',async t=>{
 const reserve=net.createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
 const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const child=spawn(process.execPath,['bin/compare-salary.mjs','serve'],{cwd:ROOT,env:{...retiredEngineEnv,COMPARE_SALARY_PORT:String(port)},stdio:['ignore','ignore','pipe']});
 t.after(()=>child.kill());
 const token=await new Promise((resolve,reject)=>{
  let output='';const timer=setTimeout(()=>reject(Error('Research companion startup timed out')),10000);
  child.stderr.on('data',b=>{output+=b;const match=output.match(/#connection=([a-f0-9]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
  child.once('error',()=>{clearTimeout(timer);reject(Error('Research companion failed to start'));});
  child.once('exit',()=>{clearTimeout(timer);reject(Error('Research companion stopped before ready'));});
 });
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const health=await fetch(`http://127.0.0.1:${port}/api/health`,{headers});
 assert.equal(health.status,200);assert.deepEqual(await health.json(),{ready:true,research:'codex'});
 const removed=await fetch(`http://127.0.0.1:${port}/api/compare`,{method:'POST',headers,body:'{}'});
 assert.equal(removed.status,404);
});
