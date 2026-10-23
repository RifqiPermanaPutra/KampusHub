/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';
import { GRID_KARTU_EVENT } from '../../lib/tata-letak';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer bg-ink/5 rounded-lg', className)} />;
}

/** Placeholder berbentuk kartu event: baris ringkas di ponsel, poster di layar lebar. */
export function EventCardSkeleton() {
  return (
    <div className="mading-card flex overflow-hidden sm:block">
      <Skeleton className="w-24 shrink-0 rounded-none border-r-2 border-ink sm:h-40 sm:w-auto sm:border-r-0 sm:border-b-2" />
      <div className="flex-1 space-y-3 p-3 sm:p-4">
        <Skeleton className="h-3 w-16 sm:hidden" />
        <Skeleton className="h-4 w-4/5 sm:w-24" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2 sm:hidden" />
      </div>
    </div>
  );
}

/** Grid placeholder; tiap kartu masuk sedikit lebih lambat dari sebelumnya. */
export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID_KARTU_EVENT}>
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
