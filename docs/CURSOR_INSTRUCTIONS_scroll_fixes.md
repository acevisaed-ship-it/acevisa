# Cursor instructions: missing scrollbars + auto-scroll-to-top every few seconds

Two separate, pre-existing bugs (not from the post-testing-fixes batch) found by
reading the actual code, not guessing:

## 1. Scrollbars hidden everywhere, site-wide

**File:** `src/app/globals.css`, lines 112–119:

```css
/* ── Hide all scrollbars globally (web + mobile) ──────────────────── */
* {
  scrollbar-width: none;       /* Firefox */
  -ms-overflow-style: none;    /* IE / Edge */
}
*::-webkit-scrollbar {
  display: none;               /* Chrome / Safari / mobile WebKit */
}
```

A bare `*` selector hides the scrollbar on every element in the app, not just the
landing page (where this was presumably intended, for the full-screen snap-scroll
sections). Admin/dashboard pages enforce a minimum width (`min-w-[1280px]` in
`AdminShell.tsx`, `min-w-[1024px]` in `DashboardShell.tsx`) and can run long
vertically — those pages are still scrollable, there's just zero visual
indication of it.

**Fix:** remove the blanket `*` rule and scope scrollbar-hiding only to where
it's actually intentional — the landing page's snap-scroll containers already
have their own scoped rule further down in the same file
(`.inverted-scroll [data-scroll-proxy]::-webkit-scrollbar`), so that one's fine
as-is. Replace lines 112–119 with:

```css
/* Scrollbars hidden only where explicitly opted into via .scrollbar-hidden —
   NOT globally. Admin/dashboard/chat pages keep visible scrollbars so users
   can tell when there's more content. */
.scrollbar-hidden {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
```

Then grep the codebase for any component that was relying on the global hide
(search for horizontally-scrolling strips, story carousels, etc. — e.g.
`GallerySection.tsx`'s story cards) and add the `scrollbar-hidden` class
explicitly there if a hidden scrollbar was actually wanted for that specific
element. Everywhere else — admin tables, dashboard panels, Team Hub, client
lists — should now show normal browser scrollbars.

**Verify:** on a browser window narrower than 1280px, `/admin/clients` (or any
admin page) shows a horizontal scrollbar at the bottom. Any admin/dashboard page
with enough content to overflow vertically shows a normal vertical scrollbar.
The landing page's full-screen sections still look and behave the same as
before (scrollbar-free, snap behavior unaffected).

---

## 2. Chat pages force-scroll every 3–5 seconds, even when idle

Three components poll for new messages and unconditionally replace the entire
messages array on every poll tick — including when nothing new actually
arrived — which re-triggers an unguarded auto-scroll effect on every tick:

- `src/components/chat/ChatLayout.tsx` (student portal chat) — polls every 5s
- `src/components/chat/CounselorChatLayout.tsx` (counselor's client chat) —
  polls every 3s
- `src/components/team/DirectChat.tsx` (Team Hub DMs) — polls every 3s

Each has this pattern: `setMessages((prev) => [...data.messages, ...pending])`
(or a plain `setMessages(data.messages ?? [])`) runs on every poll regardless of
whether the content changed, producing a new array reference every time, which
means `useEffect(() => { bottomRef.current?.scrollIntoView(...) }, [messages])`
fires every 3–5 seconds and yanks the scroll position even if you're mid-read
somewhere else on the page.

**`src/components/team/TeamHub.tsx` (group chat) already has the correct fix**
for this exact problem — port the same pattern to the other three:

```ts
// Already in TeamHub.tsx — the pattern to replicate:
function isNearBottom() {
  const el = scrollContainerRef.current
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

const prevCountRef = useRef(0)
useEffect(() => {
  const count = messages.length
  if (count === 0) return
  if (prevCountRef.current === 0) {
    scrollToBottom('instant')
  } else if (count > prevCountRef.current && isNearBottom()) {
    scrollToBottom('smooth')
  }
  prevCountRef.current = count
}, [messages])
```

For each of the three affected files:

1. Add a `scrollContainerRef` on the actual scrollable message-list container
   (the `<div>` with `overflow-y-auto` that wraps the message bubbles) if it
   doesn't already have one — needed for the `isNearBottom()` check.
2. Replace the unguarded `useEffect(() => { bottomRef.current?.scrollIntoView(...) }, [messages])`
   with the `prevCountRef` + `isNearBottom()` guarded version above.
3. Leave the polling intervals and the `setMessages` merge logic themselves
   alone — the bug isn't the polling frequency, it's that every poll result
   (changed or not) was forcing a scroll. The guard fixes that without needing
   to touch the polling logic.

**Verify:** open a client chat (or student portal chat, or a Team Hub DM) with
enough message history to scroll up. Scroll up to read older messages and leave
the page idle — it should stay put, not snap back down every few seconds. Then
send a message from the other side (or have someone else send one) — it should
still auto-scroll to the new message when you're already near the bottom, same
as before. If you deliberately scroll up while a new message arrives, it should
NOT yank you back down (matches how `TeamHub.tsx` group chat already behaves).
