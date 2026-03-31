import { LoadingSkeleton } from '@/components/ui';

export default function AnalyzeLoading() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <LoadingSkeleton variant="custom" height="h-6" width="w-64" />
        <LoadingSkeleton variant="custom" height="h-4" width="w-96" />
      </div>

      {/* Video + analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton variant="custom" height="h-64" className="rounded-2xl" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    </div>
  );
}
