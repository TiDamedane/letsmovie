create table if not exists public.activities (
  id text primary key,
  title text not null,
  note text,
  location text not null,
  date text not null,
  hour text,
  minute text,
  status text not null check (status in ('collecting', 'picking', 'selected')),
  selected_movie_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_participants (
  activity_id text not null references public.activities(id) on delete cascade,
  participant_id text not null,
  nickname text not null,
  avatar_url text,
  role text not null check (role in ('host', 'member')),
  created_at timestamptz not null default now(),
  primary key (activity_id, participant_id)
);

create table if not exists public.activity_movies (
  activity_id text not null references public.activities(id) on delete cascade,
  movie_id text not null,
  title text not null,
  director text,
  recommender text not null,
  src text not null,
  tmdb_id integer,
  created_at timestamptz not null default now(),
  primary key (activity_id, movie_id)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references public.activities(id) on delete cascade,
  participant_id text not null,
  participant_name text not null,
  participant_avatar text,
  emoji text not null,
  content text,
  created_at timestamptz not null default now(),
  unique (activity_id, participant_id)
);

create unique index if not exists memories_activity_participant_unique
  on public.memories (activity_id, participant_id);

alter table public.activities
  add column if not exists archived_at timestamptz;

alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_movies enable row level security;
alter table public.memories enable row level security;

drop policy if exists "public activities read" on public.activities;
drop policy if exists "public activities write" on public.activities;
drop policy if exists "public activities update" on public.activities;
drop policy if exists "public participants read" on public.activity_participants;
drop policy if exists "public participants write" on public.activity_participants;
drop policy if exists "public participants update" on public.activity_participants;
drop policy if exists "public movies read" on public.activity_movies;
drop policy if exists "public movies write" on public.activity_movies;
drop policy if exists "public movies update" on public.activity_movies;
drop policy if exists "public movies delete" on public.activity_movies;
drop policy if exists "public memories read" on public.memories;
drop policy if exists "public memories write" on public.memories;
drop policy if exists "public memories update" on public.memories;

create policy "public activities read"
  on public.activities for select
  using (true);

create policy "public activities write"
  on public.activities for insert
  with check (true);

create policy "public activities update"
  on public.activities for update
  using (true)
  with check (true);

create policy "public participants read"
  on public.activity_participants for select
  using (true);

create policy "public participants write"
  on public.activity_participants for insert
  with check (true);

create policy "public participants update"
  on public.activity_participants for update
  using (true)
  with check (true);

create policy "public movies read"
  on public.activity_movies for select
  using (true);

create policy "public movies write"
  on public.activity_movies for insert
  with check (true);

create policy "public movies update"
  on public.activity_movies for update
  using (true)
  with check (true);

create policy "public movies delete"
  on public.activity_movies for delete
  using (true);

create policy "public memories read"
  on public.memories for select
  using (true);

create policy "public memories write"
  on public.memories for insert
  with check (true);

create policy "public memories update"
  on public.memories for update
  using (true)
  with check (true);
