import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('비공개 키가 설정되면 브라우저 번들을 생성하기 전에 빌드를 중단하고 키를 출력하지 않는다',()=>{
 const output=mkdtempSync(join(tmpdir(),'cosmetic-build-guard-'));
 const dummy='sb_secret_build_test_not_a_real_key';
 try {
  const run=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',output],{encoding:'utf8',env:{...process.env,VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:dummy}});
  assert.notEqual(run.status,0);assert.match(run.stderr,/Supabase browser configuration rejected/);
  assert.ok(!(run.stdout+run.stderr).includes(dummy));assert.equal(readdirSync(output).length,0);
 } finally {rmSync(output,{recursive:true,force:true});}
});
