/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tampilan sementara saat kode halaman sedang diunduh (code splitting).
 * Bentuknya mengikuti kerangka konten, bukan spinner kosong.
 */
export function PageLoader() {
  return (
    <div className="min-h-[60vh] p-6 sm:p-10" role="status" aria-label="Memuat halaman">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <div className="h-4 w-40 rounded-md shimmer" />
          <div className="h-12 w-full max-w-lg rounded-lg shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="mading-card overflow-hidden">
              <div className="h-40 border-b-2 border-ink shimmer" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-24 rounded-md shimmer" />
                <div className="h-4 w-2/3 rounded-md shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
