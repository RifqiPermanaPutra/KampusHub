/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, RSVP, Review } from '../types';
import { getEventPhase } from './event-phase';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * Hanya peserta yang benar-benar hadir (check-in) yang boleh menilai,
 * dan hanya setelah event selesai.
 */
export function canReviewEvent(event: Event, rsvp: RSVP | null, now: number = Date.now()): boolean {
  if (!rsvp || rsvp.status !== 'checked-in') return false;
  return getEventPhase(event, now) === 'past';
}

/** Rata-rata rating dari agregat di dokumen event; null kalau belum ada ulasan. */
export function averageRating(event: Pick<Event, 'ratingSum' | 'ratingCount'>): number | null {
  const count = event.ratingCount ?? 0;
  if (count <= 0) return null;
  return (event.ratingSum ?? 0) / count;
}

/** Tampilkan rating dengan satu desimal dan koma, sesuai gaya penulisan Indonesia. */
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** Batasi nilai rating ke rentang yang sah. */
export function clampRating(value: number): number {
  if (Number.isNaN(value)) return MIN_RATING;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value)));
}

/** Sebaran jumlah ulasan per bintang, dari 5 ke 1, untuk grafik analitik. */
export function ratingDistribution(reviews: Review[]): { label: string; count: number }[] {
  const bins = new Map<number, number>([[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]]);
  for (const review of reviews) {
    const nilai = clampRating(review.rating);
    bins.set(nilai, (bins.get(nilai) ?? 0) + 1);
  }
  return [...bins.entries()].map(([bintang, count]) => ({ label: `${bintang} bintang`, count }));
}
