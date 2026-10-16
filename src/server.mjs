import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {ROOT,loadDatabase,createPolicyEngine,saveEntry} from './local.mjs';
import {compareSalary} from './compare.mjs';
import {researchPrompt,parseResearch,apiResearch,PROVIDERS} from './research.mjs';
const port=Number(process.env.COMPARE_SALARY_PORT||4317),token=crypto.randomBytes(24).toString('hex');
const origins=new Set(['https://sfeng666.github.io','https://siyuanfeng.com','https://www.siyuanfeng.com',`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
const site=fs.existsSync(path.join(ROOT,'dist/index.html'))?path.join(ROOT,'dist'):ROOT;
const engine=process.env.COMPARE_SALARY_PYTHON?createPolicyEngine(process.env.COMPARE_SALARY_PYTHON):null;
let researchRunning=false;
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&!origins.has(origin)){res.writeHead(403);res.end('Origin not allowed');return;}
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');res.writeHead(204);res.end();return;}
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try{
  if(req.url.startsWith('/api/')){
   if(req.headers.authorization!=='Bearer '+token){send(401,{error:'Companion token required'});return;}
   if(req.url==='/api/health'){send(200,{ready:true,policyEngine:!!engine,research:'codex'});return;}
   if(req.method!=='POST'){send(405,{error:'POST required'});return;}
   let text='';for await(const b of req){text+=b;if(text.length>100000){send(413,{error:'Request too large'});return;}}const data=JSON.parse(text);
   if(req.url==='/api/compare'){send(200,await compareSalary(data,loadDatabase(),{taxCurve:engine?.curve.bind(engine)}));return;}
   if(req.url==='/api/research-api'){
    const preset=PROVIDERS[data.provider];
    if(!preset||!preset.endpoint||new URL(data.endpoint||preset.endpoint).origin!==new URL(preset.endpoint).origin)throw Error('The local relay accepts the selected provider’s official endpoint only');
    send(200,{entry:await apiResearch(data)});return;
   }
   if(req.url==='/api/research'){
    if(researchRunning){send(409,{error:'Research is already running'});return;}researchRunning=true;
    try{const value=await new Promise((resolve,reject)=>{
     const child=spawn(process.env.CODEX_BIN||'codex',['--search','exec','--skip-git-repo-check','--sandbox','read-only','--model',process.env.COMPARE_SALARY_CODEX_MODEL||'gpt-6-luna','-c','model_reasoning_effort="low"',researchPrompt(data.location)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});let output='';let errors='';const timer=setTimeout(()=>{child.kill();reject(Error('Location research timed out'));},240000);child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors=(errors+b).slice(-300));child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);code?reject(Error('Codex research failed: '+errors)):resolve(parseResearch(output,data.location));});
    });send(200,{entry:value});}finally{researchRunning=false;}return;
   }
   if(req.url==='/api/save'){send(200,{path:saveEntry(data.entry)});return;}
   send(404,{error:'Unknown endpoint'});return;
  }
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(site,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(site+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()||/(?:^|\/)\.|node_modules|package-lock/.test(pathname)){res.writeHead(404);res.end('Not found');return;}
  // Serve only website assets and public datasets, never the user's local database.
  if(!/\.(?:html|css|js|mjs|json|svg|png|ico|wasm)$/.test(file)){res.writeHead(404);res.end();return;}
  const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);
 }catch(e){send(400,{error:e.message});}
});
server.listen(port,'127.0.0.1',()=>console.error(`compare salary: http://127.0.0.1:${port}/#connection=${token}\nLocal companion token: ${token}\nOpen the local link to connect automatically. The token is not saved.`));
process.on('SIGTERM',()=>{engine?.close();server.close();});
