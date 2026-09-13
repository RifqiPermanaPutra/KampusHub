/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Batas alasan penolakan event. MIN harus sama dengan angka di fungsi
 * putuskan_event (supabase/migrations/06_fitur_lanjutan.sql), dan MAX sama
 * dengan check constraint kolom alasan_penolakan. Diperiksa di sini lebih
 * dulu supaya admin langsung tahu, bukan setelah ditolak server.
 */
export const MIN_ALASAN_PENOLAKAN = 10;
export const MAX_ALASAN_PENOLAKAN = 500;

/** Pesan galat untuk alasan penolakan, atau null kalau sudah layak dikirim. */
export function validasiAlasanPenolakan(alasan: string): string | null {
  const panjang = alasan.trim().length;
  if (panjang < MIN_ALASAN_PENOLAKAN) {
    return `Tuliskan alasan minimal ${MIN_ALASAN_PENOLAKAN} karakter supaya penyelenggara tahu apa yang harus diperbaiki.`;
  }
  if (panjang > MAX_ALASAN_PENOLAKAN) {
    return `Alasan terlalu panjang, maksimal ${MAX_ALASAN_PENOLAKAN} karakter.`;
  }
  return null;
}
