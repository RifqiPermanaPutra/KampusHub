/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetodeCheckIn } from '../types';
import { JadwalEvent, rentangEvent } from './event-phase';

/*
 * Jendela check-in, sama dengan aturan di fungsi check_in_rsvp dan
 * check_in_manual (14_tiket_dan_check_in.sql). Kalau angkanya diubah, ubah
 * juga di sana. Database yang menolak; di sini hanya untuk tampilan.
 */

/** Check-in dibuka sekian lama sebelum acara dimulai. */
export const BUKA_SEBELUM_MULAI_MS = 2 * 60 * 60 * 1000;

/** Pindai dan ketik kode ditutup sekian lama setelah acara selesai. */
export const TUTUP_SETELAH_SELESAI_MS = 60 * 60 * 1000;

export type StatusJendelaCheckIn = 'belum-buka' | 'buka' | 'pindai-ditutup';

export function jendelaCheckIn(jadwal: JadwalEvent): { buka: Date; tutupPindai: Date } {
  const { start, end } = rentangEvent(jadwal);
  return {
    buka: new Date(start - BUKA_SEBELUM_MULAI_MS),
    tutupPindai: new Date(end + TUTUP_SETELAH_SELESAI_MS),
  };
}

/**
 * belum-buka: belum bisa check-in sama sekali.
 * buka: pindai QR, ketik kode, dan check-in manual bisa dipakai.
 * pindai-ditutup: tinggal check-in manual dari daftar peserta.
 */
export function statusJendelaCheckIn(jadwal: JadwalEvent, sekarang: number = Date.now()): StatusJendelaCheckIn {
  const { buka, tutupPindai } = jendelaCheckIn(jadwal);
  if (sekarang < buka.getTime()) return 'belum-buka';
  if (sekarang > tutupPindai.getTime()) return 'pindai-ditutup';
  return 'buka';
}

export function labelMetodeCheckIn(metode?: MetodeCheckIn): string {
  switch (metode) {
    case 'qr': return 'Pindai QR';
    case 'kode': return 'Ketik kode';
    case 'manual': return 'Manual';
    default: return 'Check-in';
  }
}

/** Jam dalam WIB, misalnya "08.15". */
export function jamWib(waktu: string | Date): string {
  return new Date(waktu).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}
