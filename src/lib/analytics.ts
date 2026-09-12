/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, RSVP } from '../types';
import { getEventPhase } from './event-phase';

export interface EventAnalytics {
  total: number;
  registered: number;
  checkedIn: number;
  waitlist: number;
  /** Persentase check-in terhadap peserta terdaftar (0–100). */
  attendanceRate: number;
  byFakultas: { label: string; count: number }[];
  byAngkatan: { label: string; count: number }[];
  /** Jumlah pendaftaran per hari (kunci ISO yyyy-mm-dd), terurut naik. */
  timeline: { date: string; count: number }[];
}

function countBy(rsvps: RSVP[], key: 'fakultas' | 'angkatan') {
  const counts = new Map<string, number>();
  for (const r of rsvps) {
    const label = r[key] || 'Tidak diketahui';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildEventAnalytics(rsvps: RSVP[]): EventAnalytics {
  const registeredList = rsvps.filter(r => r.status !== 'waitlist');
  const checkedIn = rsvps.filter(r => r.status === 'checked-in').length;
  const waitlist = rsvps.filter(r => r.status === 'waitlist').length;

  const timelineMap = new Map<string, number>();
  for (const r of rsvps) {
    const day = r.createdAt?.slice(0, 10) || 'unknown';
    timelineMap.set(day, (timelineMap.get(day) ?? 0) + 1);
  }
  const timeline = [...timelineMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: rsvps.length,
    registered: registeredList.length,
    checkedIn,
    waitlist,
    attendanceRate: registeredList.length > 0
      ? Math.round((checkedIn / registeredList.length) * 100)
      : 0,
    byFakultas: countBy(registeredList, 'fakultas'),
    byAngkatan: countBy(registeredList, 'angkatan'),
    timeline,
  };
}

export interface CampusAnalytics {
  totalEvent: number;
  eventSelesai: number;
  eventMendatang: number;
  totalPendaftar: number;
  totalHadir: number;
  /** Rata-rata tingkat kehadiran seluruh event yang sudah selesai (0-100). */
  rataKehadiran: number;
  kategoriTerpopuler: { label: string; count: number }[];
  eventTerbesar: { label: string; count: number }[];
  byFakultas: { label: string; count: number }[];
}

/**
 * Ringkasan lintas event untuk dashboard admin: berapa banyak event berjalan,
 * berapa mahasiswa yang terlibat, dan kategori apa yang paling diminati.
 * Pure function supaya bisa diuji tanpa Firestore.
 */
export function buildCampusAnalytics(
  events: Event[],
  rsvps: RSVP[],
  now: number = Date.now()
): CampusAnalytics {
  const disetujui = events.filter(e => e.status === 'approved');
  const idDisetujui = new Set(disetujui.map(e => e.id));

  // Hanya hitung RSVP milik event yang masih ada dan sudah disetujui.
  const relevan = rsvps.filter(r => idDisetujui.has(r.eventId));
  const terdaftar = relevan.filter(r => r.status !== 'waitlist');
  const hadir = relevan.filter(r => r.status === 'checked-in');

  const selesai = disetujui.filter(e => getEventPhase(e.date, now) === 'past');
  const rasioPerEvent = selesai.map(e => {
    const pesertaEvent = terdaftar.filter(r => r.eventId === e.id);
    const hadirEvent = pesertaEvent.filter(r => r.status === 'checked-in');
    return pesertaEvent.length > 0 ? (hadirEvent.length / pesertaEvent.length) * 100 : null;
  }).filter((n): n is number => n !== null);

  const perKategori = new Map<string, number>();
  for (const e of disetujui) {
    perKategori.set(e.category, (perKategori.get(e.category) ?? 0) + 1);
  }

  const perEvent = new Map<string, number>();
  for (const r of terdaftar) {
    perEvent.set(r.eventId, (perEvent.get(r.eventId) ?? 0) + 1);
  }
  const judul = new Map(disetujui.map(e => [e.id, e.title]));

  return {
    totalEvent: disetujui.length,
    eventSelesai: selesai.length,
    eventMendatang: disetujui.length - selesai.length,
    totalPendaftar: terdaftar.length,
    totalHadir: hadir.length,
    rataKehadiran: rasioPerEvent.length > 0
      ? Math.round(rasioPerEvent.reduce((a, b) => a + b, 0) / rasioPerEvent.length)
      : 0,
    kategoriTerpopuler: [...perKategori.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    eventTerbesar: [...perEvent.entries()]
      .map(([id, count]) => ({ label: judul.get(id) ?? 'Event', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    byFakultas: countBy(terdaftar, 'fakultas').slice(0, 6),
  };
}
