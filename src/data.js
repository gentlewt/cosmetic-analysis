export const products = [
  {id:'calm', name:'카밍 데일리 토너', brand:'라벤더 랩', type:'토너', ingredients:['판테놀','병풀 추출물'], price:'18,000', versionId:'calm-demo-v1', status:'pending', image:null},
  {id:'serum', name:'글로우 밸런스 세럼', brand:'온유 스킨', type:'세럼', ingredients:['나이아신아마이드','히알루론산'], price:'26,000', versionId:'serum-demo-v1', status:'pending', image:null},
  {id:'cream', name:'소프트 배리어 크림', brand:'디어 데일리', type:'크림', ingredients:['세라마이드','판테놀'], price:'24,000', versionId:'cream-demo-v1', status:'pending', image:null},
  {id:'lotion', name:'데일리 모이스처 로션', brand:'온유 스킨', type:'로션', ingredients:['세라마이드'], price:'22,000', versionId:'lotion-demo-v1', status:'pending', image:null},
  {id:'cleanser', name:'마일드 클렌저', brand:'디어 데일리', type:'클렌저', ingredients:['판테놀'], price:'16,000', versionId:'cleanser-demo-v1', status:'pending', image:null}
];
// 설명·효능·주의·연구 출처는 승인 데이터 연결 후 별도로 제공합니다.
export const ingredients = ['나이아신아마이드', '판테놀', '히알루론산', '세라마이드', '병풀 추출물'].map(name => ({ name }));
export function searchProducts(query) { const q=query.trim().toLowerCase(); return products.filter(p=>[p.name,p.brand,p.type,...p.ingredients].join(' ').toLowerCase().includes(q)); }
