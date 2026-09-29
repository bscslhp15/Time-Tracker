create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  start_date date not null,
  target_hours numeric(10, 2) check (target_hours is null or target_hours > 0),
  target_end_date date,
  required_hours_per_day numeric(5, 2) not null default 8 check (required_hours_per_day >= 0),
  default_break_minutes integer not null default 0 check (default_break_minutes >= 0),
  deduct_break boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sessions_one_target check (target_hours is null or target_end_date is null),
  constraint sessions_id_user_unique unique (id, user_id)
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  time_in time not null,
  time_out time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  note text,
  created_at timestamptz not null default now(),
  constraint logs_owned_session_fk foreign key (session_id, user_id)
    references public.sessions (id, user_id) on delete cascade
);

create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);
create index if not exists logs_session_date_idx
  on public.logs (session_id, log_date desc);
create index if not exists logs_user_id_idx
  on public.logs (user_id);

alter table public.sessions enable row level security;
alter table public.logs enable row level security;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.sessions, public.logs to authenticated;

drop policy if exists "Users can read their own sessions" on public.sessions;
drop policy if exists "Users can create their own sessions" on public.sessions;
drop policy if exists "Users can update their own sessions" on public.sessions;
drop policy if exists "Users can delete their own sessions" on public.sessions;
drop policy if exists "Users can read their own logs" on public.logs;
drop policy if exists "Users can create their own logs" on public.logs;
drop policy if exists "Users can update their own logs" on public.logs;
drop policy if exists "Users can delete their own logs" on public.logs;

create policy "Users can read their own sessions"
  on public.sessions for select
  using (user_id = (select auth.uid()));
create policy "Users can create their own sessions"
  on public.sessions for insert
  with check (user_id = (select auth.uid()));
create policy "Users can update their own sessions"
  on public.sessions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (user_id = (select auth.uid()));

create policy "Users can read their own logs"
  on public.logs for select
  using (user_id = (select auth.uid()));
create policy "Users can create their own logs"
  on public.logs for insert
  with check (user_id = (select auth.uid()));
create policy "Users can update their own logs"
  on public.logs for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own logs"
  on public.logs for delete
  using (user_id = (select auth.uid()));