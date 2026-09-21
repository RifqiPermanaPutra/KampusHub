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
 * Durasi bawaan untuk event yang tidak punya waktu selesai yang masuk akal,
 * misalnya data sebelum kolom end_date ada. Harus sama dengan
 * event_duration() di database.
 */
export const EVENT_DURATION_MS = 4 * 60 * 60 * 1000;
export const SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Bentuk minimal yang dibutuhkan penanda fase. `Event` sudah memenuhinya. */
export interface JadwalEvent {
  date: string;
  endDate?: string;
}

type Waktu = string | Date | number;

function keMilidetik(waktu: Waktu): number {
  return waktu instanceof Date ? waktu.getTime() : new Date(waktu).getTime();
}

function adalahJadwal(target: Waktu | JadwalEvent): target is JadwalEvent {
  return typeof target === 'object' && !(target instanceof Date);
}

/**
 * Waktu mulai dan selesai dalam milidetik. Menerima event, atau hanya waktu
 * mulai. Tanpa waktu selesai yang valid, dipakai durasi bawaan.
 */
export function rentangEvent(target: Waktu | JadwalEvent): { start: number; end: number } {
  const start = keMilidetik(adalahJadwal(target) ? target.date : target);
  const selesai = adalahJadwal(target) && target.endDate ? keMilidetik(target.endDate) : NaN;
  const end = !Number.isNaN(selesai) && selesai > start ? selesai : start + EVENT_DURATION_MS;
  return { start, end };
}

export function getEventPhase(target: Waktu | JadwalEvent, now: number = Date.now()): EventPhase {
  const { start, end } = rentangEvent(target);
  if (Number.isNaN(start)) return 'upcoming';
  if (now >= end) return 'past';
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
 * Hitung mundur ke waktu mulai, atau ke waktu selesai kalau sedang berlangsung.
 * Mengembalikan komponen waktu yang sudah dibulatkan ke bawah.
 */
export function countdownParts(target: Waktu | JadwalEvent, now: number = Date.now()) {
  const { start, end } = rentangEvent(target);
  const phase = getEventPhase(target, now);
  const tujuan = phase === 'live' ? end : start;
  const diff = Math.max(tujuan - now, 0);
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
export function phaseSummary(target: Waktu | JadwalEvent, now: number = Date.now()): string {
  const { phase, hours, minutes } = countdownParts(target, now);
  if (phase === 'live') return 'Sedang berlangsung';
  if (phase === 'past') return 'Selesai';

  const { start } = rentangEvent(target);
  const dayDiff = Math.round((startOfDay(start) - startOfDay(now)) / 86_400_000);
  if (dayDiff >= 1) return `H-${dayDiff}`;
  if (hours > 0) return `${hours} jam lagi`;
  return `${minutes} menit lagi`;
}
