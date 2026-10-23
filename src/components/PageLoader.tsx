/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventGridSkeleton } from './ui/Skeleton';

/**
 * Tampilan sementara saat kode halaman sedang diunduh (code splitting).
 * Bentuknya mengikuti kerangka konten, bukan spinner kosong.
 */
export function PageLoader() {
  return (
    <div className="min-h-[60dvh] px-4 py-6 sm:p-10" role="status" aria-label="Memuat halaman">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <div className="h-4 w-40 rounded-md shimmer" />
          <div className="h-10 w-full max-w-lg rounded-lg shimmer sm:h-12" />
        </div>
        <EventGridSkeleton count={3} />
      </div>
    </div>
  );
}
