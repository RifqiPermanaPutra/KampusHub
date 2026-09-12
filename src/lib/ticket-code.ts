/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Kode tiket adalah `{eventId}_{userId}`. Bentuk ini dicetak sebagai QR di
 * e-tiket dan dipakai lagi sebagai kode verifikasi sertifikat.
 *
 * Asalnya adalah ID dokumen Firestore, tapi sesudah pindah ke Postgres
 * bentuknya sengaja dipertahankan supaya tiket dan sertifikat yang sudah
 * beredar tetap terbaca. uuid tidak mengandung underscore, jadi pemisahannya
 * tetap tidak ambigu.
 */

/** Susun kode tiket untuk sepasang event dan peserta. */
export function ticketCode(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}

/** Uraikan kode tiket. Mengembalikan null kalau bentuknya tidak sesuai. */
export function parseTicketCode(code: string): { eventId: string; userId: string } | null {
  const idx = code.indexOf('_');
  if (idx <= 0 || idx === code.length - 1) return null;
  return { eventId: code.slice(0, idx), userId: code.slice(idx + 1) };
}
