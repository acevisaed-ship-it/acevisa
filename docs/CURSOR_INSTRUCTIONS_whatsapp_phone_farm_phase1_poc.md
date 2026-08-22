# WhatsApp phone farm — Phase 1: single-phone proof of concept

This is a hands-on hardware test, not a code task — nothing here goes into
the portal yet. The goal is to prove the core mechanism actually works well
enough to build on, before investing in the full multi-phone, portal-embedded
version. This needs to be run by Hashaam (or whoever's available) with one
real phone and one PC — not something Cursor can do without physical access
to a device.

## What this phase needs to prove

1. A real Android phone can be screen-mirrored and controlled from a browser
   tab, reliably, over a real session (not just a quick demo).
2. Typing actually works through it — specifically Roman Urdu / English
   mixed text and Urdu script, since that's the real day-to-day usage this
   needs to support, not just English.
3. Voice notes can be recorded through it (holding the mic button is a
   press-and-hold gesture, not a simple tap — worth confirming this relays
   correctly).
4. It survives a real multi-hour session without the connection dying, and
   recovers cleanly if the browser tab is closed and reopened.
5. Whether USB tethering or same-WiFi ADB-over-TCP works better for how the
   office is actually set up (USB is simpler to start with; WiFi is what the
   real multi-phone version will need, since phones can't all stay
   USB-tethered to one machine in the final setup — worth testing both).

## What's needed before starting

- One Android phone with WhatsApp installed and logged in (a spare/test
  phone is fine for this phase — doesn't need to be a real counselor's
  number yet).
- One PC (Windows is fine) that can stay on during the test.
- A USB cable to connect the phone to that PC.
- About 30–60 minutes for setup plus however long feels right for a real
  test conversation.

## Setup outline

1. On the phone: enable Developer Options (Settings → About Phone → tap
   "Build Number" 7 times), then enable "USB debugging" inside Developer
   Options.
2. On the PC: install Android platform-tools (gives you `adb`), then clone
   and run `web-scrcpy` (github.com/baixin1228/web-scrcpy) — it comes with
   its own setup instructions in the repo.
3. Connect the phone via USB, accept the "Allow USB debugging?" prompt on
   the phone screen.
4. Open the browser to the local address web-scrcpy gives you (typically
   `http://localhost:5000`) — the phone's screen should appear, controllable
   with mouse clicks and keyboard.
5. Open WhatsApp through that remote view and actually use it for a while —
   send messages, type in Roman Urdu, try a voice note, leave it running.

## What to report back after testing

- Did typing feel normal, or laggy/broken for non-English text?
- Did the video feel smooth enough to comfortably read messages as they
  arrive, or noticeably delayed?
- Did anything disconnect or need restarting during the test?
- USB vs WiFi — which felt more reliable for your setup?

## Explicitly not in this phase

Portal integration, multiple phones at once, the Accessibility Service
read-only logging layer, and call audio/video relay are all deliberately
deferred — none of that is worth building until this core mechanism is
proven out on one phone. Once this works, the next doc scopes turning it
into a real portal feature.

## Status

Not started. When ready to actually run this, say so and it can be walked
through step by step live, since exact commands depend on your specific PC
setup (Windows version, where platform-tools gets installed, etc.) — the
outline above is the shape of it, not a copy-paste script.
