import { LoadingSkeleton } from '@/components/ui';

export default function HistoryLoading() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
      <LoadingSkeleton variant="custom" height="h-6" width="w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
