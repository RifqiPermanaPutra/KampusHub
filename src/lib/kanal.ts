/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let urutan = 0;

/**
 * Nama kanal Realtime yang unik untuk setiap langganan.
 *
 * supabase-js memakai ulang kanal yang namanya sama. Lonceng di Header dan
 * halaman Notifikasi sama-sama berlangganan notifikasi pengguna yang sama, jadi
 * dengan nama tetap keduanya berbagi satu kanal. Langganan kedua lalu menambah
 * pendengar ke kanal yang sudah aktif, supabase-js melempar galat, dan seluruh
 * halaman kosong. Meninggalkan salah satunya juga ikut mematikan kanal milik
 * yang lain. Dengan nama unik, setiap komponen memegang kanalnya sendiri.
 */
export function namaKanal(topik: string): string {
  urutan += 1;
  return `${topik}-${urutan}`;
}
