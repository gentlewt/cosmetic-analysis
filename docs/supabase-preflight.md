# 기존 Supabase 연결 사전 점검

## 현재 확인한 사실

- 코드와 `docs/design-review-v1.md`를 대조했다. 현재 서비스 데이터는 `src/data.js`의 가상 제품 및 브라우저의 `cosmetic-guest-v1`, `skin-diary`이다.
- 이 환경에는 `.env.example`만 있고 Supabase URL/공개 키/DB 접속 변수 및 연결된 Supabase 조회 도구가 없다. 환경 상태에도 관련 secret/runtime variable 바인딩이 없다. 값은 출력하거나 복사하지 않았다.
- **실제 테이블, 컬럼, 타입, 제약조건, RLS, 트리거, 버킷은 모두 미확인이다.** 기존 프로젝트가 있다는 사용자의 설명을 실제 스키마 조회 결과로 취급하지 않았다.
- 이번 코드에는 테이블명을 사용한 Supabase 데이터 조회/쓰기, RPC, 마이그레이션, Storage 변경, 로그인 및 계정 이전 호출이 없다. 기존 SQL을 재실행하지 않았다.

## 연결에 필요한 데이터 목록 (실제 컬럼 매핑 아님)

아래 표의 테이블명은 **설계서에 나온 이름**이다. 존재 여부와 소속 스키마를 아직 확인하지 않았다. 한글 항목은 필요한 논리 데이터이며 SQL 컬럼명을 추측하여 선언한 것이 아니다. 실제 결과를 받은 후에 각 항목의 스키마·테이블·컬럼·타입·null/default·권한·관계를 채워야 한다.

| 화면/기능 | 설계상 대상 | 현재 코드 필드 | 확인할 논리 데이터와 관계 |
| --- | --- | --- | --- |
| 회원 식별 | Supabase Auth, user_profiles | 없음 | Auth 사용자 ID, 프로필 ID와의 관계, 계정 상태, 가입/최근접속/삭제 시각. 비밀번호는 조회하지 않음 |
| 제품 목록·검색·비교 | products, product_versions | id, name, brand, type, price, versionId, status | 제품 ID/명/브랜드/분류/용량/설명, 실제 버전 ID/제품 연결/이전 버전, 전성분 원문/출처/확인 여부/승인 시각/국내 버전, 사용자 노출 승인 상태. 현재 가상 가격은 설계서에 저장 항목이 없으므로 자동 매핑하지 않음 |
| 제품 이미지 | product_images | image | 제품/제품 버전 참조, 경로, 종류, 대표 여부, 출처, 등록일. 공개 승인 정책 및 bucket 매핑 |
| 전성분 순서·사전 | product_ingredients, ingredients, ingredient_aliases | ingredients 배열(현재 일부 예시명), ingredients.name | 제품 버전·성분 ID FK, 표기 원문, 순서, 연결 확인 여부; 표준 한글/영문/INCI/화학 분류/기본 설명; 별칭·언어·종류 |
| 성분 설명·근거 | ingredient_functions, ingredient_cautions, ingredient_interactions, research_sources, ingredient_research | 미연결 | 기능·태그·색상, 주의 유형·조건·근거, 양쪽 성분 FK, 출처 확인/승인, 연구 조건·농도·제형·결과·제한사항 |
| 루틴 확정 | routine_versions | versions[].id/version/confirmedAt/previousVersionId | 루틴 버전 ID, 회원 ID FK, 버전 번호, 확정 시각, 이전 버전 ID. 동시 확정 제약과 원자적 저장 수단 |
| 아침·저녁 편집 | routine_items | items.morning/evening[].productId/productVersionId/frequency, 배열 위치 | 루틴 버전 FK, 제품 및 실제 제품 버전 FK, 시간대 저장값, 순서 시작값·유일성, 사용 빈도 저장값·제약. 기존 한국어 빈도를 임의 enum 값으로 변환하지 않음 |
| 관심제품·메모 | favorite_products | favorites[].productId/memo/createdAt | 회원 FK, 제품 FK, 등록 시각, 개인 메모, 회원+제품 중복 제약. 루틴과의 독립성 |
| 피부 기록 | skin_change_records | date/condition/concern/memo | 기록 ID, 회원 FK, 기록일, 좋아짐/비슷함/나빠짐에 대응하는 실제 저장값, 관련 고민(타입·관계), 메모, 등록일 |
| 피부 사진 | skin_change_photos | 없음 | 기록 FK, 파일 경로·업로드 시각, 소유자/Storage 정책. 자동 노출 금지, 실파일 삭제 처리 |
| 피부 프로필·설문 | skin_profiles, skin_profile_versions, skin_survey_responses | 없음 | 회원 FK, 피부 타입·민감성·수분·고민/우선순위·현재 버전·원본 응답·평가기준 버전·시각 |
| 향후 분석 | routine_analyses, routine_analysis_details, analysis_rule_versions | 없음 | 루틴/피부 프로필/기준 버전 FK 및 당시 스냅샷, 설명·조건·근거·개선 제안. 실제 승인 데이터와 기준 전에는 분석을 표시하지 않음 |

