-- TypeWords official cloud sync (TW-004)
-- Run in the official Supabase project SQL editor.
-- Enable Email/Password in Authentication > Providers.

create table if not exists public.typewords_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  data jsonb not null,
  data_version int,
  updated_at timestamptz,
  primary key (user_id, type)
);

alter table public.typewords_data enable row level security;

drop policy if exists "typewords_data_select_own" on public.typewords_data;
create policy "typewords_data_select_own"
  on public.typewords_data for select
  using (auth.uid() = user_id);

drop policy if exists "typewords_data_insert_own" on public.typewords_data;
create policy "typewords_data_insert_own"
  on public.typewords_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "typewords_data_update_own" on public.typewords_data;
create policy "typewords_data_update_own"
  on public.typewords_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "typewords_data_delete_own" on public.typewords_data;
create policy "typewords_data_delete_own"
  on public.typewords_data for delete
  using (auth.uid() = user_id);
