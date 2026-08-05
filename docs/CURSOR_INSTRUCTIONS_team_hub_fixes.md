# Cursor instructions: Team Hub bug fixes (DMs, boards, chat input focus)

Three issues from testing, all root-caused by reading the actual code (not guessed).

---

## 1 & 3. Private messages don't send/receive, and board posts don't post

**Same root cause, most likely:** a migration was never run against the live database.
`supabase/migrations/20260805000000_team_hub_dms_and_boards.sql` does two things: creates
the `direct_messages` table from scratch, and adds a `board` + `due_date` column to the
pre-existing `team_posts` table. The API code for both features
(`src/app/api/team/dm/[peerId]/route.ts`, `src/app/api/team/posts/route.ts`) is correct —
it reads/writes exactly the columns this migration adds. If this migration was never
run in the Supabase SQL editor, every DM read/write fails because `direct_messages`
doesn't exist, and every board post fails because `team_posts.board` doesn't exist —
which matches both symptoms exactly.

This is the same class of issue as the earlier `tasks.assigned_by` bug — migrations in
this project aren't applied automatically, they require a manual step in the Supabase
SQL editor, and this project has already had at least one migration silently skipped.

**Verify first:**
```sql
select column_name from information_schema.columns
where table_name = 'team_posts' and column_name = 'board';

select to_regclass('public.direct_messages');
```
If the first query returns no rows, or the second returns `null`, this is confirmed.

**Fix — run the full migration:**
```sql
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
```
(This is the migration file's exact content — running it again is safe, every
statement is `if not exists` / idempotent.)

**After running:** confirm by sending a real DM between two accounts and posting once
to each of Bulletin / Deadlines / Highlights.

---

## 5. Chat input isn't focused — has to be clicked first

Confirmed in code: neither `GroupChat` (Team chat) nor `DirectChat` (private messages)
sets `autoFocus` on their message `<input>`, and switching between already-open DM tabs
doesn't remount `DirectChat` (same component instance, just new props), so even adding
`autoFocus` alone wouldn't refocus when switching from one open DM to another — only on
first mount.

**File:** `src/components/team/TeamHub.tsx`

In `GroupChat`, find the message input and add `autoFocus`:
```tsx
<input
  autoFocus
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="Message the team…"
  className="flex-1 min-h-[44px] rounded-xl px-3 text-sm outline-none glass-input"
  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
/>
```

Then force `DirectChat` to remount on every peer switch, by keying it on `peerId` where
it's rendered:
```tsx
<DirectChat
  key={activeDmTab.peerId}
  currentUserId={currentUserId}
  peerId={activeDmTab.peerId}
  peerName={activeDmTab.peerName}
  onClose={() => closeDm(activeDmTab.peerId)}
/>
```

**File:** `src/components/team/DirectChat.tsx`

Add `autoFocus` to its input the same way:
```tsx
<input
  autoFocus
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder={`Message ${peerName}…`}
  className="flex-1 min-h-[44px] rounded-xl px-3 text-sm outline-none glass-input"
  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
/>
```

With the `key` change above, switching to any DM tab (new or previously opened) now
mounts a fresh `DirectChat` instance each time, so `autoFocus` fires every switch, not
just the very first one.

---

## Test checklist

- [ ] `direct_messages` table exists, `team_posts.board` column exists (query above)
- [ ] Send a DM from Account A to Account B, confirm B receives it (and vice versa)
- [ ] Post once to Bulletin Board, Deadlines & Targets, and Highlights, confirm each
      appears immediately
- [ ] Open Team chat — cursor is already active in the input, no click needed
- [ ] Open a DM, type without clicking first — works
- [ ] Switch to a second, already-open DM tab, type without clicking — works
- [ ] Switch back to Team chat tab, type without clicking — works
