/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { JadwalEvent, rentangEvent } from './event-phase';

/**
 * Jadwal lengkap untuk ringkasan sebelum mendaftar atau membayar, misalnya
 * "Sabtu, 21 November 2026 · 09.00 sampai 12.00 WIB". Event yang melewati
 * tengah malam menyebut tanggal di kedua ujungnya.
 */
export function labelJadwal(event: JadwalEvent): string {
  const { start, end } = rentangEvent(event);
  const mulai = new Date(start);
  const selesai = new Date(end);
  return mulai.toDateString() === selesai.toDateString()
    ? `${format(mulai, 'EEEE, d MMMM yyyy · HH.mm', { locale: localeId })} sampai ${format(selesai, 'HH.mm')} WIB`
    : `${format(mulai, 'd MMM yyyy · HH.mm', { locale: localeId })} sampai ${format(selesai, 'd MMM yyyy · HH.mm', { locale: localeId })} WIB`;
}
