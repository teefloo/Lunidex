import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-sm" />
        <Skeleton className="h-64 rounded-sm lg:col-span-2" />
      </div>
      <Skeleton className="h-80 rounded-sm" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-sm" />
        <Skeleton className="h-72 rounded-sm" />
      </div>
    </div>
  );
}
