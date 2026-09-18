/**
 * Shared "return context" helper for pages that link into a client/student
 * profile from more than one place (Pipeline, All Clients, a counselor's
 * client roster, etc). Rather than every profile page hardcoding a single
 * "back to X" destination, the linking page stamps a `returnTo`/`returnLabel`
 * query pair onto the link, and the profile page reads it back to render an
 * accurate "back to wherever you came from" link — falling back to a
 * sensible default when the params aren't present (e.g. a bookmarked URL).
 */

/** Appends returnTo/returnLabel query params to a relative href. */
export function withReturnParams(href: string, returnTo: string, returnLabel: string): string {
  const params = new URLSearchParams({ returnTo, returnLabel })
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}${params.toString()}`
}

export type ReturnSearchParams = {
  returnTo?: string | string[]
  returnLabel?: string | string[]
}

/**
 * Resolves the back-link href/label from a page's searchParams, falling
 * back to the given defaults when returnTo/returnLabel aren't present (or
 * look unsafe — only same-app relative paths are honored).
 */
export function resolveBackLink(
  searchParams: ReturnSearchParams | undefined,
  fallbackHref: string,
  fallbackLabel: string
): { href: string; label: string } {
  const returnTo = Array.isArray(searchParams?.returnTo) ? searchParams?.returnTo[0] : searchParams?.returnTo
  const returnLabel = Array.isArray(searchParams?.returnLabel)
    ? searchParams?.returnLabel[0]
    : searchParams?.returnLabel

  if (returnTo && returnLabel && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return { href: returnTo, label: returnLabel }
  }
  return { href: fallbackHref, label: fallbackLabel }
}
