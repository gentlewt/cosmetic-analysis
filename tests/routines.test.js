import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRoutine,addItem,moveItem,confirmVersion,FREQUENCIES,readGuest,writeGuest,GUEST_KEY,MAX_IDLE,toggleComparison} from '../src/routines.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('동일 제품을 아침·저녁에 독립적으로 추가하며 동일 시간대 중복은 방지한다',()=>{
 const original=emptyRoutine();let draft=addItem(original,'morning','calm');
 draft=addItem(draft,'evening','calm');draft=addItem(draft,'morning','calm');
 draft.evening[0].frequency=FREQUENCIES[2];
 assert.equal(draft.morning.length,1);assert.equal(draft.morning[0].frequency,'매일');assert.equal(original.morning.length,0);
});
test('순서 변경, 확정 및 재확정이 과거 버전과 초안을 변경하지 않는다',()=>{
 let draft=addItem(addItem(emptyRoutine(),'morning','calm'),'morning','cream');
 const first=confirmVersion([],draft);draft=moveItem(draft,'morning',0,1);
 const versions=confirmVersion(first,draft);
 assert.equal(first[0].items.morning[0].productId,'calm');assert.equal(versions[1].items.morning[0].productId,'cream');
 assert.equal(versions[1].previousVersionId,versions[0].id);assert.equal(versions[1].version,2);
 draft.morning[0].frequency='주 1회';assert.equal(versions[1].items.morning[0].frequency,'매일');
 assert.equal(versions[1].items.morning[0].productVersionId,'cream-demo-v1');
});
test('브라우저 저장 왕복과 관심제품 독립성, 마지막 사용 30일 만료',()=>{
 const s=storage(),now=1000000000000;const data={versions:confirmVersion([],addItem(emptyRoutine(),'morning','calm')),favorites:[{productId:'cream',memo:'메모'}]};
 writeGuest(s,data,now);assert.deepEqual(readGuest(s,['calm','cream'],now+1),data);
 writeGuest(s,{...data,favorites:[]},now+10);assert.deepEqual(readGuest(s,['calm','cream'],now+20).versions,data.versions);
 assert.deepEqual(readGuest(s,['calm','cream'],now+10+MAX_IDLE),{versions:[],favorites:[]});assert.equal(s.getItem(GUEST_KEY),null);
});
test('잘못된 로컬 데이터와 저장 실패를 성공으로 처리하지 않는다',()=>{
 const s=storage();s.setItem(GUEST_KEY,'broken');assert.throws(()=>readGuest(s,[]));assert.equal(s.getItem(GUEST_KEY),'broken');
 assert.throws(()=>writeGuest({setItem(){throw Error('quota');}},{}));
});
test('제품 비교는 최대 4개이며 선택을 해제하면 새 제품을 넣을 수 있다',()=>{
 let ids=[];for(const id of ['a','b','c','d','e'])ids=toggleComparison(ids,id);
 assert.deepEqual(ids,['a','b','c','d']);ids=toggleComparison(ids,'b');ids=toggleComparison(ids,'e');assert.deepEqual(ids,['a','c','d','e']);
});
