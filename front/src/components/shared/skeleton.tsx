import React from 'react';
import { cn, Skeleton } from '@nicorp/nui';

export { Skeleton };

interface SkeletonProps {
  className?: string;
}

// Card Skeleton - for project/task cards
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-3', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Column Skeleton - for Kanban columns
export function ColumnSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('min-w-80 rounded-xl border border-border bg-card/50 p-4 space-y-3', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4, className }: SkeletonProps & { columns?: number }) {
  return (
    <div className={cn('flex items-center gap-4 p-3 border-b border-border', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn(
          'h-4',
          i === 0 ? 'w-1/3' : i === columns - 1 ? 'w-20' : 'w-1/4'
        )} />
      ))}
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('border-b border-border px-6 py-5 space-y-3', className)}>
      <Skeleton className="h-3 w-48" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Org Card Skeleton
export function OrgCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-4', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
