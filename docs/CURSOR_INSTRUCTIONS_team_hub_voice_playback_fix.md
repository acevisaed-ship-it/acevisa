# Cursor instructions: Team Hub voice notes revert to text after a few seconds

## Root cause

Both GET routes that load/refresh Team Hub messages select an explicit column
list that was written before the voice-message migration added the attachment
columns, and never got updated:

- `src/app/api/team/messages/route.ts` — `GET` handler,
  `.select('id, sender_id, sender_name, sender_initials, content, created_at')`
- `src/app/api/team/dm/[peerId]/route.ts` — `GET` handler,
  `.select('id, sender_id, sender_name, recipient_id, content, created_at')`

Neither includes `attachment_url`, `attachment_name`, `attachment_type`. The
voice-note POST routes (`/api/team/messages/voice`, `/api/team/dm/[peerId]/voice`)
insert those fields correctly and return them in their immediate response, so a
freshly-sent voice note briefly renders as a real audio player — but
`TeamHub.tsx` polls `/api/team/messages` every 1 second and `DirectChat.tsx`
polls `/api/team/dm/[peerId]` every 3 seconds, and both replace the whole
messages array with whatever that GET route returns. Since the GET route is
missing the attachment columns, the very next poll (or a fresh page load, or
switching away and back) overwrites the message with `attachment_url: undefined`,
and the frontend's `msg.attachment_type === 'audio' && msg.attachment_url` check
falls through to rendering plain text — either the transcript or the literal
`"[Voice note]"` fallback string.

## Fix — add the three columns to both SELECT clauses

**File:** `src/app/api/team/messages/route.ts`, `GET` handler:

```ts
.select('id, sender_id, sender_name, sender_initials, content, created_at, attachment_url, attachment_name, attachment_type')
```

**File:** `src/app/api/team/dm/[peerId]/route.ts`, `GET` handler:

```ts
.select('id, sender_id, sender_name, recipient_id, content, created_at, attachment_url, attachment_name, attachment_type')
```

That's the entire fix — two one-line changes. No migration needed (the columns
already exist from the earlier voice-messages migration), no frontend changes
needed (the rendering logic was already correct, it just never received the data
after the first poll).

## Verify

- Send a voice note in Team Hub group chat. Confirm the audio player is still
  there (not reverted to text) after waiting a few seconds past the 1s poll
  interval.
- Send a voice note in a Team Hub DM. Confirm it's still an audio player after
  waiting past the 3s poll interval.
- Refresh the page entirely (not just wait) — confirm previously-sent voice
  notes still show as audio players on fresh load, not as plain text.
- Switch away from a DM tab and back — confirm the voice note still plays.
