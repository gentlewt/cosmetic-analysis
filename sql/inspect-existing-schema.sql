-- Supabase SQL Editor에서 실행할 읽기 전용 메타데이터 조회.
-- 마이그레이션이 아닙니다. 한 개의 JSON 결과로 반환합니다.
-- 회원/제품/루틴 등의 실제 행, 파일, 인증 토큰, 함수 본문은 읽지 않습니다.
-- 결과의 이름·정책 식·트리거 인수·기본값은 공유 전 민감정보 여부를 검토하세요.
BEGIN TRANSACTION READ ONLY;
WITH app_schemas AS (
  SELECT oid, nspname FROM pg_namespace
  WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
    AND nspname NOT IN ('auth','storage','extensions','graphql','graphql_public','realtime',
      'supabase_functions','supabase_migrations','vault','pgsodium','pgsodium_masks','cron','net')
), relations AS (
  SELECT c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
         c.reloptions, c.relowner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind IN ('r','p','v','m','f') AND
    (n.oid IN (SELECT oid FROM app_schemas)
      OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
      OR (n.nspname='auth' AND c.relname='users'))
), role_list AS (
  SELECT oid, rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('anon','authenticated')
)
SELECT jsonb_build_object(
  'inspection_context', jsonb_build_object('inspected_at',now(),'database_role',current_user,
    'read_only',current_setting('transaction_read_only'),
    'note','Metadata only. SQL Editor privileges do not establish browser/RLS access.'),
  'application_schemas', (SELECT coalesce(jsonb_agg(nspname ORDER BY nspname),'[]'::jsonb) FROM app_schemas),
  'relations', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',nspname,'name',relname,'kind',relkind,'rls_enabled',relrowsecurity,
    'rls_forced',relforcerowsecurity,'owner',pg_get_userbyid(relowner),
    'options',reloptions) ORDER BY nspname,relname),'[]'::jsonb) FROM relations),
  'columns', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'position',a.attnum,'name',a.attname,
    'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull,
    'identity',a.attidentity,'generated',a.attgenerated,
    'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY r.nspname,r.relname,a.attnum),'[]'::jsonb)
    FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE r.nspname<>'auth' OR a.attname='id'),
  'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'name',c.conname,'type',c.contype,
    'definition',pg_get_constraintdef(c.oid,true),'validated',c.convalidated)
    ORDER BY r.nspname,r.relname,c.conname),'[]'::jsonb)
    FROM relations r JOIN pg_constraint c ON c.conrelid=r.oid WHERE r.nspname<>'auth'),
  'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'definition',pg_get_indexdef(i.indexrelid))
    ORDER BY r.nspname,r.relname,i.indexrelid),'[]'::jsonb)
    FROM relations r JOIN pg_index i ON i.indrelid=r.oid WHERE r.nspname<>'auth'),
  'enums', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'type',t.typname,
    'label',e.enumlabel,'sort_order',e.enumsortorder) ORDER BY n.nspname,t.typname,e.enumsortorder),'[]'::jsonb)
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
    WHERE n.oid IN (SELECT oid FROM app_schemas)),
  'policies', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.schemaname,p.tablename,p.policyname),'[]'::jsonb)
    FROM pg_policies p WHERE p.schemaname IN (SELECT nspname FROM app_schemas) OR p.schemaname='storage'),
  'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'name',t.tgname,'enabled',t.tgenabled,
    'definition',pg_get_triggerdef(t.oid,true),'function_schema',pn.nspname,'function',p.proname,
    'security_definer',p.prosecdef) ORDER BY r.nspname,r.relname,t.tgname),'[]'::jsonb)
    FROM relations r JOIN pg_trigger t ON t.tgrelid=r.oid AND NOT t.tgisinternal
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace),
  'table_privileges', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'role',roles.rolname,
    'schema_usage',has_schema_privilege(roles.oid,r.nspname,'USAGE'),
    'select',has_table_privilege(roles.oid,r.oid,'SELECT'),
    'insert',has_table_privilege(roles.oid,r.oid,'INSERT'),
    'update',has_table_privilege(roles.oid,r.oid,'UPDATE'),
    'delete',has_table_privilege(roles.oid,r.oid,'DELETE')) ORDER BY r.nspname,r.relname,roles.rolname),'[]'::jsonb)
    FROM relations r CROSS JOIN role_list roles),
  'column_privileges', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'column',a.attname,'role',roles.rolname,
    'select',has_column_privilege(roles.oid,r.oid,a.attnum,'SELECT'),
    'insert',has_column_privilege(roles.oid,r.oid,a.attnum,'INSERT'),
    'update',has_column_privilege(roles.oid,r.oid,a.attnum,'UPDATE'))
    ORDER BY r.nspname,r.relname,a.attnum,roles.rolname),'[]'::jsonb)
    FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
    CROSS JOIN role_list roles WHERE r.nspname<>'auth' OR a.attname='id'),
  'functions_metadata', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
    'result',pg_get_function_result(p.oid),'security_definer',p.prosecdef,
    'volatility',p.provolatile,'anon_execute',has_function_privilege((SELECT oid FROM role_list WHERE rolname='anon'),p.oid,'EXECUTE'),
    'authenticated_execute',has_function_privilege((SELECT oid FROM role_list WHERE rolname='authenticated'),p.oid,'EXECUTE'))
    ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.oid IN (SELECT oid FROM app_schemas) AND p.prokind IN ('f','p')),
  'api_schema_setting', current_setting('pgrst.db_schemas',true),
  'api_anon_role_setting', current_setting('pgrst.db_anon_role',true)
) AS schema_inspection;
COMMIT;

-- Storage 버킷 설정만 확인하는 선택적 조회 (마이그레이션 아님).
-- 먼저 위 결과에서 storage.buckets의 id/name/public 컬럼이 있는지 확인하세요.
-- 해당 컬럼이 없으면 실행하지 말고 컬럼 메타데이터만 공유하세요.
-- 파일 목록·경로·내용은 읽지 않습니다. 확인 후 아래 SELECT만 별도로 실행합니다.
-- SELECT id, name, public FROM storage.buckets ORDER BY id;
