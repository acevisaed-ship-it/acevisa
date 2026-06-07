'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <h2 className="mb-4 text-2xl font-bold text-blue">Something went wrong</h2>
      <p className="mb-8 text-text/60">We hit an unexpected error. Please try again.</p>
      <button
        onClick={reset}
        className="rounded-full bg-green px-6 py-3 font-bold text-text"
      >
        Try again
      </button>
    </div>
  )
}
