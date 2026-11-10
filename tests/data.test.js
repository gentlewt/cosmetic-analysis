import test from 'node:test';
import assert from 'node:assert/strict';
import {searchProducts} from '../src/data.js';
test('제품명, 브랜드, 성분으로 검색한다',()=>{
 assert.equal(searchProducts('판테놀').length,3);
 assert.equal(searchProducts('글로우')[0].id,'serum');
 assert.equal(searchProducts('없는 제품').length,0);
 assert.equal(searchProducts('  ').length,5);
});