리뷰·문의·알림·관리자·운영 영역은 이번 UI 연결 대상이 아니다. 조회 SQL은 다른 사용자 정의 스키마와 객체도 목록화하므로 실제 프로젝트에서 설계상 이름과 다른 대상도 확인할 수 있다. 객체 목록이 없다고 바로 객체를 새로 만들지 않는다.

## SQL Editor에서 확인할 방법

1. [읽기 전용 점검 SQL](../sql/inspect-existing-schema.sql)의 `BEGIN TRANSACTION READ ONLY`부터 `COMMIT`까지 실행한다. **SQL은 작성 및 구문 검사만 했으며 실제 Supabase에서는 실행하지 않았다.**
2. `schema_inspection` JSON 결과를 확인/내보낸다. 결과에는 앱 스키마와 Storage 테이블 메타데이터, 컬럼/기본값/타입, 제약/FK/인덱스, enum, RLS/정책, 트리거, 함수 시그니처/실행 권한, anon/authenticated 테이블/컬럼 권한이 들어 있다. 함수 본문과 업무 데이터는 읽지 않는다. Auth는 사용자 행이나 비밀번호 없이 ID 연결 및 트리거 메타데이터만 확인한다.
3. 정책 식·기본값·트리거 인수에 혹시 민감한 상수가 들어 있는지 확인 후 결과를 공유한다. 키·비밀번호·접속 문자열·회원 데이터는 보내지 않는다. SQL Editor가 마지막 명령만 표시하면 동일한 읽기 전용 트랜잭션 안에서 SELECT 결과를 선택하여 내보내거나, WITH~SELECT 부분을 단독 실행할 수 있다(여전히 SELECT만 수행).
4. `storage.buckets`와 `id/name/public` 컬럼의 실제 존재를 확인한 경우에만 파일 끝의 주석 처리된 버킷 설정 SELECT를 별도로 실행한다. 그 컬럼이 없으면 추측해서 수정하지 말고 메타데이터를 먼저 확인한다. 파일 목록/경로/내용은 조회하지 않는다.
5. PostgREST의 `pgrst.db_schemas`/익명 역할 설정이 null이어도 API 비활성/무권한이라는 뜻은 아니다. Dashboard의 API 노출 스키마도 확인해야 한다. SQL Editor는 권한이 높으므로 그 결과만으로 일반 회원의 RLS가 작동한다고 판단할 수 없다.

SQL은 `pg_catalog`·`information_schema` 내부 및 알려진 플랫폼 내부 스키마의 전체 내용을 제외한다. 그 밖의 사용자 정의 스키마를 포함하고, `storage.objects`, `storage.buckets`, `auth.users` 관련 메타데이터를 별도로 포함한다. 접근 오류나 누락이 있으면 그 오류/누락부터 확인하며 우회하거나 DDL을 추가하지 않는다.

## 연결 코드가 하는 일

