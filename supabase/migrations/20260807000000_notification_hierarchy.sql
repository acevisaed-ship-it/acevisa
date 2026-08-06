-- notifications table has never had a tracked migration — this documents the
-- existing inferred schema (idempotent) and adds what's needed for hierarchy fan-out.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references counselors(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  client_id uuid references clients(id) on delete cascade,
  task_id uuid,
  meeting_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_counselor_id_created_at_idx
  on notifications(counselor_id, created_at desc);

alter table notifications enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_all'
  ) then
    create policy "notifications_all" on notifications for all using (true) with check (true);
  end if;
end $$;
