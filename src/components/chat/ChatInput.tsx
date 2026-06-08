'use client'

import { type FormEvent } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSend?: (message: string) => void
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend?.(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 flex items-center gap-2 border-t border-text/10 bg-bg px-4 py-3 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        className="min-h-[48px] min-w-0 flex-1 rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green text-text transition-opacity disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  )
}
