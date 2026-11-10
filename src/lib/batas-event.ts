/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Batas isian event. Harus sama dengan check constraint tabel events:
 * events_title_check (01_schema.sql) dan events_description_check
 * (18_deskripsi_5000.sql).
 */
export const BATAS_JUDUL = 100;
export const BATAS_DESKRIPSI = 5000;

/**
 * Jumlah karakter dihitung seperti char_length di Postgres. String.length
 * menghitung emoji sebagai dua, jadi teks yang di browser tampak pas bisa
 * tetap ditolak database, atau sebaliknya.
 */
export function jumlahKarakter(teks: string): number {
  return [...teks].length;
}

/** Pesan galat kalau deskripsi melewati batas, atau null kalau masih muat. */
export function galatDeskripsi(deskripsi: string): string | null {
  const lebih = jumlahKarakter(deskripsi) - BATAS_DESKRIPSI;
  if (lebih <= 0) return null;
  return `Deskripsi terlalu panjang: maksimal ${BATAS_DESKRIPSI.toLocaleString('id-ID')} karakter. Kurangi ${lebih.toLocaleString('id-ID')} karakter lagi.`;
}
