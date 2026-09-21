/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event } from '../types';
import { rentangEvent } from './event-phase';

/** Format waktu UTC untuk iCalendar: 20260918T130000Z */
export function toIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escape karakter khusus iCalendar (koma, titik koma, backslash, baris baru). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Susun berkas .ics untuk satu event. Waktu selesai memakai rentang yang sama
 * dengan penanda fase, jadi kalender dan label "Berlangsung" tidak berselisih.
 */
export function buildEventIcs(event: Event, now: Date = new Date()): string {
  const { start, end } = rentangEvent(event);
  const keterangan = `${event.description}\n\nDiselenggarakan oleh ${event.organizerName}. Kategori: ${event.category}.`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KampusHub//Event Kampus//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@kampushub`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(new Date(start))}`,
    `DTEND:${toIcsDate(new Date(end))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(keterangan)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Pengingat: ${event.title} mulai 1 jam lagi`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/** Nama berkas .ics yang aman untuk semua sistem operasi. */
export function icsFileName(event: Event): string {
  return `${event.title.replace(/[^\w]+/g, '_')}.ics`;
}

/** Unduh event sebagai berkas .ics agar bisa masuk Google/Apple Calendar. */
export function downloadEventIcs(event: Event) {
  const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = icsFileName(event);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
