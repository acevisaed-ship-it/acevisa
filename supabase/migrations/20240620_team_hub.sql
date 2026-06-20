-- Team Hub: group chat + bulletin board

create table if not exists team_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  sender_name text not null,
  sender_initials text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_messages_created_at_idx on team_messages(created_at desc);

alter table team_messages enable row level security;
create policy "team_messages_all" on team_messages for all using (true) with check (true);

create table if not exists team_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists team_posts_created_at_idx on team_posts(created_at desc);

alter table team_posts enable row level security;
create policy "team_posts_all" on team_posts for all using (true) with check (true);

create table if not exists team_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references team_posts(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_post_replies_post_id_idx on team_post_replies(post_id);

alter table team_post_replies enable row level security;
create policy "team_post_replies_all" on team_post_replies for all using (true) with check (true);
