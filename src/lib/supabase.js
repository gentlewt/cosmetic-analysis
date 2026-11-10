import { createClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabase-config.js';

const descriptions = {
  demo: 'Supabase 미설정 · 브라우저 체험 모드입니다.',
  incomplete: 'Supabase URL 또는 공개 키가 빠져 있습니다. 브라우저 체험 모드를 유지합니다.',
  invalid: 'Supabase 설정이 올바르지 않습니다. HTTPS 프로젝트 URL과 공개용 publishable 또는 anon 키만 사용하세요.',
  configured: 'Supabase 환경변수가 준비되었습니다. 실제 연결은 아직 확인하지 않았습니다.',
  checking: 'Supabase API 응답을 확인하고 있습니다. 데이터는 브라우저에만 저장됩니다.',
  reachable: 'Supabase Data API 응답을 확인했습니다. 테이블·RLS·회원 데이터 연결은 아직 검증하지 않았습니다.',
};
export function createSupabaseConnection(env, { factory = createClient, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const config = readSupabaseConfig(env);
  let client, running, activeController;
  let state = { status: config.status, message: descriptions[config.status] };
  const listeners = new Set();
  const emit = next => { state = next; for (const listener of listeners) listener(state); };
  function getClient() {
    if (config.status !== 'configured') return null;
    client ||= factory(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false },
      global: { fetch: (url, init) => fetchImpl(url, { ...init, signal: activeController?.signal || init?.signal }) },
    });
    return client;
  }
  function check() {
    if (config.status !== 'configured') return Promise.resolve(state);
    if (running) return running;
    emit({ status:'checking', message:descriptions.checking });
    running = (async () => {
      const controller = new AbortController();
      let timer;
      try {
        // Only the PostgREST root metadata endpoint. No table, RPC, auth mutation,
        // Storage operation, or localStorage access occurs in this module.
        activeController = controller;
        const response = await Promise.race([
          getClient().getOpenApiSpec(),
          new Promise((_,reject) => { timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},timeoutMs); }),
        ]);
        if (response.error) fail(httpMessage(response.status), response.status);
        else if (!response.data || response.data.swagger !== '2.0' || typeof response.data.paths !== 'object' || response.data.paths === null) {
          fail('예상한 Data API 형식이 아닙니다. 프로젝트 URL과 API 공개 설정을 확인하세요.');
        } else emit({ status:'reachable', message:descriptions.reachable });
      } catch {
        fail(controller.signal.aborted ? '연결 확인 시간이 초과되었습니다. 네트워크를 확인하고 다시 시도하세요.' : '연결을 확인하지 못했습니다. 네트워크 및 프로젝트 설정을 확인하세요.');
      } finally { clearTimeout(timer); activeController = null; }
      return state;
    })().finally(()=>{running=null;});
    return running;
  }
  function fail(message, status) { emit({ status:'error', message, ...(status ? { httpStatus:status } : {}) }); }
  return {
    getState: () => ({ ...state }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    check,
  };
}
function httpMessage(status) {
  if (status===401) return '공개 키 인증에 실패했습니다 (401). 프로젝트 URL과 공개 키의 조합을 확인하세요.';
  if (status===403) return 'API 접근이 거부되었습니다 (403). 네트워크 정책과 프로젝트 API 설정을 확인하세요.';
  if (status===404) return 'Data API 경로를 찾지 못했습니다 (404). 프로젝트 URL과 API 활성화 상태를 확인하세요.';
  if (status===429) return '요청 한도를 초과했습니다 (429). 잠시 후 다시 시도하세요.';
  return 'Data API 응답을 확인하지 못했습니다. 프로젝트 API 설정과 네트워크를 확인하세요.';
}
