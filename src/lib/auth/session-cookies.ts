/** Clear remember-me / session-only cookies on explicit sign-out. */
export function clearAceSessionCookies() {
  document.cookie = 'ace_remember=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'ace_session_token=; path=/; max-age=0; SameSite=Lax'
}
