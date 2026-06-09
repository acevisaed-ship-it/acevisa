import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const PROMPT_CACHE_BETA = 'prompt-caching-2024-07-31'
