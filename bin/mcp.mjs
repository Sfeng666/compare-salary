#!/usr/bin/env node
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {compareSalary} from '../src/compare.mjs';
import {loadDatabase,saveEntry} from '../src/local.mjs';
import {resolveLocation,validateEntry} from '../src/locations.mjs';
import {fullResearchPrompt as researchPrompt} from '../src/research.mjs';
import {contributionUrl} from '../src/contribute.mjs';
const server=new McpServer({name:'compare-salary',version:'0.3.0'});
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const wrap=fn=>async args=>{try{return result(await fn(args));}catch(e){return {...result({error:e.message}),isError:true};}};
server.registerTool('compare_salary',{description:'Deterministic US salary purchasing-power comparison. Fully remote work requires residence. No AI call. Default Single filing, one adult, one bedroom, 2026.',inputSchema:{location:z.string().optional(),residence:z.string().optional(),remote:z.boolean().optional(),salary:z.number(),period:z.enum(['year','month','week','hour']).optional(),reference:z.string(),options:z.record(z.any()).optional()},annotations:{readOnlyHint:true}},wrap(args=>compareSalary(args,loadDatabase())));
server.registerTool('lookup_location',{description:'Inspect cached city costs and provenance; an unknown city gets an explicitly labeled state approximation.',inputSchema:{location:z.string()},annotations:{readOnlyHint:true}},wrap(({location})=>resolveLocation(loadDatabase(),location)));
server.registerTool('research_location_prompt',{description:'Get instructions for the HOST agent to research a missing location using its own search tools. Does not call another agent.',inputSchema:{location:z.string()},annotations:{readOnlyHint:true}},wrap(({location})=>({prompt:researchPrompt(location)})));
server.registerTool('save_location',{description:'Validate and save researched PUBLIC location data to the user’s local database. Does not publish it.',inputSchema:{entry:z.record(z.any())},annotations:{destructiveHint:false}},wrap(({entry})=>({path:saveEntry(entry)})));
server.registerTool('prepare_location_contribution',{description:'Validate public location data and return a GitHub edit/fork link. Publishing a PR is a separate explicit action.',inputSchema:{entry:z.record(z.any())},annotations:{readOnlyHint:true}},wrap(({entry})=>({entry:validateEntry(entry),url:contributionUrl(entry)})));
await server.connect(new StdioServerTransport());
