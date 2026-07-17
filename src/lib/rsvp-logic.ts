/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RSVPStatus } from '../types';

/**
 * Menentukan status RSVP baru berdasarkan kapasitas dan jumlah peserta terdaftar.
 * Pure function agar mudah diuji — dipanggil di dalam transaksi Firestore.
 */
export function decideRsvpStatus(
  capacity: number | undefined,
  registeredCount: number
): Extract<RSVPStatus, 'registered' | 'waitlist'> {
  if (capacity !== undefined && capacity > 0 && registeredCount >= capacity) {
    return 'waitlist';
  }
  return 'registered';
}

/** ID dokumen top-level rsvps yang deterministik: satu user satu RSVP per event. */
export function rsvpDocId(eventId: string, userId: string): string {
  return `${eventId}_${userId}`;
}

/** Parse kode sertifikat/tiket format `{eventId}_{userId}`. */
export function parseRsvpDocId(code: string): { eventId: string; userId: string } | null {
  const idx = code.indexOf('_');
  if (idx <= 0 || idx === code.length - 1) return null;
  return { eventId: code.slice(0, idx), userId: code.slice(idx + 1) };
}
