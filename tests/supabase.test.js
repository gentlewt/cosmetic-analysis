import test from 'node:test';
import assert from 'node:assert/strict';
import { readSupabaseConfig } from '../src/lib/supabase-config.js';
import { createSupabaseConnection } from '../src/lib/supabase.js';
const env={VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only_not_real'};
const jwt=role=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role})).toString('base64url'),'test_signature'].join('.');
const spec={swagger:'2.0',paths:{},info:{title:'mock'}};
test('미설정·부분 설정·키 역할·HTTPS URL을 검증한다',()=>{
 assert.equal(readSupabaseConfig({}).status,'demo');
 assert.equal(readSupabaseConfig({VITE_SUPABASE_URL:env.VITE_SUPABASE_URL}).status,'incomplete');
 assert.equal(readSupabaseConfig({...env,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).status,'configured');
 for(const key of [jwt('service_role'),jwt('authenticated'),'sb_secret_test_only','unrecognised']){
  assert.equal(readSupabaseConfig({...env,VITE_SUPABASE_PUBLISHABLE_KEY:key}).status,'invalid');
  assert.equal(readSupabaseConfig({VITE_SUPABASE_PUBLISHABLE_KEY:key}).status,'invalid');
 }
 for(const url of ['http://example.invalid','https://user:password@example.invalid','https://example.invalid/rest/v1','https://example.invalid?token=hidden'])assert.equal(readSupabaseConfig({...env,VITE_SUPABASE_URL:url}).status,'invalid');
 assert.equal(readSupabaseConfig({...env,VITE_SUPABASE_SERVICE_ROLE_KEY:'dummy'}).status,'invalid');
});
test('설정이 없거나 잘못되면 SDK 초기화 및 통신을 하지 않는다',async()=>{
 for(const config of [{},{VITE_SUPABASE_URL:'https://example.invalid'},{...env,VITE_SUPABASE_PUBLISHABLE_KEY:'invalid'}]){
  const connection=createSupabaseConnection(config,{factory(){assert.fail('SDK must not initialise');}});
  const before=connection.getState();assert.deepEqual(await connection.check(),before);
 }
});
test('실제 SDK를 통한 GET 메타데이터 요청만 전송하며 세션을 저장하지 않는다',async()=>{
 const calls=[];
 const connection=createSupabaseConnection(env,{fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(spec),{status:200});}});
 assert.equal(calls.length,0);
 const states=[];const unsubscribe=connection.subscribe(s=>states.push(s.status));
 assert.equal((await connection.check()).status,'reachable');
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://example.invalid/rest/v1/');assert.equal(calls[0].options.method,'GET');
 assert.equal(new Headers(calls[0].options.headers).get('accept'),'application/openapi+json');
 assert.deepEqual(states,['checking','reachable']);unsubscribe();
 assert.equal('key' in connection.getState(),false);
});
test('실패를 공개 키나 원본 서버 오류 없이 표시하고 재시도할 수 있다',async()=>{
 let status=401;
 const connection=createSupabaseConnection(env,{fetchImpl:async()=>new Response(status===200?JSON.stringify(spec):JSON.stringify({message:env.VITE_SUPABASE_PUBLISHABLE_KEY}),{status})});
 for(status of [401,403,404,429,500]){
  const result=await connection.check();assert.equal(result.status,'error');assert.ok(!JSON.stringify(result).includes(env.VITE_SUPABASE_PUBLISHABLE_KEY));
 }
 status=200;assert.equal((await connection.check()).status,'reachable');
});
test('HTML/잘못된 JSON/빈 API 문서를 연결 성공으로 처리하지 않는다',async()=>{
 for(const body of ['<html>OK</html>',JSON.stringify({}),JSON.stringify({swagger:'2.0',paths:null})]){
  const connection=createSupabaseConnection(env,{fetchImpl:async()=>new Response(body)});
  assert.equal((await connection.check()).status,'error');
 }
});
test('타임아웃·중복 클릭·늦은 응답이 연결 상태를 잘못 덮어쓰지 않는다',async()=>{
 let release,calls=0;
 const connection=createSupabaseConnection(env,{timeoutMs:15,fetchImpl:()=>{calls++;return new Promise(r=>release=()=>r(new Response(JSON.stringify(spec))));}});
 const first=connection.check(),second=connection.check();assert.equal(first,second);
 assert.equal((await first).status,'error');assert.match(connection.getState().message,/시간이 초과/);assert.equal(calls,1);
 release();await new Promise(r=>setTimeout(r,10));assert.equal(connection.getState().status,'error');
});
test('SDK 인증 옵션은 자동 세션 유지·토큰 갱신·URL 세션 탐지를 끈다',async()=>{
 const connection=createSupabaseConnection(env,{factory:(_url,_key,options)=>{
  assert.deepEqual(options.auth,{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false});
  assert.equal(options.db.retry,false);
  return {getOpenApiSpec:async()=>({data:spec,error:null,status:200})};
 }});
 await connection.check();
});
