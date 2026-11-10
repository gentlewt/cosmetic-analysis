import './style.css';
import { products, ingredients, searchProducts } from './data.js';
import { FREQUENCIES, PERIODS, emptyRoutine, clone, addItem, moveItem, confirmVersion, readGuest, writeGuest, toggleComparison } from './routines.js';

const nav = [['home','홈'],['routine','루틴 편집'],['products','제품 검색·비교'],['ingredients','성분 사전'],['concerns','피부 고민별 추천'],['journal','피부 변화 기록'],['mypage','마이페이지']];
const app = document.querySelector('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const product = id => products.find(p => p.id === id);
let guest = { versions: [], favorites: [] }, storageNotice = '';
try { guest = readGuest(localStorage, products.map(p => p.id)); writeGuest(localStorage, guest); }
catch { storageNotice = '브라우저 데이터를 읽거나 갱신하지 못했습니다. 기존 데이터를 덮어쓰지 않으며 저장 시 다시 확인합니다.'; }
const saved = () => guest.versions.at(-1)?.items || emptyRoutine();
let draft = clone(saved()), period = 'morning', compared = [], query = '', message = '', currentPage = '';
const dirty = () => JSON.stringify(draft) !== JSON.stringify(saved());
function persist(next) { try { if (storageNotice) readGuest(localStorage, products.map(p => p.id)); writeGuest(localStorage, next); guest = next; storageNotice = ''; return true; } catch { storageNotice = '저장하지 못했습니다. 브라우저 저장 공간과 접근 권한을 확인하세요. 수정 내용은 화면에 유지됩니다.'; return false; } }
const heading = (k,t,d) => `<div class="page-heading"><span class="eyebrow">${k}</span><h1>${t}</h1><p>${d}</p></div>`;
function image(p) { return p.image ? `<div class="product-art"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>` : '<div class="product-art placeholder">이미지 준비중</div>'; }
function card(p) {
  const favorite = guest.favorites.some(f => f.productId === p.id);
  return `<article class="product-card">${image(p)}<div class="product-info"><small>${esc(p.brand)} · ${esc(p.type)}</small><h3>${esc(p.name)}</h3>${p.status !== 'approved' ? '<span class="pending">임시 등록 · 검증 필요</span>' : ''}<p>예시 성분: ${p.ingredients.map(esc).join(' · ')}</p><div class="card-bottom"><strong>₩${p.price}</strong><button class="small-button" data-compare="${p.id}" aria-pressed="${compared.includes(p.id)}">${compared.includes(p.id) ? '비교에서 제외' : '+ 비교'}</button><button class="small-button" data-favorite="${p.id}" aria-pressed="${favorite}">${favorite ? '♥ 관심 해제' : '♡ 관심제품'}</button></div></div></article>`;
}
function routineList(items, label) {
  return items.length ? `<ol class="saved-list">${items.map(i => `<li><strong>${esc(product(i.productId).name)}</strong><span>${esc(i.frequency)}</span></li>`).join('')}</ol>` : `<p class="empty">아직 확정한 ${label} 루틴이 없어요.</p>`;
}
function home() {
  const v = guest.versions.at(-1);
  return heading('YOUR MORNING & EVENING','아침부터 저녁까지, 나의 루틴','내 화장품 조합, 나에게 잘 맞을까? 매일의 루틴을 차근차근 정리해 보세요.') +
    `<div class="notice">비회원 체험 · 가상 제품 사용 · 이 브라우저에만 임시 저장됩니다. 마지막 사용 후 30일이 지나면 다음 방문 시 삭제됩니다. 로그인 이전은 아직 제공되지 않습니다.</div><div class="section-title"><h2>${v ? `확정한 루틴 · 버전 ${v.version}` : '나만의 루틴 시작하기'}</h2><a class="button" href="#routine">루틴 편집하기 →</a></div>${dirty() ? '<p class="draft-note">저장 전 수정 내용이 있어요. 아래에는 확정한 루틴만 표시합니다.</p>' : ''}<div class="routine-columns">${Object.entries(PERIODS).map(([key,label]) => `<section class="panel"><span class="eyebrow">${key === 'morning' ? 'MORNING' : 'EVENING'}</span><h2>${label} 루틴</h2>${routineList(saved()[key], label)}</section>`).join('')}</div><section class="panel"><h2>루틴 분석은 준비 중이에요</h2><p>승인된 제품·성분 정보와 분석 기준을 연결하기 전에는 적합성, 병용 주의, 안전성 결과를 제공하지 않습니다.</p></section>`;
}
function editor() {
  return heading('MY DAILY ROUTINE','아침·저녁 루틴 편집','순서와 사용 빈도를 수정한 뒤 두 루틴을 한 번에 확정하세요.') +
    `<div class="notice">가상 제품으로 편집하는 화면입니다. 확정 전 수정 내용은 현재 화면 세션에만 유지되며 새로고침하면 사라집니다.</div><div class="chips" aria-label="편집할 루틴">${Object.entries(PERIODS).map(([key,label]) => `<button data-period="${key}" aria-pressed="${period === key}">${label} 루틴 (${draft[key].length})</button>`).join('')}</div><section class="panel"><h2>${PERIODS[period]} 루틴</h2><p id="sort-help">손잡이를 드래그하거나 위·아래 버튼으로 순서를 바꾸세요. 같은 제품을 아침·저녁에 각각 추가할 수 있어요.</p><ol class="edit-list" aria-describedby="sort-help">${draft[period].map((item,index) => `<li class="routine-row" data-index="${index}" draggable="true"><button class="drag-handle" aria-label="${esc(product(item.productId).name)} 드래그하여 순서 변경">⠿</button><div class="row-title"><span>${index+1}. ${esc(product(item.productId).name)}</span><small>임시 등록 · 검증 필요</small></div><label class="frequency-label">사용 빈도<select data-frequency="${index}">${FREQUENCIES.map(f => `<option ${f === item.frequency ? 'selected' : ''}>${f}</option>`).join('')}</select></label><div class="row-actions"><button class="small-button" data-move="${index}" data-offset="-1" ${index===0?'disabled':''} aria-label="${esc(product(item.productId).name)} 위로">↑</button><button class="small-button" data-move="${index}" data-offset="1" ${index===draft[period].length-1?'disabled':''} aria-label="${esc(product(item.productId).name)} 아래로">↓</button><button class="small-button" data-remove="${index}">제거</button></div></li>`).join('')}</ol>${!draft[period].length ? '<p class="empty">아래에서 제품을 추가하세요.</p>' : ''}<label for="add-product">${PERIODS[period]} 루틴에 제품 추가</label><div class="add-product"><select id="add-product"><option value="">예시 제품 선택</option>${products.filter(p => !draft[period].some(i => i.productId===p.id)).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select><button class="small-button" id="add-item">추가</button></div></section><section class="save-bar"><p>${dirty() ? '저장하지 않은 수정 내용이 있습니다.' : '확정된 루틴과 동일합니다.'}</p><button class="small-button" id="discard" ${!dirty()?'disabled':''}>수정 취소</button><button class="button" id="confirm" ${!dirty()?'disabled':''}>이대로 루틴 확정하기</button></section><details class="panel"><summary>브라우저의 루틴 확정 이력 (${guest.versions.length})</summary>${guest.versions.slice().reverse().map(v => `<section><h3>버전 ${v.version} · ${esc(new Date(v.confirmedAt).toLocaleString('ko-KR'))}</h3>${Object.entries(PERIODS).map(([key,label]) => `<h4>${label}</h4>${routineList(v.items[key],label)}`).join('')}</section>`).join('') || '<p>확정 이력이 없습니다.</p>'}</details>`;
}
function productPage() {
  return heading('FIND YOUR ESSENTIALS','제품 검색·비교','가상의 제품 정보입니다. 비교는 성분 목록의 나란히 보기이며 분석 결과가 아닙니다.') + `<label class="search-label" for="search">제품 또는 성분 검색</label><input id="search" class="search" value="${esc(query)}" placeholder="예: 판테놀, 세럼"><p class="sample-note">최대 4개 비교 · 관심제품은 루틴과 독립적으로 저장됩니다.</p><div id="results" class="product-grid">${productResults()}</div><section class="panel"><h2>제품 비교 (${compared.length}/4)</h2><div class="comparison">${compared.map(id => { const p=product(id); return `<article><h3>${p.name}</h3><p>${p.type} · ₩${p.price}</p><p>예시 성분: ${p.ingredients.join(' / ')}</p><button class="small-button" data-compare="${id}">비교에서 제외</button></article>`; }).join('') || '<p>비교할 제품을 선택하세요.</p>'}</div></section>`;
}
const productResults = () => searchProducts(query).map(card).join('') || '<p class="empty">검색 결과가 없어요.</p>';
function favoritesPage() {
  return heading('MY SKINCARE SPACE','마이페이지 · 관심제품','관심제품을 추가하거나 지워도 확정 루틴과 편집 중인 루틴은 바뀌지 않습니다.') + `<div class="notice">로그인과 서버 동기화는 아직 연결하지 않았습니다. 루틴·관심제품은 브라우저 임시 저장만 지원합니다.</div><h2>관심제품 (${guest.favorites.length})</h2>${guest.favorites.map(f => `<section class="panel">${card(product(f.productId))}<form data-memo="${f.productId}"><label for="memo-${f.productId}">개인 메모</label><textarea id="memo-${f.productId}" name="memo" maxlength="500">${esc(f.memo)}</textarea><button class="small-button">메모 저장</button></form></section>`).join('') || '<p class="empty">제품 검색에서 관심제품을 추가해 보세요.</p>'}<a class="button" href="#routine">루틴 편집하기</a>`;
}
function readEntries() { try { const data=JSON.parse(localStorage.getItem('skin-diary') || '[]'); return Array.isArray(data) ? data.filter(e=>e&&typeof e.date==='string'&&typeof e.condition==='string'&&typeof e.memo==='string') : []; } catch { return []; } }
function entries() { return readEntries().map((e,i) => `<article class="entry"><div><small>${esc(e.date)}</small><h3>${esc(e.condition)}</h3><p>${esc(e.memo)}</p>${e.concern?`<p>관련 고민: ${esc(e.concern)}</p>`:''}</div><button class="small-button" data-delete="${i}">삭제</button></article>`).join('') || '<p class="empty">아직 기록이 없어요.</p>'; }
function journal() { return heading('SKIN DIARY','피부 변화 기록','기존 기록은 그대로 유지됩니다. 사진과 계정 동기화는 아직 제공하지 않습니다.') + `<form id="diary" class="panel"><label for="date">기록 날짜</label><input id="date" name="date" type="date" required value="${new Date().toLocaleDateString('en-CA')}"><label for="condition">피부 변화 상태</label><select id="condition" name="condition"><option>좋아짐</option><option>비슷함</option><option>나빠짐</option></select><label for="record-concern">관련 피부 고민</label><input id="record-concern" name="concern" maxlength="100"><label for="memo">오늘의 메모</label><textarea id="memo" name="memo" maxlength="500"></textarea><button class="button" type="submit">기록 저장하기</button></form><div id="entries">${entries()}</div>`; }
function content(page) {
  switch(page) {
    case 'home': return home(); case 'routine': return editor(); case 'products': return productPage(); case 'mypage': return favoritesPage(); case 'journal': return journal();
    case 'ingredients': return heading('INGREDIENT LIBRARY','성분 사전','현재는 성분명 목록만 제공하며 승인된 설명·출처를 연결하기 전에는 효능이나 주의 정보를 표시하지 않습니다.') + ingredients.map(i=>`<details class="ingredient"><summary>${esc(i.name)}</summary><p>설명 및 근거 자료 연결 준비 중입니다. 분석·판정 결과가 아닙니다.</p></details>`).join('');
    case 'concerns': return heading('CARE FOR YOUR SKIN','피부 고민별 추천','피부 프로필과 승인된 추천 기준을 연결한 뒤 제공할 예정입니다.') + '<section class="panel"><h2>맞춤 추천 준비 중</h2><p>현재 피부 진단, 맞춤 제품 추천 또는 성분 적합성 결과를 제공하지 않습니다.</p></section>';
    default: return heading('PAGE NOT FOUND','페이지를 찾을 수 없어요','메뉴에서 화면을 선택해 주세요.');
  }
}
function render() {
  currentPage=location.hash.slice(1)||'home';
  app.innerHTML=`<header><a class="brand" href="#home"><span class="brand-mark">✳</span><span>내 화장품 조합,<br><b>나에게 잘 맞을까?</b></span></a><nav aria-label="주 메뉴">${nav.map(([id,label])=>`<a href="#${id}" ${currentPage===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav></header><main id="main"><p id="status" role="status">${esc(message)}</p>${storageNotice?`<p class="notice" role="alert">${esc(storageNotice)}</p>`:''}${content(currentPage)}</main><footer><a class="footer-brand" href="#home">내 화장품 조합, 나에게 잘 맞을까?</a><p>가상 제품으로 구성한 개발 화면 · 실제 분석 결과를 제공하지 않습니다.</p></footer>`;
  bind();
}
function updateDraft(next, note='루틴을 수정했습니다. 확정 버튼을 눌러 저장하세요.') { draft=next; message=note; render(); }
function bind() {
  const input=app.querySelector('#search'); if(input) input.oninput=()=>{query=input.value;app.querySelector('#results').innerHTML=productResults();bindCards();};
  bindCards();
  app.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;message='';render();});
  const add=app.querySelector('#add-item'); if(add) add.onclick=()=>{const id=app.querySelector('#add-product').value;if(id)updateDraft(addItem(draft,period,id));};
  app.querySelectorAll('[data-frequency]').forEach(s=>s.onchange=()=>{const next=clone(draft);next[period][Number(s.dataset.frequency)].frequency=s.value;updateDraft(next);});
  app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const next=clone(draft);next[period].splice(Number(b.dataset.remove),1);updateDraft(next);});
  app.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>updateDraft(moveItem(draft,period,Number(b.dataset.move),Number(b.dataset.move)+Number(b.dataset.offset))));
  const confirm=app.querySelector('#confirm'); if(confirm) confirm.onclick=()=>{if(!dirty())return;const next={...guest,versions:confirmVersion(guest.versions,draft)};if(persist(next)){message=`루틴 버전 ${guest.versions.at(-1).version}을 확정했습니다. 아침·저녁 루틴을 함께 저장했어요.`;draft=clone(saved());}render();};
  const discard=app.querySelector('#discard');if(discard)discard.onclick=()=>{draft=clone(saved());message='수정을 취소하고 마지막 확정 루틴으로 돌아왔습니다.';render();};
  bindSort();
  app.querySelectorAll('[data-memo]').forEach(f=>f.onsubmit=e=>{e.preventDefault();const memo=new FormData(f).get('memo');if(persist({...guest,favorites:guest.favorites.map(x=>x.productId===f.dataset.memo?{...x,memo}:x)}))message='관심제품 메모를 저장했습니다.';render();});
  const form=app.querySelector('#diary');if(form)form.onsubmit=e=>{e.preventDefault();try{localStorage.setItem('skin-diary',JSON.stringify([Object.fromEntries(new FormData(form)),...readEntries()]));message='기록을 저장했습니다.';}catch{message='기록을 저장하지 못했습니다.';}render();};
  app.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{try{const data=readEntries();data.splice(Number(b.dataset.delete),1);localStorage.setItem('skin-diary',JSON.stringify(data));message='기록을 삭제했습니다.';}catch{message='기록을 삭제하지 못했습니다.';}render();});
}
function bindCards() {
  app.querySelectorAll('[data-compare]').forEach(b=>b.onclick=()=>{const next=toggleComparison(compared,b.dataset.compare);message=next===compared?'제품은 최대 4개까지 비교할 수 있습니다.':'';compared=next;render();});
  app.querySelectorAll('[data-favorite]').forEach(b=>b.onclick=()=>{const id=b.dataset.favorite,exists=guest.favorites.some(f=>f.productId===id);if(persist({...guest,favorites:exists?guest.favorites.filter(f=>f.productId!==id):[...guest.favorites,{productId:id,memo:'',createdAt:new Date().toISOString()}]}))message=exists?'관심제품에서 제거했습니다. 루틴은 유지됩니다.':'관심제품에 추가했습니다. 루틴은 유지됩니다.';render();});
}
function bindSort() {
  let from=null;
  app.querySelectorAll('.routine-row').forEach(row=>{
    row.ondragstart=e=>{from=Number(row.dataset.index);e.dataTransfer.setData('text/plain',String(from));e.dataTransfer.effectAllowed='move';};
    row.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';};
    row.ondrop=e=>{e.preventDefault();if(from!==null)updateDraft(moveItem(draft,period,from,Number(row.dataset.index)));from=null;};
    const handle=row.querySelector('.drag-handle');
    handle.onpointerdown=e=>{
      if(e.button!==0)return;e.preventDefault();const start=Number(row.dataset.index);let target=start;handle.setPointerCapture(e.pointerId);row.classList.add('dragging');
      handle.onpointermove=ev=>{const over=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.routine-row');if(over){target=Number(over.dataset.index);app.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));over.classList.add('drop-target');}};
      const finish=cancel=>{handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;if(cancel){row.classList.remove('dragging');app.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));}else updateDraft(moveItem(draft,period,start,target),'순서를 변경했습니다. 확정 버튼을 눌러 저장하세요.');};
      handle.onpointerup=()=>finish(false);handle.onpointercancel=()=>finish(true);
    };
  });
}
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',()=>{message='';render();window.scrollTo(0,0);});
render();
