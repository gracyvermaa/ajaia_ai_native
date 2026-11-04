-- Read-only inspection for an INSERT rejected by the documents RLS policy.
-- Run in Supabase SQL Editor. These queries inspect the deployed database.
-- SQL Editor does not use the browser user's JWT, so auth.uid() here does not
-- establish what auth.uid() returned for the failed PostgREST request.

-- 1. Actual documents columns, types, nullability, and defaults.
select
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'documents'
order by ordinal_position;

-- 2. Constraints and their deployed definitions.
select
  constraint_name,
  constraint_type,
  pg_get_constraintdef(c.oid) as definition
from information_schema.table_constraints tc
join pg_constraint c
  on c.conname = tc.constraint_name
join pg_class t
  on t.oid = c.conrelid
join pg_namespace n
  on n.oid = t.relnamespace
where tc.table_schema = 'public'
  and tc.table_name = 'documents'
  and n.nspname = tc.table_schema
order by constraint_name;

-- 3. Every non-internal trigger on documents and its trigger function body.
select
  trigger.tgname as trigger_name,
  pg_get_triggerdef(trigger.oid, true) as trigger_definition,
  function_ns.nspname || '.' || function_proc.proname as function_name,
  pg_get_functiondef(function_proc.oid) as function_definition
from pg_trigger trigger
join pg_class table_class on table_class.oid = trigger.tgrelid
join pg_namespace table_ns on table_ns.oid = table_class.relnamespace
join pg_proc function_proc on function_proc.oid = trigger.tgfoid
join pg_namespace function_ns on function_ns.oid = function_proc.pronamespace
where table_ns.nspname = 'public'
  and table_class.relname = 'documents'
  and not trigger.tgisinternal
order by trigger.tgname;

-- 4. Deployed RLS state and policies.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'documents'
order by policyname;

-- 4a. Definition and execution settings of the auth.uid() function referenced
-- by the deployed policy. This is catalog metadata, not the browser JWT claim.
select
  routine.routine_schema,
  routine.routine_name,
  routine.data_type,
  routine.security_type,
  routine.external_language,
  pg_get_functiondef(proc.oid) as function_definition
from information_schema.routines routine
join pg_proc proc
  on proc.proname = routine.routine_name
join pg_namespace function_ns
  on function_ns.oid = proc.pronamespace
where routine.routine_schema = 'auth'
  and routine.routine_name = 'uid'
  and function_ns.nspname = routine.routine_schema;

-- 4b. Inspect the membership helper used by the SELECT policy. If it is
-- STABLE, its snapshot cannot see the row from the same INSERT ... RETURNING.
select
  proc.provolatile as volatility,
  proc.prosecdef as security_definer,
  pg_get_functiondef(proc.oid) as function_definition
from pg_proc proc
where proc.oid = to_regprocedure('private.is_document_member(uuid)');

select
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'documents';

-- 5. Effective grants on the table and relevant columns.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'documents'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, privilege_type;

select
  grantee,
  column_name,
  privilege_type,
  is_grantable
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'documents'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, column_name, privilege_type;
