-- Run in Supabase Dashboard -> SQL Editor.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 500),
  type text not null default 'personal' check (type in ('personal', 'work')),
  priority integer not null default 3 check (priority between 1 and 5),
  time numeric(5,1) not null default 1 check (time >= 0 and mod(time * 2, 1) = 0),
  due_date date null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_completed_idx on public.tasks(user_id, completed);
create index if not exists tasks_user_due_date_idx on public.tasks(user_id, due_date);

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks" on public.tasks for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks" on public.tasks for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks" on public.tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks" on public.tasks for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.tasks to authenticated;

-- If this says the table is already a member, that is fine.
alter publication supabase_realtime add table public.tasks;
