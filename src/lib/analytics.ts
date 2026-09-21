/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RSVP } from '../types';
import { asalPeserta } from './peserta';

export interface EventAnalytics {
  total: number;
  registered: number;
  checkedIn: number;
  waitlist: number;
  /** Persentase check-in terhadap peserta terdaftar (0–100). */
  attendanceRate: number;
  byFakultas: { label: string; count: number }[];
  byJurusan: { label: string; count: number }[];
  byAngkatan: { label: string; count: number }[];
  /** Asal peserta: fakultas untuk mahasiswa UIR, asal instansi untuk peserta umum. */
  byAsal: { label: string; count: number }[];
  /** Peserta terdaftar yang berasal dari luar UIR. */
  pesertaUmum: number;
  /** Jumlah pendaftaran per hari (kunci ISO yyyy-mm-dd), terurut naik. */
  timeline: { date: string; count: number }[];
}

function countBy(rsvps: RSVP[], ambilLabel: (rsvp: RSVP) => string) {
  const counts = new Map<string, number>();
  for (const r of rsvps) {
    const label = ambilLabel(r) || 'Tidak diketahui';
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
    byFakultas: countBy(registeredList, r => r.fakultas ?? ''),
    byJurusan: countBy(registeredList, r => r.jurusan ?? ''),
    byAngkatan: countBy(registeredList, r => r.angkatan ?? ''),
    byAsal: countBy(registeredList, asalPeserta),
    pesertaUmum: registeredList.filter(r => r.jenisPeserta === 'umum').length,
    timeline,
  };
}

/**
 * Ringkasan lintas event untuk dashboard admin.
 *
 * Bentuknya dihasilkan langsung oleh fungsi campus_analytics() di Postgres
 * (lihat supabase/migrations/03_functions.sql). Perhitungannya sengaja tidak
 * lagi dilakukan di browser: menjumlahkan seluruh pendaftaran di sisi klien
 * berarti seluruh tabel rsvps harus diunduh dulu.
 */
export interface CampusAnalytics {
  totalEvent: number;
  eventSelesai: number;
  eventMendatang: number;
  totalPendaftar: number;
  totalHadir: number;
  /** Peserta terdaftar dari luar UIR. Kosong kalau migrasi 09 belum dijalankan. */
  pesertaUmum?: number;
  /** Rata-rata tingkat kehadiran seluruh event yang sudah selesai (0-100). */
  rataKehadiran: number;
  kategoriTerpopuler: { label: string; count: number }[];
  eventTerbesar: { label: string; count: number }[];
  byFakultas: { label: string; count: number }[];
}

