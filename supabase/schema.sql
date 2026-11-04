create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create unique index if not exists user_profiles_email_lower_idx
  on public.user_profiles (lower(email))
  where email is not null;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_updated_idx
  on public.documents (owner_id, updated_at desc);

create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  shared_with_user_id uuid not null references auth.users (id) on delete cascade,
  permission text not null default 'editor' check (permission in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  constraint document_shares_unique_recipient unique (document_id, shared_with_user_id)
);

create index if not exists document_shares_user_document_idx
  on public.document_shares (shared_with_user_id, document_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists auth_user_profile_sync on auth.users;
create trigger auth_user_profile_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_user_profile();

insert into public.user_profiles (id, email)
select id, lower(email) from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function private.is_document_member(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.owner_id = auth.uid()
  ) or exists (
    select 1 from public.document_shares s
    where s.document_id = p_document_id and s.shared_with_user_id = auth.uid()
  );
$$;

create or replace function private.can_edit_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.owner_id = auth.uid()
  ) or exists (
    select 1 from public.document_shares s
    where s.document_id = p_document_id
      and s.shared_with_user_id = auth.uid()
      and s.permission = 'editor'
  );
$$;

create or replace function private.is_document_owner(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.owner_id = auth.uid()
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.documents force row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Members can read documents" on public.documents;
-- INSERT ... RETURNING also applies SELECT policies. The direct owner check
-- covers the new row before the STABLE membership helper can see it.
create policy "Members can read documents"
  on public.documents for select to authenticated
  using (owner_id = auth.uid() or private.is_document_member(id));

drop policy if exists "Users can create their own documents" on public.documents;
create policy "Users can create their own documents"
  on public.documents for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners and editors can update documents" on public.documents;
create policy "Owners and editors can update documents"
  on public.documents for update to authenticated
  using (private.can_edit_document(id))
  with check (private.can_edit_document(id));

drop policy if exists "Owners can delete documents" on public.documents;
create policy "Owners can delete documents"
  on public.documents for delete to authenticated
  using (private.is_document_owner(id));

drop policy if exists "Owners and recipients can read shares" on public.document_shares;
create policy "Owners and recipients can read shares"
  on public.document_shares for select to authenticated
  using (private.is_document_owner(document_id) or shared_with_user_id = auth.uid());

drop policy if exists "Owners can revoke shares" on public.document_shares;
create policy "Owners can revoke shares"
  on public.document_shares for delete to authenticated
  using (private.is_document_owner(document_id));

create or replace function public.share_document_with_email(
  p_document_id uuid,
  p_email text,
  p_permission text default 'editor'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  recipient_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before sharing a document.';
  end if;
  if not private.is_document_owner(p_document_id) then
    raise exception 'Only the document owner can manage access.';
  end if;
  if p_permission is null or p_permission not in ('editor', 'viewer') then
    raise exception 'Choose editor or viewer access.';
  end if;
  select p.id into recipient_id
    from public.user_profiles p
    where lower(p.email) = lower(btrim(p_email));
  if recipient_id is null then
    raise exception 'No registered Ajaia Docs user was found with that email.';
  end if;
  if recipient_id = auth.uid() then
    raise exception 'You already own this document.';
  end if;
  insert into public.document_shares (document_id, shared_with_user_id, permission)
  values (p_document_id, recipient_id, p_permission)
  on conflict (document_id, shared_with_user_id)
  do update set permission = excluded.permission;
end;
$$;

create or replace function public.get_document_people(p_document_id uuid)
returns table(user_id uuid, email text, permission text, is_owner boolean)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not private.is_document_member(p_document_id) then
    raise exception 'You do not have access to this document.';
  end if;
  return query
    select d.owner_id, coalesce(p.email, 'Document owner'), 'owner'::text, true
    from public.documents d
    left join public.user_profiles p on p.id = d.owner_id
    where d.id = p_document_id
    union all
    select s.shared_with_user_id, coalesce(p.email, 'Collaborator'), s.permission, false
    from public.document_shares s
    left join public.user_profiles p on p.id = s.shared_with_user_id
    where s.document_id = p_document_id
    order by 4 desc, 2;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.sync_user_profile() from public, anon, authenticated;
revoke all on function private.is_document_member(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_document(uuid) from public, anon, authenticated;
revoke all on function private.is_document_owner(uuid) from public, anon, authenticated;
revoke all on function public.share_document_with_email(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_document_people(uuid) from public, anon, authenticated;

-- Keep policy helpers out of the PostgREST-exposed public schema. Do not add
-- the private schema to Supabase's exposed schemas.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_document_member(uuid) to authenticated;
grant execute on function private.can_edit_document(uuid) to authenticated;
grant execute on function private.is_document_owner(uuid) to authenticated;
grant execute on function public.share_document_with_email(uuid, text, text) to authenticated;
grant execute on function public.get_document_people(uuid) to authenticated;

-- Remove execute access from helper functions created by an earlier version
-- of this script, if it was already applied before the helpers moved to private.
do $$
begin
  if to_regprocedure('public.is_document_member(uuid)') is not null then
    execute 'revoke all on function public.is_document_member(uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.can_edit_document(uuid)') is not null then
    execute 'revoke all on function public.can_edit_document(uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.is_document_owner(uuid)') is not null then
    execute 'revoke all on function public.is_document_owner(uuid) from public, anon, authenticated';
  end if;
end;
$$;

-- Supabase projects can have broad default table grants. Remove them explicitly
-- before granting the narrow set of operations this client needs.
revoke all privileges on table public.user_profiles, public.documents, public.document_shares
  from public, anon, authenticated;

grant select on public.user_profiles to authenticated;
grant select, delete on public.documents to authenticated;
grant insert (title, content_json, owner_id) on public.documents to authenticated;
grant update (title, content_json) on public.documents to authenticated;
grant select, delete on public.document_shares to authenticated;
