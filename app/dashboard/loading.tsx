import { LoadingSkeleton } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="custom" height="h-24" className="rounded-2xl" />
        ))}
      </div>

      {/* Upload area */}
      <LoadingSkeleton variant="custom" height="h-48" className="rounded-2xl" />

      {/* Recent history */}
      <div className="space-y-3">
        <LoadingSkeleton variant="custom" height="h-5" width="w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    </div>
  );
}
