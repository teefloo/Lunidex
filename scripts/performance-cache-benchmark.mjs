import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
const require=createRequire(import.meta.url);
const root=process.cwd();
const {values}=parseArgs({options:{before:{type:'string'},after:{type:'string',default:'.'},base:{type:'string',default:'http://localhost:3105'},output:{type:'string'}}});
if(!values.before||!values.output)throw new Error('--before and --output required');
const output=resolve(values.output);mkdirSync(output,{recursive:true});
const {build}=require(root+'/node_modules/esbuild');
const {chromium}=require(process.env.LUNIDEX_PLAYWRIGHT_MODULE);
for (const version of ['before','after']) {
 const source=resolve(values[version]);
 await build({stdin:{contents:`import {setCachedData} from ${JSON.stringify(source+'/src/lib/api/cache.ts')};window.auditCache={setCachedData};`,resolveDir:root},bundle:true,platform:'browser',format:'iife',outfile:output+`/cache-${version}.js`,plugins:[{name:'stub-observability',setup(b){b.onResolve({filter:/sentry-observability/},()=>({path:'stub',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const reportFallback=()=>{};export const featureFromCacheKey=()=>"cache";'}));}}]});
}
const browser=await chromium.launch({headless:true,executablePath:process.env.LUNIDEX_CHROMIUM_PATH});
const results=[];
for(const saturated of [false,true]) for(let run=1;run<=5;run++) for(const version of ['before','after']) {
 const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();
 await page.goto(values.base+'/fr');
 await page.addScriptTag({content:readFileSync(output+`/cache-${version}.js`,'utf8')});
 const result=await page.evaluate(async saturated=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('keyval-store',1);request.onupgradeneeded=()=>request.result.createObjectStore('keyval');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  if(saturated)await new Promise((resolve,reject)=>{const t=db.transaction('keyval','readwrite');const s=t.objectStore('keyval');for(let i=0;i<500;i++)s.put({data:i,timestamp:Date.now()-500+i},'poke-cache-v3-existing-'+i);s.put('preserve','primedex-preferences');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});
  let transactions=0;const transaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){transactions++;return transaction.apply(this,args);};
  const start=performance.now();await Promise.all(Array.from({length:100},(_,i)=>window.auditCache.setCachedData('new-'+i,{id:i})));const duration=performance.now()-start;
  const counted=transactions;IDBDatabase.prototype.transaction=transaction;
  const keys=await new Promise(resolve=>{const request=db.transaction('keyval').objectStore('keyval').getAllKeys();request.onsuccess=()=>resolve(request.result);});
  const own=await new Promise(resolve=>{const request=db.transaction('keyval').objectStore('keyval').get('primedex-preferences');request.onsuccess=()=>resolve(request.result);});
  return {durationMs:duration,transactions:counted,cacheEntries:keys.filter(k=>String(k).startsWith('poke-cache-v3-')).length,userData:own,mirrors:localStorage.length};
 },saturated);
 results.push({version,saturated,run,...result});console.log(JSON.stringify(results.at(-1)));await context.close();
}
await browser.close();writeFileSync(output+'/cache-benchmark.json',JSON.stringify(results,null,2));
