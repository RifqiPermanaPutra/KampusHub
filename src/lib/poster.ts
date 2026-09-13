/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Aturan unggah poster. Harus sama dengan pengaturan bucket "posters" di
 * supabase/migrations/06_fitur_lanjutan.sql (file_size_limit dan
 * allowed_mime_types), supaya penolakan terjadi di sini dengan pesan yang
 * jelas, bukan di server dengan galat yang kabur.
 */
export const MAX_POSTER_BYTES = 2 * 1024 * 1024;

/*
 * SVG sengaja tidak termasuk: berkas SVG bisa memuat skrip, dan poster
 * ditampilkan ke semua pengguna yang membuka event.
 */
const EKSTENSI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const TIPE_POSTER = Object.keys(EKSTENSI);

/** Pesan galat untuk berkas poster, atau null kalau boleh diunggah. */
export function validasiPoster(berkas: { size: number; type: string }): string | null {
  if (!EKSTENSI[berkas.type]) return 'Format poster harus JPG, PNG, atau WebP.';
  if (berkas.size === 0) return 'Berkas poster kosong.';
  if (berkas.size > MAX_POSTER_BYTES) return 'Ukuran poster maksimal 2 MB.';
  return null;
}

/**
 * Lokasi penyimpanan poster: `{userId}/{acak}.{ekstensi}`.
 *
 * Folder pertama wajib uid pengunggah, karena policy storage hanya
 * mengizinkan unggahan ke folder milik sendiri. Nama acak mencegah poster
 * baru menimpa poster lain. Ekstensinya diambil dari tipe berkas, bukan dari
 * nama berkas, karena nama berkas bisa saja tidak sesuai isinya.
 */
export function jalurPoster(userId: string, tipe: string, acak: string): string {
  const ekstensi = EKSTENSI[tipe];
  if (!ekstensi) throw new Error('Format poster tidak didukung.');
  return `${userId}/${acak}.${ekstensi}`;
}
