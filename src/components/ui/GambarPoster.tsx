/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';

/**
 * Poster selalu ditampilkan utuh, tidak dipotong. Informasi penting seperti
 * tanggal, lokasi, dan narahubung sering tercetak di tepi poster, sehingga
 * object-cover yang memotongnya merugikan calon peserta. Ruang yang tersisa di
 * bingkai diisi salinan poster yang diburamkan supaya tidak tampak bolong.
 * Kedua gambar memakai alamat yang sama, jadi berkasnya hanya diunduh sekali.
 */
export function GambarPoster({
  src,
  alt = '',
  className,
  gambarClassName,
  loading,
  onMuat,
}: {
  src: string;
  alt?: string;
  className?: string;
  gambarClassName?: string;
  loading?: 'lazy' | 'eager';
  /** Dipanggil dengan ukuran asli gambar setelah selesai dimuat. */
  onMuat?: (lebar: number, tinggi: number) => void;
}) {
  return (
    <div className={cn('relative overflow-hidden bg-ink/5', className)}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
        referrerPolicy="no-referrer"
        loading={loading}
      />
      <img
        src={src}
        alt={alt}
        className={cn('relative h-full w-full object-contain', gambarClassName)}
        referrerPolicy="no-referrer"
        loading={loading}
        onLoad={e => onMuat?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      />
    </div>
  );
}
