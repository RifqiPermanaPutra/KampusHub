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
  if (berkas.size > MAX_POSTER_BYTES) {
    return 'Ukuran berkas poster maksimal 2 MB. Simpan sebagai JPG atau WebP supaya lebih kecil.';
  }
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

/*
 * Semua poster memakai ukuran baku lanskap 16:9, minimal 1920 × 1080 px.
 * Dengan satu bentuk, kartu event, slider Beranda, dan detail event bisa
 * memakai bingkai 16:9 yang pas persis, jadi poster tidak pernah terpotong
 * dan tidak menyisakan ruang kosong. Ekspor yang lebih besar, misalnya 4K,
 * tetap diterima karena bentuknya sama.
 */
export const LEBAR_POSTER = 1920;
export const TINGGI_POSTER = 1080;

/** Selisih rasio yang masih diterima, untuk ekspor yang meleset beberapa piksel. */
const TOLERANSI_RASIO = 0.02;

export const SARAN_UKURAN_POSTER =
  'Wajib lanskap 16:9 dengan ukuran 1920 × 1080 px (boleh lebih besar, misalnya 3840 × 2160). ' +
  'Format JPG, PNG, atau WebP, maksimal 2 MB.';

/** Pesan galat untuk ukuran gambar, atau null kalau layak dipakai sebagai poster. */
export function validasiDimensiPoster(lebar: number, tinggi: number): string | null {
  if (!lebar || !tinggi) {
    return 'Ukuran gambar tidak terbaca. Coba simpan ulang gambarnya sebagai JPG atau PNG.';
  }
  if (Math.abs(lebar / tinggi - LEBAR_POSTER / TINGGI_POSTER) > TOLERANSI_RASIO) {
    return `Poster harus lanskap 16:9 (${LEBAR_POSTER} × ${TINGGI_POSTER} px). Gambar ini berukuran ${lebar} × ${tinggi} px.`;
  }
  if (lebar < LEBAR_POSTER) {
    return `Poster terlalu kecil (${lebar} × ${tinggi} px). Ukuran minimal ${LEBAR_POSTER} × ${TINGGI_POSTER} px supaya tetap tajam di layar lebar.`;
  }
  return null;
}
