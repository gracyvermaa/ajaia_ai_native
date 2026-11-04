alter table public.documents enable row level security;
alter table public.documents force row level security;

drop policy if exists "Members can read documents" on public.documents;

create policy "Members can read documents"
  on public.documents for select to authenticated
  using (owner_id = auth.uid() or private.is_document_member(id));
