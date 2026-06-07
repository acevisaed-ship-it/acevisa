export function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="AI is typing">
      <div className="flex items-center gap-1 rounded-2xl border border-text/10 bg-bg px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 animate-bounce rounded-full bg-orange"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
