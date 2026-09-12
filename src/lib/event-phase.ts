/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fase hidup sebuah event, dipakai untuk warna, label, dan aksi di seluruh UI.
 * - upcoming : masih jauh (> 24 jam lagi)
 * - soon     : kurang dari 24 jam lagi
 * - live     : sedang berlangsung
 * - past     : sudah selesai
 */
export type EventPhase = 'upcoming' | 'soon' | 'live' | 'past';

/**
 * Event hanya menyimpan waktu mulai, jadi durasi diasumsikan 4 jam.
 * Dipakai untuk menentukan kapan event dianggap masih berlangsung.
 */
export const EVENT_DURATION_MS = 4 * 60 * 60 * 1000;
export const SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function getEventPhase(date: string | Date | number, now: number = Date.now()): EventPhase {
  const start = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(start)) return 'upcoming';
  if (now >= start + EVENT_DURATION_MS) return 'past';
  if (now >= start) return 'live';
  if (start - now <= SOON_THRESHOLD_MS) return 'soon';
  return 'upcoming';
}

/** Label pendek untuk stiker/badge. */
export function phaseLabel(phase: EventPhase): string {
  switch (phase) {
    case 'live': return 'Berlangsung';
    case 'soon': return 'Segera';
    case 'past': return 'Selesai';
    default: return 'Akan datang';
  }
}

/**
 * Hitung mundur ke waktu mulai (atau ke waktu selesai kalau sedang berlangsung).
 * Mengembalikan komponen waktu yang sudah dibulatkan ke bawah.
 */
export function countdownParts(date: string | Date, now: number = Date.now()) {
  const start = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const phase = getEventPhase(start, now);
  const target = phase === 'live' ? start + EVENT_DURATION_MS : start;
  const diff = Math.max(target - now, 0);
  return {
    phase,
    total: diff,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

function startOfDay(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Teks ringkas: "H-3", "3 jam lagi", "Sedang berlangsung", atau "Selesai".
 * H-n dihitung dari selisih hari kalender, bukan blok 24 jam, supaya event
 * lusa tetap terbaca "H-2" walau tinggal 40 jam lagi.
 */
export function phaseSummary(date: string | Date, now: number = Date.now()): string {
  const { phase, hours, minutes } = countdownParts(date, now);
  if (phase === 'live') return 'Sedang berlangsung';
  if (phase === 'past') return 'Selesai';

  const start = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const dayDiff = Math.round((startOfDay(start) - startOfDay(now)) / 86_400_000);
  if (dayDiff >= 1) return `H-${dayDiff}`;
  if (hours > 0) return `${hours} jam lagi`;
  return `${minutes} menit lagi`;
}
