-- Requires a live Supabase database with at least four auth.users records and
-- the application schema applied. Run in SQL Editor as a role that can SET
-- ROLE to authenticated. All test rows are rolled back.
begin;

create temporary table documents_rls_test_state (
  owner_id uuid not null,
  viewer_id uuid not null,
  editor_id uuid not null,
  nonmember_id uuid not null,
  document_id uuid
);
grant select, update (document_id) on documents_rls_test_state to authenticated;

with first_users as (
  select id, created_at from auth.users order by created_at, id limit 4
),
user_ids as (
  select array_agg(id order by created_at, id) as ids from first_users
)
insert into documents_rls_test_state (owner_id, viewer_id, editor_id, nonmember_id)
select ids[1], ids[2], ids[3], ids[4]
from user_ids
where cardinality(ids) = 4;

do $$
declare
  rls_enabled boolean;
  force_rls boolean;
  test_user_count integer;
begin
  select count(*) into test_user_count
    from documents_rls_test_state
    where owner_id is not null
      and viewer_id is not null
      and editor_id is not null
      and nonmember_id is not null;
  if test_user_count <> 1 then
    raise exception 'documents_rls.sql requires at least four auth.users records';
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, force_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'documents';
  if rls_enabled is distinct from true then
    raise exception 'RLS must be enabled on public.documents';
  end if;
  if force_rls is distinct from true then
    raise exception 'public.documents must have FORCE ROW LEVEL SECURITY enabled';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  (select owner_id::text from documents_rls_test_state),
  true
);
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', owner_id, 'role', 'authenticated')::text
   from documents_rls_test_state),
  true
);

with created as (
  insert into public.documents (title, owner_id)
  select 'RLS transaction test', owner_id
  from documents_rls_test_state
  returning id
)
update documents_rls_test_state
set document_id = (select id from created);

do $$
begin
  if not exists (
    select 1 from documents_rls_test_state where document_id is not null
  ) then
    raise exception 'Owner INSERT ... RETURNING did not save its returned document id';
  end if;
end;
$$;

do $$
declare
  test_state record;
  error_message text;
begin
  select * into test_state from documents_rls_test_state where document_id is not null;

  begin
    insert into public.documents (title, owner_id)
      values ('RLS wrong owner test', test_state.viewer_id);
    raise exception using errcode = 'P0001', message = 'wrong-owner insert unexpectedly succeeded';
  exception
    when sqlstate '42501' then
      get stacked diagnostics error_message = message_text;
      if error_message not like '%row-level security policy%' then
        raise exception 'Wrong-owner insert failed for an unexpected reason: %', error_message;
      end if;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  (select nonmember_id::text from documents_rls_test_state limit 1),
  true
);
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', nonmember_id, 'role', 'authenticated')::text
   from documents_rls_test_state limit 1),
  true
);

do $$
declare
  test_state record;
  visible_count integer;
begin
  select * into test_state from documents_rls_test_state where document_id is not null;
  select count(*) into visible_count
    from public.documents
    where id = test_state.document_id;
  if visible_count <> 0 then
    raise exception 'A non-member can select the document';
  end if;
end;
$$;

reset role;
insert into public.document_shares (document_id, shared_with_user_id, permission)
select document_id, viewer_id, 'viewer'
from documents_rls_test_state
where document_id is not null
union all
select document_id, editor_id, 'editor'
from documents_rls_test_state
where document_id is not null;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select viewer_id::text from documents_rls_test_state limit 1),
  true
);
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', viewer_id, 'role', 'authenticated')::text
   from documents_rls_test_state limit 1),
  true
);

do $$
declare
  test_state record;
  affected_rows integer;
begin
  select * into test_state from documents_rls_test_state where document_id is not null;
  update public.documents
    set title = 'Viewer edit must be blocked'
    where id = test_state.document_id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'A viewer unexpectedly updated the document';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  (select editor_id::text from documents_rls_test_state limit 1),
  true
);
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', editor_id, 'role', 'authenticated')::text
   from documents_rls_test_state limit 1),
  true
);

do $$
declare
  test_state record;
  affected_rows integer;
begin
  select * into test_state from documents_rls_test_state where document_id is not null;
  update public.documents
    set title = 'Editor update succeeded'
    where id = test_state.document_id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'An editor could not update the document';
  end if;
end;
$$;

rollback;
