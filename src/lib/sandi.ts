/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Lebih ketat dari bawaan Supabase Auth (6). Atur juga "Minimum password
 * length" di dasbor Supabase ke 8, supaya aturan yang sama berlaku walaupun
 * formulir ini dilewati. Diperiksa di sini supaya pengguna tahu sebelum
 * formulir dikirim, bukan setelah ditolak server.
 */
export const MIN_PANJANG_SANDI = 8;

/**
 * Jeda sebelum tautan atur ulang boleh diminta lagi. Supabase juga membatasi
 * di server; jeda ini supaya pengguna tahu harus menunggu, bukan dibalas galat.
 */
export const JEDA_KIRIM_ULANG_DETIK = 60;

/** Sisa detik sampai waktu `sampai` (milidetik), tidak pernah negatif. */
export function detikTersisa(sampai: number, sekarang: number = Date.now()): number {
  return Math.max(0, Math.ceil((sampai - sekarang) / 1000));
}

/** Pesan galat untuk kata sandi baru, atau null kalau boleh disimpan. */
export function validasiSandiBaru(sandi: string, ulangi: string): string | null {
  if (sandi.length < MIN_PANJANG_SANDI) {
    return `Kata sandi minimal ${MIN_PANJANG_SANDI} karakter.`;
  }
  if (sandi !== ulangi) {
    return 'Kedua kata sandi tidak sama. Ketik ulang dengan teliti.';
  }
  return null;
}
