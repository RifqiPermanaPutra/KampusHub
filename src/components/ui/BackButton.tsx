/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft } from 'lucide-react';

/** Tombol kembali persegi bergaya stiker, dipakai di header halaman panitia. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Kembali"
      className="grid place-items-center w-11 h-11 shrink-0 rounded-lg border-2 border-ink bg-white text-ink shadow-sticker active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
