import { LoadingSkeleton } from '@/components/ui';

export default function ScriptsLoading() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
      <LoadingSkeleton variant="custom" height="h-6" width="w-48" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
