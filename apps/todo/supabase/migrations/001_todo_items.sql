-- To-do app: one table of tasks, each owned by the signed-in user.
-- Run this once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.todo_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 500),
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);

create index if not exists todo_items_user_id_idx on public.todo_items (user_id, created_at desc);

-- Row-level security: every row is visible and editable only by its owner.
alter table public.todo_items enable row level security;

drop policy if exists "todo_items_select_own" on public.todo_items;
create policy "todo_items_select_own" on public.todo_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "todo_items_insert_own" on public.todo_items;
create policy "todo_items_insert_own" on public.todo_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "todo_items_update_own" on public.todo_items;
create policy "todo_items_update_own" on public.todo_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "todo_items_delete_own" on public.todo_items;
create policy "todo_items_delete_own" on public.todo_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-in users only; anonymous visitors get nothing.
revoke all on public.todo_items from anon;
grant select, insert, update, delete on public.todo_items to authenticated;
