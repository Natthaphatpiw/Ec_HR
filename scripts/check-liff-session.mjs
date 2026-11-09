import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path,{env={},modules={},fetch}={}) {
 const filename=fileURLToPath(new URL(path,import.meta.url));
 const source=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const logs=[];
 const context=vm.createContext({exports:{},process:{env},Request,Response,Headers,URL,URLSearchParams,performance,AbortSignal,AbortController,setTimeout,clearTimeout,fetch,
 console:{error:(...args)=>logs.push(args.join(' ')),warn:(...args)=>logs.push(args.join(' '))},
 require(name){if(name==='node:crypto')return require(name);if(name==='server-only')return {};assert.ok(Object.hasOwn(modules,name),`Unexpected ${name}`);return modules[name];}});
 vm.runInContext(source,context,{filename});return {...context.exports,logs};
}
const userId=`U${'a'.repeat(32)}`,channelId='1000000000',idToken='synthetic-test-token';
const claims={iss:'https://access.line.me',aud:channelId,sub:userId,exp:Math.floor(Date.now()/1000)+900,name:'Synthetic Employee'};
const config={NODE_ENV:'production',DEMO_MODE:'false',LINE_LOGIN_CHANNEL_ID:channelId,LIFF_SESSION_SECRET:'s'.repeat(64)};
class StoreError extends Error {}
function fixture({env=config,payload=claims,status=200,redis=true}={}) {
 const requests=[],writes=[],commands=[],cache=new Map(),cookieStore=new Map();
 let session=null,storeDown=false;
 const redisModule={SessionStoreUnavailableError:StoreError,redisSessionConfigured:()=>redis,sessionRedisNamespace:()=> 'local-only-test',async sessionRedisCommand(args){
  if(storeDown)throw new StoreError();commands.push(args);if(args[0]==='GET')return cache.get(args[1])??null;
  if(args[0]==='SET'){cache.set(args[1],args[2]);return 'OK';}throw new Error('Unexpected command');}};
 const verifier=load('../src/lib/line-id-token.ts',{env,modules:{'@/lib/session-redis':redisModule},fetch:async(url,options)=>{
  requests.push({url,options});if(payload instanceof Error)throw payload;return new Response(JSON.stringify(payload),{status});}});
 const origin=load('../src/lib/request-origin.ts',{env});
 const route=load('../src/app/api/liff/session/route.ts',{env,modules:{
  'next/headers':{cookies:async()=>({delete:key=>cookieStore.delete(key)})},
  'next/server':{NextResponse:{json:(body,options)=>new Response(JSON.stringify(body),{...options,headers:{...options.headers,'Content-Type':'application/json'}})}},
  '@/lib/liff-session':{isExplicitDemoMode:()=>env.DEMO_MODE==='true',readLiffSession:async()=>{if(storeDown)throw new StoreError();return session;},
   createLiffSession:async(profile,options={})=>{if(storeDown)throw new StoreError();writes.push({profile,options});session={profile,demoMode:options.demoMode===true,storage:redis?'redis':'cookie',expiresAt:Math.floor(Date.now()/1000)+(redis?604800:28800)};return session;},
   deleteLiffSession:async()=>{session=null;if(storeDown)throw new StoreError();}},
  '@/lib/line-id-token':verifier,'@/lib/session-redis':redisModule,'@/lib/request-origin':origin,'@/lib/dashboard-auth-config':{DASHBOARD_SESSION_COOKIE:'web_session'},
 }});
 return {...route,requests,writes,commands,cache,cookieStore,verifier,setSession:v=>session=v,setStoreDown:v=>storeDown=v,
  post:(body,originHeader)=>route.POST(new Request('https://app.invalid/api/liff/session',{method:'POST',headers:{'Content-Type':'application/json',...(originHeader?{Origin:originHeader}:{})},body:JSON.stringify(body)})),
  delete:originHeader=>route.DELETE(new Request('https://app.invalid/api/liff/session',{method:'DELETE',headers:originHeader?{Origin:originHeader}:{}}))};
}
for(const [key,error]of [['LINE_LOGIN_CHANNEL_ID','line_login_not_configured'],['LIFF_SESSION_SECRET','liff_session_not_configured']]){
 const f=fixture({env:{...config,[key]:''}});const r=await f.post({idToken});assert.equal(r.status,503);assert.equal((await r.json()).error,error);assert.equal(f.requests.length,0);assert.equal(f.writes.length,0);assert.ok(f.logs.some(line=>line.includes(key)));assert.ok(f.logs.every(line=>!line.includes(idToken)&&!line.includes(config.LIFF_SESSION_SECRET)));
}
const f=fixture();assert.equal((await f.GET()).status,401);
const response=await f.post({idToken});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.ok(response.headers.get('server-timing').startsWith('auth;dur='));
assert.equal(response.headers.get('x-login-session-store'),'redis');
const result=await response.json();assert.equal(result.profile.userId,userId);assert.equal(result.storage,'redis');assert.ok(result.expiresAt>claims.exp,'Own app session is independent of LINE token expiration after verified login');
assert.equal(f.requests[0].url,'https://api.line.me/oauth2/v2.1/verify');assert.equal(f.requests[0].options.body.get('client_id'),channelId);assert.equal(f.requests[0].options.body.get('id_token'),idToken);
assert.equal((await f.GET()).status,200);assert.equal((await f.post({idToken})).status,200);assert.equal(f.requests.length,1,'Verified token cache avoids a second LINE request');
assert.ok(!JSON.stringify([...f.cache]).includes(idToken),'No raw token in Redis keys/records');
const setCommand=f.commands.find(c=>c[0]==='SET');assert.equal(setCommand[3],'EX');assert.ok(Number(setCommand[4])<=300);
f.cookieStore.set('web_session','signed-test-web-cookie');assert.equal((await f.delete()).status,200);assert.equal((await f.GET()).status,401);assert.equal(f.cookieStore.has('web_session'),false);
for(const override of [{aud:'9999999999'},{iss:'https://untrusted.invalid'},{sub:'EMP001'},{exp:0},{exp:'9999999999'}]){
 const bad=fixture({payload:{...claims,...override}});assert.equal((await bad.post({idToken})).status,401);assert.equal(bad.writes.length,0);assert.equal(bad.cache.size,0);
}
const nonce=fixture({payload:{...claims,nonce:'correct-nonce'}});assert.equal(await nonce.verifier.verifyLineIdToken(idToken,channelId,'wrong-nonce'),null);assert.equal(nonce.cache.size,0);assert.ok(await nonce.verifier.verifyLineIdToken(idToken,channelId,'correct-nonce'));assert.equal(nonce.requests[1].options.body.get('nonce'),'correct-nonce');
for(const status of [400,401])assert.equal((await fixture({status}).post({idToken})).status,401);
for(const status of [429,500])assert.equal((await fixture({status}).post({idToken})).status,502);
assert.equal((await fixture({payload:new Error('synthetic timeout')}).post({idToken})).status,502);
for(const invalid of [null,[],{}, {idToken:123},{idToken:'x'.repeat(8193)}])assert.equal((await fixture().post(invalid)).status,400);
assert.equal((await fixture().post({demo:true})).status,401);
assert.equal((await fixture({env:{...config,DEMO_MODE:'true'}}).post({demo:true})).status,200);
const csrf=fixture();assert.equal((await csrf.post({idToken},'https://untrusted.invalid')).status,403);assert.equal((await csrf.delete('https://untrusted.invalid')).status,403);assert.equal(csrf.requests.length,0);
const down=fixture();down.setStoreDown(true);assert.equal((await down.GET()).status,503);assert.equal((await down.post({idToken})).status,503);assert.equal(down.requests.length,0);assert.equal((await down.delete()).status,503);
const noRedis=fixture({redis:false});assert.equal((await noRedis.post({idToken})).status,200);assert.equal((await (await noRedis.GET()).json()).storage,'cookie');
console.log('LIFF session API + LINE token cache checks passed: resume, rotation contract, claims, nonce, TTL, logout, CSRF and Redis failure.');
