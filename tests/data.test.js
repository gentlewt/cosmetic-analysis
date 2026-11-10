import test from 'node:test';
import assert from 'node:assert/strict';
import {searchProducts,routineSummary} from '../src/data.js';
test('제품명, 브랜드, 성분으로 검색할 수 있다',()=>{assert.equal(searchProducts('판테놀').length,2);assert.equal(searchProducts('온유 스킨')[0].id,'serum');assert.equal(searchProducts('없는 제품').length,0);assert.equal(searchProducts('  ').length,3);});
test('선택한 제품에서 중복 성분을 찾는다',()=>{assert.deepEqual(routineSummary(['calm','cream']),{count:2,duplicates:['판테놀']});assert.deepEqual(routineSummary([]),{count:0,duplicates:[]});assert.deepEqual(routineSummary(['calm','calm','unknown']),{count:1,duplicates:[]});});
