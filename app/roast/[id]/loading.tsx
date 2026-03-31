import { LoadingSkeleton } from '@/components/ui';

export default function RoastLoading() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Score header */}
      <div className="flex items-center gap-6">
        <LoadingSkeleton variant="custom" height="h-28" width="w-28" className="rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton variant="custom" height="h-6" width="w-48" />
          <LoadingSkeleton variant="custom" height="h-4" width="w-full" />
          <LoadingSkeleton variant="custom" height="h-4" width="w-3/4" />
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
