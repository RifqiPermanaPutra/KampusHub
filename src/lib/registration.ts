/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';
import { getEventPhase } from './event-phase';

export type RegistrationState = 'open' | 'closed-deadline' | 'closed-finished';

/**
 * Status pendaftaran sebuah event:
 * - closed-finished : event sudah selesai
 * - closed-deadline : batas waktu pendaftaran sudah lewat
 * - open            : masih menerima pendaftar (termasuk saat event berlangsung)
 */
export function getRegistrationState(event: Event, now: number = Date.now()): RegistrationState {
  if (getEventPhase(event.date, now) === 'past') return 'closed-finished';
  if (event.rsvpDeadline) {
    const deadline = new Date(event.rsvpDeadline).getTime();
    if (!Number.isNaN(deadline) && now > deadline) return 'closed-deadline';
  }
  return 'open';
}

export function isRegistrationClosed(event: Event, now: number = Date.now()): boolean {
  return getRegistrationState(event, now) !== 'open';
}

/** Teks tombol RSVP sesuai status pendaftaran. */
export function registrationButtonLabel(state: RegistrationState): string {
  switch (state) {
    case 'closed-finished': return 'Event Telah Berakhir';
    case 'closed-deadline': return 'Pendaftaran Ditutup';
    default: return 'RSVP Sekarang →';
  }
}

/** Keterangan batas waktu untuk ditampilkan di detail event. */
export function deadlineNote(event: Event, now: number = Date.now()): string | null {
  if (!event.rsvpDeadline) return null;
  const deadline = new Date(event.rsvpDeadline);
  if (Number.isNaN(deadline.getTime())) return null;

  const teks = deadline.toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return now > deadline.getTime()
    ? `Pendaftaran ditutup pada ${teks} WIB.`
    : `Pendaftaran ditutup ${teks} WIB.`;
}