- `.env.local`에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정하고 개발 서버를 재시작한다. VITE 변수는 빌드 시 브라우저에 공개되므로 HTTPS 프로젝트 URL과 공개용 `sb_publishable_…` 또는 기존 **anon** JWT만 허용한다. `.env.example`에는 실제 값을 넣지 않는다.
- `src/lib/supabase-config.js`: 미설정/부분 설정/잘못된 URL/허용되지 않은 키를 구분한다. URL에 자격증명·경로·쿼리를 허용하지 않는다. JWT 역할 검사는 형식 검사이며 실제 서명 검증은 서버의 역할이다.
- `vite.config.js`: 잘못되거나 비공개인 키 설정을 번들 생성 전에 거부한다. 오류 메시지에 값이 없다. 임의의 모든 비밀을 탐지하는 도구는 아니므로 비밀은 처음부터 VITE 변수에 넣지 않는다.
- `src/lib/supabase.js`: `@supabase/supabase-js` SDK를 상태 확인 버튼 클릭 시 초기화한다. 자동 세션 저장/갱신/URL 세션 탐지를 끄고, `getOpenApiSpec()`의 **GET `/rest/v1/`** 메타데이터 요청만 수행한다. 공개 키를 사용하며 회원 권한을 우회하지 않는다. 응답 문서를 업무 스키마로 자동 채택하거나 로컬/원격에 저장하지 않는다.
- `src/lib/connection-panel.js`: 미설정/부분 설정/준비/확인 중/응답 확인/오류 및 재시도 버튼을 표시한다. 상태 변경은 이 패널만 갱신하여 편집 중 루틴·메모·피부 기록 입력을 유지한다. 서버의 원본 오류 본문, 키, URL은 UI에 표시하지 않는다.
- 연결 성공 표시는 **Data API 메타데이터 응답 확인**에 한정한다. 실제 테이블, 데이터 접근, RLS, 트리거 실행, Auth, Storage 정상 동작을 뜻하지 않는다. 일부 프로젝트는 OpenAPI를 비활성화하므로 실패 시 DB 장애로 단정하지 않는다.
- SDK 오류·401/403/404/429·시간 초과 등을 처리한다. 8초 한도, 단일 진행 요청, 자동 재시도 없음; 사용자가 다시 확인할 수 있다.

## 데이터 보존과 다음 연결 단계

기존 저장 키/형식, 루틴 초안·확정 버전, 관심제품 메모, 피부 기록은 이 단계에서 이동·병합·변환·삭제하지 않는다. 기존 비회원 루틴/관심제품의 30일 미사용 만료 정책은 변경하지 않았다. Supabase 설정/응답 확인으로 데이터 소스를 전환하거나 브라우저 데이터를 서버에 업로드하지 않는다. 가상 `*-demo-v1` ID를 실제 DB ID로 쓰지 않는다.

실제 SQL 조회 결과 → 명시적 컬럼/enum/FK 매핑 → 공개 제품 조회 권한 확인 → 본인/타인 데이터 권한 테스트 → 루틴 원자적 확정 수단과 트리거 검증 → 사용자 동의를 받는 이전 순으로 후속 작업이 필요하다. 기존 RLS/트리거가 원하는 동작을 제공하는지 먼저 확인하고, 기존 마이그레이션 재실행이나 테이블 재생성으로 맞추지 않는다. 테스트 계정과 데이터 변경이 필요한 검증은 이번 단계에서 실행하지 않았다.

## 이번 단계의 검증 범위

- Node 테스트: 환경 설정·비공개 키 빌드 차단·SDK의 메타데이터 GET·오류/시간 초과/중복 클릭/재시도 및 기존 루틴 로직.
- 브라우저 테스트: 기존 PC/모바일 화면과 루틴 편집 회귀, **모의** API 성공/401/재시도, 자동 호출 없음, 기존 세 가지 로컬 데이터와 작성 중 입력 보존.
- 프로덕션 빌드 및 SQL 구문 검사. **실제 Supabase SQL 실행·실제 연결·RLS 권한 검증은 미실행.**

Cloudflare 배포, 환경 공개 범위 변경, 테이블/정책/트리거/버킷 변경은 하지 않았다.
