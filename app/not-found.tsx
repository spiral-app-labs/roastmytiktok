import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.1),transparent_70%)]" />
      </div>

      <div className="relative space-y-6">
        <p className="text-8xl font-black bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
          404
        </p>
        <h1 className="text-2xl font-bold text-white">
          This page isn&apos;t here
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
          The link is broken, expired, or pointed at a route that doesn&apos;t exist. Head back home or jump into the dashboard.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-semibold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 px-6 py-3 text-sm rounded-xl"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 transition-all px-6 py-3 text-sm rounded-xl"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
