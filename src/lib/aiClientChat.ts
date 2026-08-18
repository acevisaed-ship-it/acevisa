/**
 * Ace Assistant replies to clients. Off until explicitly re-enabled.
 * Set AI_CLIENT_CHAT_ENABLED=true to restore automated replies.
 */
export function isAiClientChatEnabled(): boolean {
  return process.env.AI_CLIENT_CHAT_ENABLED === 'true'
}
