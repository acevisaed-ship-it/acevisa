-- Private 1:1 messages between staff members
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references counselors(id),
  sender_name text not null,
  recipient_id uuid not null references counselors(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_pair_idx
  on direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists direct_messages_recipient_unread_idx
  on direct_messages (recipient_id) where read_at is null;

alter table direct_messages enable row level security;
create policy "direct_messages_all" on direct_messages for all using (true) with check (true);

-- Extend team_posts to support multiple boards + an optional deadline date
alter table team_posts add column if not exists board text not null default 'bulletin';
alter table team_posts add column if not exists due_date date;
create index if not exists team_posts_board_idx on team_posts(board, created_at desc);
