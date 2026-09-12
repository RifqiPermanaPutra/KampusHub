/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, RSVP } from '../types';
import { getEventPhase } from './event-phase';

/**
 * Peserta berhak sertifikat jika sudah check-in dan event sudah selesai.
 * "Selesai" mengikuti definisi yang sama dengan label di UI (lihat getEventPhase),
 * jadi tombol unduh tidak muncul saat kartu event masih bertanda "Berlangsung".
 */
export function isEligibleForCertificate(rsvp: RSVP, event: Event, now: Date = new Date()): boolean {
  return rsvp.status === 'checked-in' && getEventPhase(event.date, now.getTime()) === 'past';
}

/** URL verifikasi publik untuk sebuah kode sertifikat (= ID RSVP). */
export function certificateVerifyUrl(origin: string, code: string): string {
  return `${origin}/verify/${encodeURIComponent(code)}`;
}
