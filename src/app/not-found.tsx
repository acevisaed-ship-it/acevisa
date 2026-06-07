import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <h2 className="mb-4 text-6xl font-bold text-blue">404</h2>
      <p className="mb-8 text-text/60">Page not found.</p>
      <Link
        href="/"
        className="rounded-full bg-green px-6 py-3 font-bold text-text"
      >
        Go home →
      </Link>
    </div>
  )
}
