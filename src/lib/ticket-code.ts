/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Dua jenis kode:
 *
 * 1. Kode tiket (sejak 14_tiket_dan_check_in.sql): 8 karakter acak yang
 *    dibuat database, dicetak di e-tiket sebagai KH-7F3K-9Q2M. Isi QR sama
 *    dengan bentuk cetaknya, dan panitia bisa mengetiknya kalau kamera gagal.
 *
 * 2. Kode lama `{eventId}_{userId}`: dulu dipakai sebagai isi QR. Sekarang
 *    tinggal dipakai untuk mengenali kode verifikasi sertifikat lama dan
 *    sebagai `id` pendaftaran di aplikasi. Kode ini tidak lagi diterima untuk
 *    check-in, karena siapa pun yang tahu kedua id bisa membuatnya sendiri.
 */

/** Huruf kode tiket: tanpa 0, 1, I, L, dan O supaya tidak tertukar saat diketik. */
export const ABJAD_KODE_TIKET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const POLA_KODE_TIKET = /^[2-9A-HJKMNP-Z]{8}$/;

/** "7F3K9Q2M" menjadi "KH-7F3K-9Q2M", bentuk yang dicetak di e-tiket dan di QR. */
export function formatKodeTiket(kode: string): string {
  return `KH-${kode.slice(0, 4)}-${kode.slice(4)}`;
}

/**
 * Kode dari QR atau ketikan panitia ("kh 7f3k-9q2m", "7F3K9Q2M") menjadi
 * "7F3K9Q2M", atau null kalau bukan kode tiket. Aturannya sama dengan
 * fungsi normalisasi_kode_tiket di database.
 */
export function normalisasiKodeTiket(masukan: string): string | null {
  // Urutannya sama dengan SQL: buang karakter lain dulu, baru huruf besar.
  // Kalau dibalik, "ß" menjadi "SS" di JavaScript tetapi hilang di database.
  const v = masukan.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (v.length === 10 && v.startsWith('KH') && POLA_KODE_TIKET.test(v.slice(2))) return v.slice(2);
  return POLA_KODE_TIKET.test(v) ? v : null;
}

/** Susun kode lama untuk sepasang event dan peserta. */
export function ticketCode(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}

/** Uraikan kode lama. Mengembalikan null kalau bentuknya tidak sesuai. */
export function parseTicketCode(code: string): { eventId: string; userId: string } | null {
  const idx = code.indexOf('_');
  if (idx <= 0 || idx === code.length - 1) return null;
  return { eventId: code.slice(0, idx), userId: code.slice(idx + 1) };
}
