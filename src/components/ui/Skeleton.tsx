/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer bg-ink/5 rounded-lg', className)} />;
}

/** Placeholder berbentuk kartu poster, dipakai saat daftar event dimuat. */
export function EventCardSkeleton() {
  return (
    <div className="mading-card overflow-hidden">
      <Skeleton className="h-40 rounded-none border-b-2 border-ink" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Grid placeholder; tiap kartu masuk sedikit lebih lambat dari sebelumnya. */
export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
