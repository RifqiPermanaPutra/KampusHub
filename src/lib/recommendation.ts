/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, RSVP } from '../types';

/**
 * Rekomendasi event content-based sederhana:
 * - Kecocokan kategori dengan riwayat RSVP user (bobot terbesar)
 * - Popularitas (jumlah peserta terdaftar)
 * - Kedekatan waktu (event yang segera berlangsung sedikit diprioritaskan)
 * Pure function agar bisa diuji tanpa Firestore.
 */
export function scoreEvent(
  event: Event,
  categoryHistory: Map<string, number>,
  now: Date = new Date()
): number {
  let score = 0;

  // Kategori yang sering diikuti user
  const categoryFreq = categoryHistory.get(event.category) ?? 0;
  score += categoryFreq * 10;

  // Popularitas
  score += Math.min(event.attendeeCount ?? 0, 50) * 0.2;

  // Semakin dekat (tapi masih di masa depan), semakin relevan
  const daysUntil = (new Date(event.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil > 0 && daysUntil <= 30) {
    score += (30 - daysUntil) * 0.1;
  }

  return score;
}

/** Bangun peta frekuensi kategori dari riwayat RSVP user. */
export function buildCategoryHistory(rsvps: RSVP[], events: Map<string, Event>): Map<string, number> {
  const history = new Map<string, number>();
  for (const r of rsvps) {
    const event = events.get(r.eventId);
    if (!event) continue;
    history.set(event.category, (history.get(event.category) ?? 0) + 1);
  }
  return history;
}

/**
 * Pilih maksimal `limit` event rekomendasi: belum diikuti user, belum lewat,
 * diurutkan berdasarkan skor. Kalau user belum punya riwayat, kembalikan
 * event mendatang terpopuler.
 */
export function recommendEvents(
  allEvents: Event[],
  userRsvps: RSVP[],
  limit = 3,
  now: Date = new Date()
): Event[] {
  const joinedIds = new Set(userRsvps.map(r => r.eventId));
  const eventMap = new Map(allEvents.map(e => [e.id, e]));
  const history = buildCategoryHistory(userRsvps, eventMap);

  return allEvents
    .filter(e => !joinedIds.has(e.id) && new Date(e.date).getTime() > now.getTime())
    .map(e => ({ event: e, score: scoreEvent(e, history, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.event);
}
