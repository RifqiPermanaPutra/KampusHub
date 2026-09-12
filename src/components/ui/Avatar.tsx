/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';

/**
 * Inisial dari sebuah nama: huruf depan nama pertama dan nama terakhir.
 * Nama satu kata memakai dua huruf pertamanya.
 *
 * Fungsi murni supaya bisa diuji tanpa merender apa pun.
 */
export function inisialNama(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '?';
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  nama: string;
  /** Kelas ukuran dan tipografi, misalnya "w-10 h-10 text-sm". */
  className?: string;
  /**
   * Diisi kalau namanya tidak tertulis di dekat avatar. Kalau nama sudah
   * muncul di sebelahnya, biarkan kosong supaya pembaca layar tidak
   * membacanya dua kali.
   */
  alt?: string;
}

/**
 * Avatar inisial yang digambar di perangkat pengguna.
 *
 * Sebelumnya keempat tempat pemakaian avatar memanggil api.dicebear.com
 * dengan nama pengguna di dalam URL. Artinya setiap kali halaman dibuka,
 * nama mahasiswa terkirim ke layanan pihak ketiga, dan di halaman daftar
 * pengguna admin yang terkirim adalah nama seluruh mahasiswa terdaftar.
 * Hasilnya hanya dua huruf di atas lingkaran berwarna, jadi harganya sama
 * sekali tidak sepadan. Sekarang digambar sendiri, tanpa permintaan jaringan.
 */
export function Avatar({ nama, className, alt }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-2 border-ink bg-stiker font-editorial font-extrabold text-ink shrink-0 select-none',
        className
      )}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {inisialNama(nama)}
    </div>
  );
}
