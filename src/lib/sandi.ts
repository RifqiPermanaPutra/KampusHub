/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Sama dengan batas bawaan Supabase Auth. Diperiksa di sini supaya pengguna
 * tahu sebelum formulir dikirim, bukan setelah ditolak server.
 */
export const MIN_PANJANG_SANDI = 6;

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
