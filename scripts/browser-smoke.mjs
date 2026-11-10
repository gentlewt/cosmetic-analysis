import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4175','--strictPort'], {stdio:'pipe',env:{...process.env,VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}});
const base='http://127.0.0.1:4175';
let browser;
try {
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'Vite did not start');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/#routine');
  await page.locator('[data-connection-status="demo"]').waitFor();
  assert.equal(await page.locator('#check-connection').count(),0);
  const add=async id=>{await page.locator('#add-product').selectOption(id);await page.locator('#add-item').click();};
  await add('calm');await add('serum');await add('cream');
  await page.locator('[data-frequency="0"]').selectOption('격일');
  // Native desktop drag changes order.
  await page.locator('.routine-row').nth(2).dragTo(page.locator('.routine-row').nth(0));
  assert.match(await page.locator('.row-title').first().innerText(),/소프트/);
  // Pointer handle works with mouse.
  let a=await page.locator('.drag-handle').first().boundingBox(), b=await page.locator('.routine-row').nth(1).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+60,b.y+b.height/2,{steps:8});await page.mouse.up();
  assert.match(await page.locator('.row-title').first().innerText(),/카밍/);
  await page.locator('[data-period="evening"]').click();await add('calm');await page.locator('[data-frequency="0"]').selectOption('주 1회');
  await page.goto(base+'/#home');assert.equal(await page.locator('.saved-list').count(),0);
  await page.goto(base+'/#routine');await page.locator('#confirm').click();assert.match(await page.locator('#status').innerText(),/버전 1/);
  await page.goto(base+'/#home');assert.equal(await page.locator('.saved-list').count(),2);assert.match(await page.locator('.routine-columns').innerText(),/격일/);assert.match(await page.locator('.routine-columns').innerText(),/주 1회/);
  await page.reload();assert.equal(await page.locator('.saved-list').count(),2);
  const getGuest=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cosmetic-guest-v1')));
  const first=(await getGuest()).versions[0];
  await page.goto(base+'/#products');
  for(const id of ['calm','serum','cream','lotion'])await page.locator(`#results [data-compare="${id}"]`).click();
  await page.locator('#results [data-compare="cleanser"]').click();assert.match(await page.locator('#status').innerText(),/최대 4개/);assert.equal(await page.locator('.comparison article').count(),4);
  await page.locator('#search').fill('판테놀');assert.equal(await page.locator('#results .product-card').count(),3);
  await page.locator('#results [data-favorite="calm"]').click();assert.deepEqual((await getGuest()).versions[0],first);
  await page.goto(base+'/#mypage');await page.locator('[name="memo"]').fill('관심 메모');await page.locator('[data-memo] button').click();await page.reload();assert.equal(await page.locator('[name="memo"]').inputValue(),'관심 메모');
  await page.locator('[data-favorite="calm"]').click();assert.deepEqual((await getGuest()).versions[0],first);
  // Touch drag at mobile width (actual touch input through Chromium).
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/#routine');await page.locator('[data-period="morning"]').click();
  await page.locator('.edit-list').evaluate(el=>el.scrollIntoView({block:'start'}));
  a=await page.locator('.drag-handle').first().boundingBox();b=await page.locator('.routine-row').nth(1).boundingBox();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+60,y:b.y+30}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.match(await page.locator('.row-title').first().innerText(),/소프트/);
  await page.locator('#confirm').click();assert.equal((await getGuest()).versions.length,2);assert.deepEqual((await getGuest()).versions[0],first);
  // Cancellation restores both sessions, unsaved change is not committed by reload.
  await page.locator('[data-frequency="0"]').selectOption('필요할 때');await page.locator('#discard').click();assert.equal(await page.locator('[data-frequency="0"]').inputValue(),'매일');
  await page.locator('[data-remove="0"]').click();await page.reload();assert.equal(await page.locator('.routine-row').count(),3);
  // Storage failure never creates a committed version.
  await page.locator('[data-remove="0"]').click();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('quota');};});await page.locator('#confirm').click();assert.equal((await getGuest()).versions.length,2);assert.match(await page.locator('[role="alert"]').innerText(),/저장하지 못/);
  await page.reload();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    for(const route of ['home','routine','products','ingredients','concerns','journal','mypage']){
      await page.goto(base+'/#'+route);await page.locator('h1').waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflow ${width}`);
    }
  }
  await page.goto(base+'/#journal');await page.locator('#memo').fill('<script>not executable</script>');await page.locator('button[type="submit"]').click();await page.reload();assert.equal(await page.locator('.entry').count(),1);await page.locator('[data-delete]').click();assert.equal(await page.locator('.entry').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile routes, native/mouse/touch drag, independent AM/PM frequency, batch save, versions, cancel/reload, favorites/memo, 4-product limit, search, storage failure, diary, no overflow or runtime errors');
} finally { if(browser)await browser.close();server.kill(); }
