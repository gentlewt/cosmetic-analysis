export const products = [
  {id:'calm', name:'카밍 데일리 토너', brand:'라벤더 랩', type:'토너', ingredients:['판테놀','병풀 추출물'], price:'18,000', tone:'mint'},
  {id:'serum', name:'글로우 밸런스 세럼', brand:'온유 스킨', type:'세럼', ingredients:['나이아신아마이드','히알루론산'], price:'26,000', tone:'purple'},
  {id:'cream', name:'소프트 배리어 크림', brand:'디어 데일리', type:'크림', ingredients:['세라마이드','판테놀'], price:'24,000', tone:'peach'}
];
export const ingredients = [
  {name:'나이아신아마이드', tag:'피부 톤 · 장벽', text:'피부 장벽과 균일한 피부 톤 관리에 사용되는 비타민 B3 유도체입니다. 농도와 제형에 따라 자극이 생길 수 있어 천천히 사용해 보세요.'},
  {name:'판테놀', tag:'보습 · 진정', text:'수분을 유지하고 피부를 편안하게 관리하는 데 쓰이는 성분입니다. 모든 피부에 자극이 없는 것은 아니므로 새 제품은 소량부터 확인하세요.'},
  {name:'히알루론산', tag:'수분 유지', text:'수분을 끌어당기는 보습 성분입니다. 건조한 환경에서는 보습 크림과 함께 사용하는 것이 도움이 될 수 있습니다.'},
  {name:'세라마이드', tag:'장벽 · 보습', text:'피부 각질층의 지질을 구성하는 성분으로, 건조한 피부의 보습 관리에 활용됩니다.'},
  {name:'병풀 추출물', tag:'피부 컨디셔닝', text:'피부 컨디셔닝 목적으로 사용되는 식물 유래 성분입니다. 식물 성분에도 개인별 민감 반응이 있을 수 있습니다.'}
];
export function searchProducts(query) { const q=query.trim().toLowerCase(); return products.filter(p=>[p.name,p.brand,p.type,...p.ingredients].join(' ').toLowerCase().includes(q)); }
export function routineSummary(ids) { const selected=products.filter(p=>ids.includes(p.id)); const counts={}; for(const p of selected) for(const i of p.ingredients) counts[i]=(counts[i]||0)+1; return {count:selected.length,duplicates:Object.keys(counts).filter(i=>counts[i]>1)}; }
