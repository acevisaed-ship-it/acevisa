# Branded HTML email templates — logo + portal color language

## Goal

Replace the current plain `wrap()` function in `src/lib/email.ts` with a proper branded header/footer (logo, brand colors, portal-matching visual language) and apply it to all 4 existing email templates. No behavior change — same function signatures, same call sites, just a better-looking shared shell.

## Why it's built this way (email HTML constraints)

Email clients — especially Outlook desktop — don't reliably support CSS gradients, `backdrop-filter`/blur (the portal's glassmorphism look), flexbox, or grid. The portal's `.glass-card` look can't be replicated exactly in email. This design keeps the same color palette and logo, in a simplified table-based layout that renders consistently across Gmail, Outlook, and mobile mail apps — solid brand colors instead of gradients, no blur, generous padding instead of glass panels.

Logo is referenced as an absolute URL (`https://aceyourvisa.com/logo.png`, served from `public/logo.png` since Next.js serves `/public` at the domain root) — email clients can't load relative or local paths.

## Replace in `src/lib/email.ts`

Replace the existing `wrap()` function with:

```ts
const LOGO_URL = 'https://aceyourvisa.com/logo.png'
const PORTAL_URL = 'https://aceyourvisa.com'

function wrap(body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#E6E8E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E6E8E7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(10,63,58,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#0A3F3A;padding:28px 24px;">
              <img src="${LOGO_URL}" alt="ACE Altius Consulting" width="120" style="display:block;border:0;max-width:120px;height:auto;background-color:#ffffff;border-radius:10px;padding:8px 12px;" />
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background-color:#E48328;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;color:#0A3F3A;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F4F5F4;padding:20px 28px;text-align:center;border-top:1px solid #E6E8E7;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0A3F3A;">ACE Altius Consulting</p>
              <p style="margin:0 0 8px;font-size:11px;color:#0A3F3A99;letter-spacing:0.3px;">From Dreams to Destinations</p>
              <p style="margin:0;font-size:11px;">
                <a href="${PORTAL_URL}" style="color:#2083B9;text-decoration:none;">aceyourvisa.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
```

## Update the 4 existing template functions

No structural changes needed to `complaintEmailHtml`, `escalationEmailHtml`, `studentWelcomeEmailHtml`, `meetingBookedEmailHtml` — they already call `wrap(...)` with their body content, so they automatically pick up the new header/footer. Just verify each one's inline button/table styling still reads well against the new white body background (it should — the existing accent colors like `#E48328`, `#0A3F3A`, `#2083B9`, `#B7C733` were already chosen to work on light backgrounds).

One small polish worth doing while in this file: standardize the CTA buttons across all 4 templates to the same shape/padding (currently `studentWelcomeEmailHtml` and `meetingBookedEmailHtml` use slightly different button styles) — e.g.:

```ts
function ctaButton(url: string, label: string, bg = '#0A3F3A', color = '#B7C733') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td style="background-color:${bg};border-radius:24px;">
    <a href="${url}" style="display:inline-block;padding:12px 28px;color:${color};text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>
  </td></tr></table>`
}
```

and swap each template's raw `<a>` button markup for `ctaButton(...)` calls, for consistency.

## Verification

- Send a test of each of the 4 email types (complaint, escalation, student welcome, meeting booked) to a real inbox — check rendering in Gmail web, Gmail mobile app, and Outlook if possible (Outlook desktop is the most likely to break table/padding assumptions).
- Confirm the logo actually loads (requires the site to be live and `/logo.png` publicly accessible — it already is).
- Confirm links (portal URL, dashboard buttons) point to the correct production URLs.
