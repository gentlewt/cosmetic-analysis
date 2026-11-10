export function mountConnectionPanel(container, connection) {
  function draw(state) {
    container.replaceChildren();
    container.className = 'connection-panel';
    const heading = document.createElement('strong'); heading.textContent = '데이터 연결 상태';
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.dataset.connectionStatus = state.status; status.textContent = state.message;
    const note = document.createElement('p'); note.className='connection-note';
    note.textContent='현재 루틴·관심제품·피부 기록은 브라우저 체험 데이터입니다. API 응답 확인 후에도 자동 동기화하거나 데이터를 이전하지 않습니다.';
    container.append(heading, status, note);
    if (['configured','checking','reachable','error'].includes(state.status)) {
      const button=document.createElement('button');button.type='button';button.className='small-button';button.id='check-connection';
      button.disabled=state.status==='checking';button.textContent=state.status==='checking'?'확인 중…':'연결 상태 확인';
      button.onclick=()=>void connection.check();container.append(button);
    }
  }
  draw(connection.getState());
  return connection.subscribe(draw);
}
