import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4176','--strictPort'],{
 stdio:'pipe',env:{...process.env,VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser_test_not_real'},
});
const base='http://127.0.0.1:4176';let browser;
try {
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[],requests=[];let httpStatus=200;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://example.invalid/**',async route=>{
  requests.push({method:route.request().method(),url:route.request().url()});
  await route.fulfill({status:httpStatus,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(httpStatus===200?{swagger:'2.0',paths:{}}:{message:'upstream-sensitive-message-not-for-ui'})});
 });
 await page.addInitScript(()=>{
  if(!localStorage.getItem('cosmetic-guest-v1'))localStorage.setItem('cosmetic-guest-v1',JSON.stringify({lastUsedAt:Date.now(),versions:[{id:'local-version',version:1,confirmedAt:new Date().toISOString(),previousVersionId:null,items:{morning:[{productId:'calm',productVersionId:'calm-demo-v1',frequency:'격일'}],evening:[]}}],favorites:[{productId:'cream',memo:'기존 관심 메모'}]}));
  if(!localStorage.getItem('sb-existing-auth-token'))localStorage.setItem('sb-existing-auth-token','existing-session-placeholder-not-a-real-token');
  if(!localStorage.getItem('skin-diary'))localStorage.setItem('skin-diary',JSON.stringify([{date:'2026-11-10',condition:'비슷함',memo:'기존 피부 기록'}]));
 });
 await page.goto(base+'/#journal');await page.locator('[data-connection-status="configured"]').waitFor();assert.equal(requests.length,0);
 const before=await page.evaluate(()=>({...localStorage}));
 await page.locator('#memo').fill('저장 전 작성 중 메모');
 await page.locator('#check-connection').click();await page.locator('[data-connection-status="reachable"]').waitFor();
 assert.equal(await page.locator('#memo').inputValue(),'저장 전 작성 중 메모');assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);
 assert.match(await page.locator('#connection-panel').innerText(),/아직 검증하지/);
 httpStatus=401;await page.locator('#check-connection').click();await page.locator('[data-connection-status="error"]').waitFor();assert.match(await page.locator('#connection-panel').innerText(),/401/);assert.ok(!(await page.locator('#connection-panel').innerText()).includes('upstream-sensitive'));
 httpStatus=200;await page.locator('#check-connection').click();await page.locator('[data-connection-status="reachable"]').waitFor();
 await page.goto(base+'/#routine');await page.locator('[data-frequency="0"]').selectOption('필요할 때');
 await page.locator('#check-connection').click();await page.locator('[data-connection-status="reachable"]').waitFor();assert.equal(await page.locator('[data-frequency="0"]').inputValue(),'필요할 때');
 await page.goto(base+'/#home');assert.match(await page.locator('.routine-columns').innerText(),/격일/);
 await page.goto(base+'/#mypage');assert.equal(await page.locator('[name="memo"]').inputValue(),'기존 관심 메모');
 await page.goto(base+'/#journal');assert.match(await page.locator('.entry').innerText(),/기존 피부 기록/);
 for(const r of requests){assert.equal(r.method,'GET');assert.equal(r.url,'https://example.invalid/rest/v1/');}
 assert.equal(requests.length,4);assert.deepEqual(errors,[]);
 console.log('PASS: simulated Data API success/401/retry, no automatic requests, root GET only, no token storage, local routine/favorite/diary preservation, unsaved fields preserved');
} finally {if(browser)await browser.close();server.kill();}
